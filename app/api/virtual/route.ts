import { getCloudflareContext } from "@opennextjs/cloudflare";
import { bookingsKey, isBookableSlot } from "../../../lib/virtual";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_EXTRA_PHOTOS = 5;

const EMAIL_FROM = "Groupe DPSD <estimation@dpsdair.ca>";
const OWNER_EMAIL = "renovationsdp@gmail.com";
const PHONE_DISPLAY = "(514) 969-8786";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80) || "photo";
}

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

function slotLabel(date: string, time: string, lang: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  return lang === "fr" ? `${day} à ${time.replace(":", " h ")}` : `${day} at ${time}`;
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
  const unitType = String(form.get("unitType") ?? "").trim();
  const slotDate = String(form.get("slotDate") ?? "").trim();
  const slotTime = String(form.get("slotTime") ?? "").trim();
  const lang = form.get("lang") === "en" ? "en" : "fr";

  const err = (fr: string, en: string, status = 400) =>
    Response.json({ ok: false, error: lang === "fr" ? fr : en }, { status });

  if (honeypot) {
    return Response.json({ ok: true, id: "ok" });
  }

  if (!name || !phone || !email || !postal) {
    return err(
      "Le nom, le téléphone, le courriel et le code postal sont requis.",
      "Name, phone number, email and postal code are required."
    );
  }
  if (unitType !== "murale" && unitType !== "centrale") {
    return err("Choisissez votre type de système.", "Pick your system type.");
  }
  if (!isBookableSlot(slotDate, slotTime)) {
    return err(
      "Ce créneau n'est pas disponible — choisissez-en un autre.",
      "That time slot is not available — please pick another."
    );
  }

  // Les cinq photos du relevé virtuel sont toutes requises; les photos
  // supplémentaires sont libres.
  const PHOTO_FIELDS = [
    "intNameplate",
    "intSpace",
    "extNameplate",
    "extSpace",
    "panel",
  ] as const;

  const photos: { field: string; file: File }[] = [];
  for (const field of PHOTO_FIELDS) {
    const value = form.get(field);
    if (value instanceof File && value.size > 0) {
      photos.push({ field, file: value });
    }
  }
  if (photos.length < PHOTO_FIELDS.length) {
    return err(
      "Les cinq photos demandées sont requises pour l'estimation virtuelle.",
      "All five requested photos are required for the virtual estimate."
    );
  }
  for (let i = 0; i < MAX_EXTRA_PHOTOS; i++) {
    const value = form.get(`extra${i}`);
    if (value instanceof File && value.size > 0) {
      photos.push({ field: `extra${i}`, file: value });
    }
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
      "Le stockage n'est pas configuré.",
      "Storage is not configured.",
      500
    );
  }

  // Réservation du créneau — premier arrivé, premier servi.
  const bKey = bookingsKey(slotDate);
  let bookings: Record<string, { id: string; name: string }> = {};
  const existing = await env.UPLOADS.get(bKey);
  if (existing) {
    try {
      bookings = JSON.parse(await existing.text());
    } catch {
      bookings = {};
    }
  }
  if (bookings[slotTime]) {
    return err(
      "Ce créneau vient d'être réservé — choisissez-en un autre.",
      "That time slot was just booked — please pick another.",
      409
    );
  }

  const submittedAt = new Date().toISOString();
  const id = crypto.randomUUID();
  const prefix = `virtual/${submittedAt.slice(0, 10)}/${id}`;

  bookings[slotTime] = { id, name };
  await env.UPLOADS.put(bKey, JSON.stringify(bookings), {
    httpMetadata: { contentType: "application/json" },
  });

  const storedPhotos: Record<string, string> = {};
  for (const { field, file } of photos) {
    const key = `${prefix}/${field}-${sanitizeFileName(file.name)}`;
    await env.UPLOADS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    storedPhotos[field] = key;
  }

  const typeLabel =
    unitType === "murale"
      ? lang === "fr"
        ? "Thermopompe murale"
        : "Wall-mounted heat pump"
      : lang === "fr"
        ? "Thermopompe centrale (conduits d'air)"
        : "Central heat pump (ductwork)";
  const slotText = slotLabel(slotDate, slotTime, lang);

  let emailSent = false;
  if (env.RESEND_API_KEY) {
    const fr = lang === "fr";
    const clientSubject = fr
      ? "Votre rencontre d'estimation virtuelle — Groupe DPSD"
      : "Your virtual estimate meeting — Groupe DPSD";
    const clientHtml = fr
      ? `<p>Bonjour ${name},</p>
<p>Merci — nous avons bien reçu vos photos et votre demande d'estimation virtuelle.</p>
<p><strong>Votre rencontre : ${slotText}</strong><br>
Nous vous confirmerons le rendez-vous et vous enverrons le lien de la rencontre (vidéo ou téléphone, à votre choix) avant l'heure prévue.</p>
<p>Comment ça se passe :</p>
<ol>
<li><strong>Rencontre virtuelle</strong> — on passe vos photos en revue ensemble et on vous présente vos options avec leurs fourchettes de prix et la subvention LogisVert de chacune.</li>
<li><strong>Visite d'évaluation</strong> — si une option vous plaît, on planifie une courte visite sur place, sans frais, pour confirmer le prix final.</li>
<li><strong>Installation</strong> — par notre propre équipe, avec garantie Gree 10+2 ans enregistrée pour vous et votre dossier LogisVert complet remis après les travaux.</li>
</ol>
<p>Besoin de déplacer la rencontre? Répondez à ce courriel ou appelez-nous au ${PHONE_DISPLAY}.</p>
<p>— Groupe DPSD Inc<br>RBQ : 5733-3916-01 · Membre de la CMMTQ<br>https://dpsdair.ca</p>`
      : `<p>Hello ${name},</p>
<p>Thank you — we've received your photos and your virtual estimate request.</p>
<p><strong>Your meeting: ${slotText}</strong><br>
We'll confirm the appointment and send you the meeting link (video or phone, your choice) before the scheduled time.</p>
<p>How it works:</p>
<ol>
<li><strong>Virtual meeting</strong> — we review your photos together and walk you through your options with their price ranges and each one's LogisVert rebate.</li>
<li><strong>Evaluation visit</strong> — if you like an option, we schedule a short free on-site visit to confirm the final price.</li>
<li><strong>Installation</strong> — by our own team, with the Gree 10+2 year warranty registered for you and your complete LogisVert package delivered after the work.</li>
</ol>
<p>Need to move the meeting? Reply to this email or call us at ${PHONE_DISPLAY}.</p>
<p>— Groupe DPSD Inc<br>RBQ: 5733-3916-01 · CMMTQ member<br>https://dpsdair.ca</p>`;
    emailSent = await sendEmail(env.RESEND_API_KEY, email, clientSubject, clientHtml);

    // Avis au propriétaire — en anglais, comme les autres notifications.
    await sendEmail(
      env.RESEND_API_KEY,
      OWNER_EMAIL,
      `Virtual estimate booked — ${name} — ${slotDate} ${slotTime}`,
      `<p><strong>${name}</strong> — <a href="tel:${phone}">${phone}</a> · ${email}</p>
<p>${[address, city, postal].filter(Boolean).join(", ")}</p>
<p>System: ${unitType === "murale" ? "wall-mounted" : "central"} — client language: ${lang.toUpperCase()}</p>
<p><strong>Meeting slot: ${slotLabel(slotDate, slotTime, "en")}</strong> — remember to send the client a meeting link.</p>
${notes ? `<p>Client notes: ${notes}</p>` : ""}
<p>${photos.length} photo(s) received — review at https://app.dpsdair.ca/admin/virtuel</p>`
    );
  }

  const record = {
    kind: "virtual",
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
    unitType,
    slot: { date: slotDate, time: slotTime },
    emailSent,
    photos: storedPhotos,
  };

  await env.UPLOADS.put(`${prefix}/record.json`, JSON.stringify(record, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });

  return Response.json({
    ok: true,
    id,
    date: submittedAt.slice(0, 10),
    slot: { date: slotDate, time: slotTime },
    emailSent,
  });
}
