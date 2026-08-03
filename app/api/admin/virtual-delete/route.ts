import { getCloudflareContext } from "@opennextjs/cloudflare";
import { bookingsKey } from "../../../../lib/virtual";

// Supprime une demande virtuelle (photos incluses) et libère son créneau.
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  const id = searchParams.get("id") ?? "";
  const date = searchParams.get("date") ?? "";

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
  if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const prefix = `virtual/${date}/${id}/`;

  // Libérer le créneau réservé avant d'effacer le dossier.
  const recordObj = await env.UPLOADS.get(`${prefix}record.json`);
  if (recordObj) {
    try {
      const record = JSON.parse(await recordObj.text()) as {
        slot?: { date?: string; time?: string };
      };
      if (record.slot?.date && record.slot?.time) {
        const bKey = bookingsKey(record.slot.date);
        const bObj = await env.UPLOADS.get(bKey);
        if (bObj) {
          const bookings = JSON.parse(await bObj.text()) as Record<
            string,
            { id?: string }
          >;
          if (bookings[record.slot.time]?.id === id) {
            delete bookings[record.slot.time];
            await env.UPLOADS.put(bKey, JSON.stringify(bookings), {
              httpMetadata: { contentType: "application/json" },
            });
          }
        }
      }
    } catch {
      // dossier illisible — on supprime quand même
    }
  }

  let deleted = 0;
  let cursor: string | undefined = undefined;
  do {
    const page = await env.UPLOADS.list({ prefix, limit: 1000, cursor });
    for (const obj of page.objects) {
      await env.UPLOADS.delete(obj.key);
      deleted++;
    }
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return Response.json({ ok: true, deleted });
}
