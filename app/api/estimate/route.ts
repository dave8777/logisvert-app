import { getCloudflareContext } from "@opennextjs/cloudflare";
import { GREE_OPTIONS } from "../../../lib/gree-options";
import { estimateFor, subsidyFor } from "../../../lib/pricing";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Zone de service DPSD — préfixes postaux (FSA), portés de l'application de
// vente (noyau Vaudreuil-Soulanges + West Island).
const SERVICE_FSA = new Set(
  (
    "J7V J6S J7T J0P J5W H9X H9H H9J H9K H9P H9R H9S " +
    "H9W H9E H9G H9A H9B H9C H8Y H8Z"
  ).split(" ")
);

function inServiceArea(postal: string): boolean | null {
  const fsa = postal.replace(/\s/g, "").toUpperCase().slice(0, 3);
  if (fsa.length < 3) return null;
  return SERVICE_FSA.has(fsa);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo";
}

const EMAIL_FROM = "Groupe DPSD <estimation@dpsdair.ca>";
const OWNER_EMAIL = "renovationsdp@gmail.com";
const PHONE_DISPLAY = "(514) 969-8786";

async function sendEmail(
  apiKey: string,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function money(amount: number, lang: string): string {
  return new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function clientEmailHtml(
  lang: string,
  name: string,
  selectionLabel: string,
  estimate: { min: number; max: number } | null,
  subsidy: number | null
): { subject: string; html: string } {
  const fr = lang === "fr";
  const range = estimate
    ? `${money(estimate.min, lang)} – ${money(estimate.max, lang)}`
    : fr
      ? "à confirmer lors de notre appel"
      : "to be confirmed when we call you";
  const subsidyLine = subsidy
    ? fr
      ? `<p>Subvention LogisVert admissible : <strong>${money(subsidy, lang)}</strong> — nous nous occupons de tous les documents pour vous.</p>`
      : `<p>Eligible LogisVert rebate: <strong>${money(subsidy, lang)}</strong> — we handle all the paperwork for you.</p>`
    : "";
  const subject = fr
    ? "Votre estimation — Groupe DPSD"
    : "Your estimate — Groupe DPSD";
  const html = fr
    ? `<p>Bonjour ${name},</p>
<p>Merci pour votre demande d'estimation. Voici votre fourchette approximative pour :</p>
<p><strong>${selectionLabel}</strong></p>
<p style="font-size:1.4em"><strong>${range}</strong></p>
<p>Installation complète, taxes incluses. Estimation à titre indicatif seulement — le prix final est confirmé lors d'une visite sur place. Nous vous contactons rapidement pour la planifier.</p>
${subsidyLine}
<p>Des questions? Appelez-nous au ${PHONE_DISPLAY}.</p>
<p>— Groupe DPSD Inc<br>RBQ : 5733-3916-01 · Membre de la CMMTQ<br>https://dpsdair.ca</p>`
    : `<p>Hello ${name},</p>
<p>Thank you for your estimate request. Here is your ballpark range for:</p>
<p><strong>${selectionLabel}</strong></p>
<p style="font-size:1.4em"><strong>${range}</strong></p>
<p>Complete installation, taxes included. Ballpark estimate for guidance only — the final price is confirmed with an on-site visit. We'll contact you shortly to schedule it.</p>
${subsidyLine}
<p>Questions? Call us at ${PHONE_DISPLAY}.</p>
<p>— Groupe DPSD Inc<br>RBQ: 5733-3916-01 · CMMTQ member<br>https://dpsdair.ca</p>`;
  return { subject, html };
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
  const address = String(form.get("address") ?? "").trim().slice(0, 200);
  const city = String(form.get("city") ?? "").trim().slice(0, 100);
  const postal = String(form.get("postal") ?? "").trim().slice(0, 12);
  const notes = String(form.get("notes") ?? "").trim().slice(0, 500);
  const honeypot = String(form.get("website") ?? "").trim();
  const optionId = String(form.get("optionId") ?? "").trim();
  const installationType = String(form.get("installationType") ?? "").trim();
  const quantity = Math.max(1, Number(form.get("quantity") ?? "1") || 1);
  const lang = form.get("lang") === "en" ? "en" : "fr";

  // Les cinq photos du relevé de site (portées de l'app de vente) —
  // seule la plaque signalétique extérieure est obligatoire.
  const PHOTO_FIELDS = [
    "exteriorNameplate",
    "exteriorUnit",
    "interiorNameplate",
    "interiorUnit",
    "panel",
  ] as const;

  const err = (fr: string, en: string, status = 400) =>
    Response.json({ ok: false, error: lang === "fr" ? fr : en }, { status });

  // Champ piège rempli = robot : on répond « succès » sans rien enregistrer.
  if (honeypot) {
    return Response.json({ ok: true, id: "ok", estimate: null, subsidy: null });
  }

  if (!name || !phone || !postal) {
    return err(
      "Le nom, le téléphone et le code postal sont requis.",
      "Name, phone number and postal code are required."
    );
  }

  const option = GREE_OPTIONS.find((item) => item.id === optionId);
  if (!option) {
    return err("Système introuvable.", "System not found.", 404);
  }

  const photos: { field: string; file: File }[] = [];
  for (const field of PHOTO_FIELDS) {
    const value = form.get(field);
    if (value instanceof File && value.size > 0) {
      photos.push({ field, file: value });
    }
  }

  if (!photos.some((p) => p.field === "exteriorNameplate")) {
    return err(
      "La photo de la plaque signalétique extérieure est obligatoire.",
      "The outdoor nameplate photo is required."
    );
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

  const estimate = estimateFor(option, quantity);
  const subsidy = subsidyFor(option, quantity);
  const inArea = inServiceArea(postal);

  const record = {
    id,
    submittedAt,
    lang,
    contact: {
      name,
      phone,
      email: email || null,
      address: address || null,
      city: city || null,
      postal,
    },
    notes: notes || null,
    inArea,
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
    subsidy,
    photos: storedPhotos,
  };

  // Courriels (via Resend) : copie de l'estimation au client s'il a donné
  // son courriel, et avis de nouvelle demande au propriétaire. Un échec
  // d'envoi ne bloque jamais la demande.
  let emailSent = false;
  const selectionLabel =
    `Gree ${option.line} ${option.equipmentType} ${option.sizeLabel}` +
    (quantity > 1 ? ` × ${quantity}` : "");
  if (env.RESEND_API_KEY) {
    if (email) {
      const msg = clientEmailHtml(lang, name, selectionLabel, estimate, subsidy);
      emailSent = await sendEmail(env.RESEND_API_KEY, email, msg.subject, msg.html);
    }
    const rangeTxt = estimate
      ? `${money(estimate.min, "fr")} – ${money(estimate.max, "fr")}`
      : "à confirmer";
    await sendEmail(
      env.RESEND_API_KEY,
      OWNER_EMAIL,
      `Nouvelle demande d'estimation — ${name}${city ? ` (${city})` : ""}`,
      `<p><strong>${name}</strong> — <a href="tel:${phone}">${phone}</a>${email ? ` · ${email}` : ""}</p>
<p>${[address, city, postal].filter(Boolean).join(", ")}${inArea === false ? " — <strong>HORS ZONE</strong>" : ""}</p>
<p>Système : ${selectionLabel} — AHRI ${option.ahri}</p>
<p>Estimation transmise : ${rangeTxt}${subsidy ? ` · LogisVert ${money(subsidy, "fr")}` : ""}</p>
${notes ? `<p>Notes : ${notes}</p>` : ""}
<p>${photos.length} photo(s) reçue(s) — voir https://app.dpsdair.ca/admin</p>`
    );
  }

  const finalRecord = { ...record, emailSent };
  await env.UPLOADS.put(
    `${prefix}/record.json`,
    JSON.stringify(finalRecord, null, 2),
    {
      httpMetadata: { contentType: "application/json" },
    }
  );

  return Response.json({ ok: true, id, estimate, subsidy, inArea, emailSent });
}
