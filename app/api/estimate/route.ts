import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GREE_OPTIONS } from "../../../lib/gree-options";
import { BASE_PRICES, RANGE_MARGIN } from "../../../lib/pricing";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { ok: false, error: "Formulaire invalide." },
      { status: 400 }
    );
  }

  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const optionId = String(form.get("optionId") ?? "").trim();
  const installationType = String(form.get("installationType") ?? "").trim();
  const quantity = Math.max(1, Number(form.get("quantity") ?? "1") || 1);
  const lang = form.get("lang") === "en" ? "en" : "fr";

  const outdoorPhoto = form.get("outdoorPhoto");
  const indoorPhoto = form.get("indoorPhoto");

  const err = (fr: string, en: string, status = 400) =>
    Response.json({ ok: false, error: lang === "fr" ? fr : en }, { status });

  if (!name || !phone) {
    return err(
      "Le nom et le téléphone sont requis.",
      "Name and phone number are required."
    );
  }

  const option = GREE_OPTIONS.find((item) => item.id === optionId);
  if (!option) {
    return err("Système introuvable.", "System not found.", 404);
  }

  if (!(outdoorPhoto instanceof File) || outdoorPhoto.size === 0) {
    return err(
      "La photo de la plaque signalétique extérieure est obligatoire.",
      "The outdoor nameplate photo is required."
    );
  }

  const photos: { field: "outdoor" | "indoor"; file: File }[] = [
    { field: "outdoor", file: outdoorPhoto },
  ];
  if (indoorPhoto instanceof File && indoorPhoto.size > 0) {
    photos.push({ field: "indoor", file: indoorPhoto });
  }

  for (const { file } of photos) {
    if (file.size > MAX_PHOTO_BYTES) {
      return err(
        "Chaque photo doit faire moins de 10 Mo.",
        "Each photo must be under 10 MB."
      );
    }
    if (!file.type.startsWith("image/")) {
      return err(
        "Seules les images sont acceptées.",
        "Only image files are accepted."
      );
    }
  }

  const { env } = getCloudflareContext();
  if (!env.UPLOADS) {
    return err(
      "Le stockage des photos n'est pas configuré.",
      "Photo storage is not configured.",
      500
    );
  }

  const submittedAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const prefix = `submissions/${submittedAt.slice(0, 10)}/${id}`;

  const storedPhotos: Record<string, string> = {};
  for (const { field, file } of photos) {
    const key = `${prefix}/${field}-${sanitizeFileName(file.name)}`;
    await env.UPLOADS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    storedPhotos[field] = key;
  }

  const basePrice = BASE_PRICES[option.id];
  const estimate =
    basePrice !== undefined
      ? {
          min: Math.max(0, basePrice * quantity - RANGE_MARGIN),
          max: basePrice * quantity + RANGE_MARGIN,
        }
      : null;

  const record = {
    id,
    submittedAt,
    lang,
    contact: { name, phone, email: email || null },
    selection: {
      optionId: option.id,
      line: option.line,
      equipmentType: option.equipmentType,
      sizeLabel: option.sizeLabel,
      ahri: option.ahri,
      outdoorUnit: option.outdoorUnit,
      indoorUnit: option.indoorUnit,
      installationType,
      quantity,
    },
    estimate,
    photos: storedPhotos,
  };

  await env.UPLOADS.put(`${prefix}/record.json`, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });

  return Response.json({ ok: true, id, estimate });
}
