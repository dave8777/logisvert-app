import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  detectCapacity,
  describeReading,
  suggestSelection,
  suggestCurrentSystem,
} from "../../../lib/nameplate";

const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Modèle vision de Workers AI utilisé pour transcrire la plaque.
const VISION_MODEL = "@cf/meta/llama-3.2-11b-vision-instruct";

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const lang = form.get("lang") === "en" ? "en" : "fr";
  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0 || photo.size > MAX_PHOTO_BYTES) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  if (!env.AI) {
    // Pas de liaison Workers AI (ex. environnement local) — on saute l'OCR
    // sans bloquer le client, comme l'app de vente quand Vision n'est pas
    // configurée.
    return Response.json({ ok: true, reading: null });
  }

  let text = "";
  try {
    const bytes = new Uint8Array(await photo.arrayBuffer());
    const result = (await env.AI.run(VISION_MODEL, {
      prompt:
        "Transcribe ALL text visible on this equipment nameplate or label. " +
        "Output only the raw transcribed text, nothing else.",
      image: Array.from(bytes),
      max_tokens: 512,
    })) as { response?: string };
    text = result?.response ?? "";
  } catch {
    return Response.json({ ok: true, reading: null });
  }

  const reading = detectCapacity(text);
  const hasSomething =
    reading.sizeBtu !== null || reading.brand !== "" || reading.modelGuess !== "";
  if (!hasSomething) {
    return Response.json({ ok: true, reading: null });
  }

  return Response.json({
    ok: true,
    reading,
    description: describeReading(reading, lang),
    suggestion: suggestSelection(reading),
    // Pour le calculateur d'économies : ce que la plaque dit du chauffage
    // actuel du client (null quand elle ne le dit pas).
    currentSystem: suggestCurrentSystem(reading),
  });
}
