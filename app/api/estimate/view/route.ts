import { getCloudflareContext } from "@opennextjs/cloudflare";

// Renvoie le dossier d'une demande pour la feuille d'estimation imprimable.
// L'UUID (impossible à deviner) sert de jeton d'accès, comme les liens de
// soumission de l'application de vente.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const date = searchParams.get("date") ?? "";

  if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  if (!env.UPLOADS) {
    return Response.json({ ok: false }, { status: 500 });
  }

  const obj = await env.UPLOADS.get(`submissions/${date}/${id}/record.json`);
  if (!obj) {
    return Response.json({ ok: false }, { status: 404 });
  }

  try {
    const record = JSON.parse(await obj.text()) as Record<string, unknown>;
    const contact = (record.contact ?? {}) as Record<string, unknown>;
    // Le document est destiné au client : on renvoie ce que la feuille
    // affiche, rien de plus (pas de téléphone/courriel dans la réponse).
    return Response.json({
      ok: true,
      record: {
        id: record.id,
        submittedAt: record.submittedAt,
        lang: record.lang,
        clientName: contact.name ?? "",
        clientAddress: [contact.address, contact.city, contact.postal]
          .filter(Boolean)
          .join(", "),
        selection: record.selection,
        options: record.options,
      },
    });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
