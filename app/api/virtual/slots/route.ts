import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  bookableDays,
  bookingsKey,
  isWeekday,
  montrealNow,
  slotTimes,
} from "../../../../lib/virtual";
import { salesBusySlots } from "../../../../lib/salesApp";

// Créneaux disponibles pour une journée : la liste des heures, moins celles
// déjà réservées (et celles déjà passées si c'est aujourd'hui).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isWeekday(date)) {
    return Response.json({ ok: false, error: "Date invalide." }, { status: 400 });
  }

  const { env } = getCloudflareContext();
  let taken: string[] = [];
  if (env.UPLOADS) {
    const obj = await env.UPLOADS.get(bookingsKey(date));
    if (obj) {
      try {
        taken = Object.keys(JSON.parse(await obj.text()) as Record<string, unknown>);
      } catch {
        taken = [];
      }
    }
  }

  // Le calendrier de Matt (app de vente) : ses rendez-vous — virtuels ou
  // non, avec la marge de dépassement — sont bloqués eux aussi. Sans ça le
  // site ne connaissait que ses PROPRES réservations = doubles bookings.
  const { busy, error: busyError } = await salesBusySlots(env);
  for (const slot of busy) {
    if (slot.startsWith(`${date} `)) {
      const t = slot.slice(11);
      if (!taken.includes(t)) taken.push(t);
    }
  }
  taken.sort();

  const now = montrealNow();
  const times = slotTimes().filter(
    (t) => date > now.date || (date === now.date && t > now.hm)
  );

  return Response.json(
    { ok: true, date, times, taken, days: bookableDays(), busyError },
    { headers: { "cache-control": "no-store" } }
  );
}
