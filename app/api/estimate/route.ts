import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  buildQuote,
  type QuoteOption,
  type SystemType,
} from "../../../lib/pricing";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Zone de service DPSD, confirmée par le propriétaire (2026-08-02) :
// West Island; Saint-Lazare et Les Cèdres (J7T); Hudson et Rigaud (J0P);
// Vaudreuil-Dorion, Pincourt, L'Île-Perrot, Notre-Dame-de-l'Île-Perrot et
// Terrasse-Vaudreuil (J7V); Lachine et LaSalle (H8N H8R H8S H8T).
// J0P est un grand FSA rural qui déborde sur des villages voisins —
// volontairement inclusif : mieux vaut accepter un village limitrophe que
// refuser Hudson. D'autres secteurs au besoin.
const SERVICE_FSA = new Set(
  (
    "H8N H8R H8S H8T H8Y H8Z " +
    "H9A H9B H9C H9E H9G H9H H9J H9K H9P H9R H9S H9W H9X " +
    "J7T J7V J0P"
  ).split(" ")
);

function inServiceArea(postal: string): boolean | null {
  const fsa = postal.replace(/\s/g, "").toUpperCase().slice(0, 3);
  if (fsa.length < 3 || SERVICE_FSA.size === 0) return null;
  return SERVICE_FSA.has(fsa);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo";
}

const EMAIL_FROM = "Groupe DPSD <estimation@dpsdair.ca>";
const OWNER_EMAIL = "renovationsdp@gmail.com";
const PHONE_DISPLAY = "(514) 969-8786";

// Noms affichés des options, alignés sur l'application de vente.
const OPTION_NAMES: Record<string, { fr: string; en: string; tagFr: string; tagEn: string }> = {
  charmo: {
    fr: "Gree Charmo",
    en: "Gree Charmo",
    tagFr: "Chauffage jusqu'à −25 °C",
    tagEn: "Heating down to −25 °C",
  },
  clivia: {
    fr: "Gree Clivia",
    en: "Gree Clivia",
    tagFr: "Chauffage jusqu'à −30 °C",
    tagEn: "Heating down to −30 °C",
  },
  airy: {
    fr: "Gree Airy",
    en: "Gree Airy",
    tagFr: "Chauffage jusqu'à −30 °C — haute efficacité",
    tagEn: "Heating down to −30 °C — high efficiency",
  },
  handler: {
    fr: "Système complet — ventilo-convecteur neuf",
    en: "Complete system — new air handler",
    tagFr: "Avec chauffage d'appoint électrique intégré",
    tagEn: "With built-in electric backup heat",
  },
  coil: {
    fr: "Sur fournaise existante — serpentin",
    en: "On your existing furnace — cased coil",
    tagFr: "Votre fournaise reste en appoint",
    tagEn: "Your furnace stays as backup",
  },
};

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

function optionRowsHtml(options: QuoteOption[], lang: string): string {
  const fr = lang === "fr";
  return options
    .filter((o) => o.available && o.estimate)
    .map((o) => {
      const names = OPTION_NAMES[o.key];
      const e = o.estimate!;
      const sub = e.subsidy
        ? fr
          ? ` — subvention LogisVert admissible : <strong>${money(e.subsidy, lang)}</strong>`
          : ` — eligible LogisVert rebate: <strong>${money(e.subsidy, lang)}</strong>`
        : "";
      return `<p><strong>${fr ? names.fr : names.en}</strong> (${fr ? names.tagFr : names.tagEn})<br>${money(e.min, lang)} – ${money(e.max, lang)}${sub}</p>`;
    })
    .join("\n");
}

