import { getCloudflareContext } from "@opennextjs/cloudflare";

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

  // Collect record.json keys (paginate through the bucket listing).
  const recordKeys: string[] = [];
  let cursor: string | undefined = undefined;
  do {
    const page = await env.UPLOADS.list({
      prefix: "submissions/",
      limit: 1000,
      cursor,
    });
    for (const obj of page.objects) {
      if (obj.key.endsWith("/record.json")) recordKeys.push(obj.key);
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  // Newest first (keys start with submissions/YYYY-MM-DD/), cap at 200.
  recordKeys.sort().reverse();
  const limited = recordKeys.slice(0, 200);

  const records: unknown[] = [];
  for (const keyName of limited) {
    const obj = await env.UPLOADS.get(keyName);
    if (!obj) continue;
    try {
      records.push(JSON.parse(await obj.text()));
    } catch {
      // ignore malformed records
    }
  }

  return Response.json({ ok: true, count: records.length, records });
}
