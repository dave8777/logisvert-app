import { getCloudflareContext } from "@opennextjs/cloudflare";

// Liste des demandes d'estimation virtuelle (préfixe virtual/), même
// protection et même forme que /api/admin/list.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";

  const { env } = getCloudflareContext();

  if (!env.ADMIN_KEY) {
    return Response.json(
      { ok: false, error: "ADMIN_KEY non configurée sur le worker." },
      { status: 500 }
    );
  }
  if (key !== env.ADMIN_KEY) {
    return Response.json({ ok: false, error: "Accès refusé." }, { status: 403 });
  }
  if (!env.UPLOADS) {
    return Response.json(
      { ok: false, error: "Stockage non configuré." },
      { status: 500 }
    );
  }

  const recordKeys: string[] = [];
  let cursor: string | undefined = undefined;
  do {
    const page = await env.UPLOADS.list({
      prefix: "virtual/",
      limit: 1000,
      cursor,
    });
    for (const obj of page.objects) {
      if (obj.key.endsWith("/record.json")) recordKeys.push(obj.key);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  recordKeys.sort().reverse();
  const limited = recordKeys.slice(0, 200);

  const records: { slot?: { date?: string; time?: string } }[] = [];
  for (const keyName of limited) {
    const obj = await env.UPLOADS.get(keyName);
    if (!obj) continue;
    try {
      records.push(JSON.parse(await obj.text()));
    } catch {
      // ignore malformed records
    }
  }
  // Tri par créneau à venir d'abord (le prochain rendez-vous en tête).
  records.sort((a, b) =>
    `${a.slot?.date ?? ""} ${a.slot?.time ?? ""}`.localeCompare(
      `${b.slot?.date ?? ""} ${b.slot?.time ?? ""}`
    )
  );

  return Response.json({ ok: true, count: records.length, records });
}