function clientEmailHtml(
  lang: string,
  name: string,
  selectionLabel: string,
  options: QuoteOption[]
): { subject: string; html: string } {
  const fr = lang === "fr";
  const subject = fr
    ? "Vos estimations — Groupe DPSD"
    : "Your estimates — Groupe DPSD";
  const rows = optionRowsHtml(options, lang);
  const html = fr
    ? `<p>Bonjour ${name},</p>
<p>Merci pour votre demande. Voici vos fourchettes approximatives pour : <strong>${selectionLabel}</strong> — installation complète, taxes incluses.</p>
${rows}
<p>Estimations à titre indicatif seulement — le prix final est confirmé lors d'une visite sur place. Nous vous contactons rapidement pour la planifier, et nous nous occupons de tous les documents LogisVert pour vous.</p>
<p>Des questions? Appelez-nous au ${PHONE_DISPLAY}.</p>
<p>— Groupe DPSD Inc<br>RBQ : 5733-3916-01 · Membre de la CMMTQ<br>https://dpsdair.ca</p>`
    : `<p>Hello ${name},</p>
<p>Thank you for your request. Here are your ballpark ranges for: <strong>${selectionLabel}</strong> — complete installation, taxes included.</p>
${rows}
<p>Ballpark estimates for guidance only — the final price is confirmed with an on-site visit. We'll contact you shortly to schedule it, and we handle all the LogisVert paperwork for you.</p>
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
  const detectedUnit = String(form.get("detectedUnit") ?? "").trim().slice(0, 200);
  const replaceConfirmed = String(form.get("replaceConfirmed") ?? "").trim();
  const systemType = String(form.get("systemType") ?? "") as SystemType;
  const sizeKey = String(form.get("sizeKey") ?? "").trim();
  const installationType = String(form.get("installationType") ?? "").trim();
  const quantity = Math.max(1, Number(form.get("quantity") ?? "1") || 1);
  const lang = form.get("lang") === "en" ? "en" : "fr";

  const err = (fr: string, en: string, status = 400) =>
    Response.json({ ok: false, error: lang === "fr" ? fr : en }, { status });

  // Champ piège rempli = robot : on répond « succès » sans rien enregistrer.
  if (honeypot) {
    return Response.json({ ok: true, id: "ok", options: [] });
  }

  if (!name || !phone || !email || !postal) {
    return err(
      "Le nom, le téléphone, le courriel et le code postal sont requis.",
      "Name, phone number, email and postal code are required."
    );
  }

  if (systemType !== "murale" && systemType !== "centrale") {
    return err("Type de système invalide.", "Invalid system type.");
  }

  const options = buildQuote(systemType, sizeKey, quantity);
  if (!options) {
    return err("Capacité invalide.", "Invalid capacity.");
  }

  // Les cinq photos du relevé de site (portées de l'app de vente) —
  // seule la plaque signalétique extérieure est obligatoire.
  const PHOTO_FIELDS = [
    "exteriorNameplate",
    "exteriorUnit",
    "interiorNameplate",
    "interiorUnit",
    "panel",
  ] as const;

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

  const inArea = inServiceArea(postal);

  const sizeLabelFr =
    systemType === "murale"
      ? `${sizeKey.replace("k", " 000")} BTU`
      : `${sizeKey} tonnes`;
  const selectionLabel =
    (systemType === "murale"
      ? lang === "fr"
        ? `Thermopompe murale ${sizeLabelFr}`
        : `Wall-mounted heat pump ${sizeKey.replace("k", ",000")} BTU`
      : lang === "fr"
        ? `Thermopompe centrale ${sizeKey} tonnes`
        : `Central heat pump ${sizeKey} tons`) +
    (quantity > 1 ? ` × ${quantity}` : "");

  // Options nommées pour le dossier et le bureau.
  const namedOptions = options.map((o) => ({
    ...o,
    name: OPTION_NAMES[o.key]?.fr ?? o.key,
  }));

  // Courriels (via Resend) : estimations au client, avis au propriétaire.
  // Un échec d'envoi ne bloque jamais la demande.
  let emailSent = false;
  if (env.RESEND_API_KEY) {
    const msg = clientEmailHtml(lang, name, selectionLabel, options);
    emailSent = await sendEmail(env.RESEND_API_KEY, email, msg.subject, msg.html);
    const officeRows = namedOptions
      .filter((o) => o.available && o.estimate)
      .map(
        (o) =>
          `${o.name} : ${money(o.estimate!.min, "fr")} – ${money(o.estimate!.max, "fr")}` +
          (o.estimate!.subsidy ? ` (LogisVert ${money(o.estimate!.subsidy, "fr")})` : "")
      )
      .join("<br>");
    await sendEmail(
      env.RESEND_API_KEY,
      OWNER_EMAIL,
      `Nouvelle demande d'estimation — ${name}${city ? ` (${city})` : ""}`,
      `<p><strong>${name}</strong> — <a href="tel:${phone}">${phone}</a> · ${email}</p>
<p>${[address, city, postal].filter(Boolean).join(", ")}${inArea === false ? " — <strong>HORS ZONE</strong>" : ""}</p>
<p>Demande : ${selectionLabel} (${installationType || "type non précisé"})</p>
${detectedUnit ? `<p>Unité existante détectée (OCR) : ${detectedUnit}${replaceConfirmed === "yes" ? " — remplacement confirmé par le client" : replaceConfirmed === "no" ? " — le client ne remplace PAS cette unité" : ""}</p>` : ""}
<p>${officeRows}</p>
${notes ? `<p>Notes : ${notes}</p>` : ""}
<p>${photos.length} photo(s) reçue(s) — voir https://app.dpsdair.ca/admin</p>`
    );
  }

  const record = {
    id,
    submittedAt,
    lang,
    contact: {
      name,
      phone,
      email,
      address: address || null,
      city: city || null,
      postal,
    },
    notes: notes || null,
    inArea,
    detected: detectedUnit
      ? { description: detectedUnit, replaceConfirmed: replaceConfirmed || null }
      : null,
    selection: {
      systemType,
      sizeKey,
      label: selectionLabel,
      installationType,
      quantity,
    },
    options: namedOptions,
    emailSent,
    photos: storedPhotos,
  };

  await env.UPLOADS.put(
    `${prefix}/record.json`,
    JSON.stringify(record, null, 2),
    {
      httpMetadata: { contentType: "application/json" },
    }
  );

  return Response.json({ ok: true, id, options, inArea, emailSent });
}
