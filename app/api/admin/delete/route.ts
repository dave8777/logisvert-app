import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  const id = searchParams.get("id") ?? "";
  const date = searchParams.get("date") ?? "";

  const { env } = getCloudflareContext();

  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return Response.json({ ok: false, error: "Accès refusé." }, { status: 403 });
  }
  if (!env.UPLOADS) {
    return Response.json(
      { ok: false, error: "Stockage non configuré." },
      { status: 500 }
    );
  }
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json(
      { ok: false, error: "Identifiant invalide." },
      { status: 400 }
    );
  }

  // Efface tout le dossier de la demande : photos + record.json.
  const prefix = `submissions/${date}/${id}/`;
  let deleted = 0;
  let cursor: string | undefined = undefined;
  do {
    const page = await env.UPLOADS.list({ prefix, limit: 100, cursor });
    for (const obj of page.objects) {
      await env.UPLOADS.delete(obj.key);
      deleted += 1;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  if (deleted === 0) {
    return Response.json(
      { ok: false, error: "Demande introuvable." },
      { status: 404 }
    );
  }

  return Response.json({ ok: true, deleted });
}
