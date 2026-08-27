import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  STATION,
  degreeDaysFromDailyMeans,
  normalDegreeDays,
  type DegreeDays,
} from "../../../lib/climate";

// Degrés-jours réellement observés dans le secteur, par année civile, pour
// ramener la facture du client à une année météo normale. Même logique de
// cache que les avis Google : on garde le résultat dans R2 et un échec de
// fetch retombe sur les normales plutôt que de bloquer le calculateur.
//
// Source : archive ERA5 d'Open-Meteo (gratuite, sans clé).
const ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive";
const FIRST_YEAR = 2015;
// L'archive accuse quelques jours de retard : on s'arrête une semaine avant
// aujourd'hui, et degreeDaysFromDailyMeans complète le reste par la normale.
const ARCHIVE_LAG_DAYS = 7;

const HEADERS = {
  "cache-control": "public, max-age=86400",
};
const FAIL_HEADERS = {
  "cache-control": "no-store",
};

function cacheKey(year: number): string {
  return `cache/degree-days-${year}.json`;
}

// Une année passée ne change plus ; l'année en cours se complète encore.
function maxAgeMs(year: number, now: Date): number {
  return year < now.getUTCFullYear()
    ? 365 * 24 * 3600 * 1000
    : 7 * 24 * 3600 * 1000;
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const now = new Date();
  const year = Number.parseInt(url.searchParams.get("year") ?? "", 10);

  if (
    !Number.isFinite(year) ||
    year < FIRST_YEAR ||
    year > now.getUTCFullYear()
  ) {
    return Response.json(
      { ok: true, degreeDays: normalDegreeDays() },
      { headers: FAIL_HEADERS }
    );
  }

  const { env } = getCloudflareContext();
  const key = cacheKey(year);

  let cached: { savedAt?: string; degreeDays?: DegreeDays } | null = null;
  try {
    const object = await env.UPLOADS?.get(key);
    if (object) cached = JSON.parse(await object.text());
  } catch {
    cached = null;
  }

  if (cached?.degreeDays && cached.savedAt) {
    const age = now.getTime() - new Date(cached.savedAt).getTime();
    if (age >= 0 && age < maxAgeMs(year, now)) {
      return Response.json(
        { ok: true, degreeDays: cached.degreeDays },
        { headers: HEADERS }
      );
    }
  }

  const start = `${year}-01-01`;
  const lastArchived = new Date(now.getTime() - ARCHIVE_LAG_DAYS * 86400000);
  const end =
    year < now.getUTCFullYear() ? `${year}-12-31` : isoDate(lastArchived);

  let degreeDays: DegreeDays | null = null;
  try {
    const query = new URLSearchParams({
      latitude: String(STATION.lat),
      longitude: String(STATION.lon),
      start_date: start,
      end_date: end,
      daily: "temperature_2m_mean",
      timezone: STATION.timezone,
    });
    const res = await fetch(`${ARCHIVE_URL}?${query.toString()}`);
    if (res.ok) {
      const data = (await res.json()) as {
        daily?: { time?: string[]; temperature_2m_mean?: (number | null)[] };
      };
      const time = data.daily?.time;
      const means = data.daily?.temperature_2m_mean;
      if (Array.isArray(time) && Array.isArray(means) && time.length > 30) {
        degreeDays = degreeDaysFromDailyMeans(time, means, year);
      }
    }
  } catch {
    degreeDays = null;
  }

  if (!degreeDays) {
    // Météo indisponible : les normales font le travail, et le client voit
    // que le calcul repose sur une année ordinaire.
    return Response.json(
      { ok: true, degreeDays: cached?.degreeDays ?? normalDegreeDays() },
      { headers: FAIL_HEADERS }
    );
  }

  try {
    await env.UPLOADS?.put(
      key,
      JSON.stringify({ savedAt: now.toISOString(), degreeDays }),
      { httpMetadata: { contentType: "application/json" } }
    );
  } catch {
    // Cache best-effort : on répond quand même.
  }

  return Response.json({ ok: true, degreeDays }, { headers: HEADERS });
}
