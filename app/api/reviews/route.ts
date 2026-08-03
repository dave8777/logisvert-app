import { getCloudflareContext } from "@opennextjs/cloudflare";

// Avis Google de Groupe DPSD, mis en cache dans R2 et servis au site.
// Rafraîchi au plus toutes les 12 h → une poignée d'appels Places par jour,
// largement dans le palier gratuit. Échec de fetch = on garde l'ancien cache.
const PLACE_ID = "ChIJYdywAFE5yUwRovisYp3U-gc";
const CACHE_KEY = "cache/google-reviews-v2.json";
const MAX_AGE_MS = 12 * 3600 * 1000;

const HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=3600",
};

// Les échecs ne doivent jamais rester coincés dans un cache navigateur/edge.
const FAIL_HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "no-store",
};

const MONTHS_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// L'API v1 laisse souvent relativePublishedTimeDescription vide ;
// on retombe sur « mois année » à partir de publishTime.
function whenLabel(relative?: string, publishTime?: string): string {
  if (relative && relative.trim()) return relative;
  if (publishTime) {
    const d = new Date(publishTime);
    if (!Number.isNaN(d.getTime())) {
      return `${MONTHS_FR[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    }
  }
  return "";
}

// Coupe au dernier mot complet plutôt qu'en pleine phrase.
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + "…";
}

type CachedReviews = {
  fetchedAt: number;
  rating: number | null;
  total: number;
  url: string;
  reviews: { author: string; rating: number; when: string; text: string }[];
};

export async function GET() {
  const { env } = getCloudflareContext();

  let cached: CachedReviews | null = null;
  if (env.UPLOADS) {
    const obj = await env.UPLOADS.get(CACHE_KEY);
    if (obj) {
      try {
        cached = JSON.parse(await obj.text()) as CachedReviews;
      } catch {
        cached = null;
      }
    }
  }

  const fresh = cached && Date.now() - (cached.fetchedAt ?? 0) < MAX_AGE_MS;

  // Raison du dernier échec, exposée quand on n'a rien à servir — permet de
  // diagnostiquer (clé restreinte par IP, API non activée…) sans les logs.
  let failReason: string | null = null;

  if (!fresh && !env.GOOGLE_PLACES_API_KEY) {
    failReason = "GOOGLE_PLACES_API_KEY is not configured";
  }
  if (!fresh && env.GOOGLE_PLACES_API_KEY) {
    try {
      // Places API (New) — la seule activable sur les projets Google récents.
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${PLACE_ID}?languageCode=fr`,
        {
          headers: {
            "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask":
              "rating,userRatingCount,googleMapsUri,reviews",
          },
        }
      );
      const data = (await res.json()) as {
        rating?: number;
        userRatingCount?: number;
        googleMapsUri?: string;
        reviews?: {
          rating?: number;
          relativePublishedTimeDescription?: string;
          publishTime?: string;
          text?: { text?: string };
          authorAttribution?: { displayName?: string };
        }[];
        error?: { status?: string; message?: string };
      };
      if (res.ok && !data.error) {
        cached = {
          fetchedAt: Date.now(),
          rating: data.rating ?? null,
          total: data.userRatingCount ?? 0,
          url:
            data.googleMapsUri ??
            `https://search.google.com/local/reviews?placeid=${PLACE_ID}`,
          reviews: (data.reviews ?? [])
            .filter((x) => (x.rating ?? 0) >= 4 && (x.text?.text ?? "").trim())
            .slice(0, 8)
            .map((x) => ({
              author: x.authorAttribution?.displayName ?? "",
              rating: x.rating ?? 5,
              when: whenLabel(x.relativePublishedTimeDescription, x.publishTime),
              text: clip(String(x.text?.text ?? ""), 320),
            })),
        };
        if (env.UPLOADS) {
          await env.UPLOADS.put(CACHE_KEY, JSON.stringify(cached), {
            httpMetadata: { contentType: "application/json" },
          });
        }
      } else {
        failReason = [data.error?.status ?? `HTTP ${res.status}`, data.error?.message]
          .filter(Boolean)
          .join(" — ");
      }
    } catch (e) {
      // on garde le cache existant
      failReason = e instanceof Error ? e.message : String(e);
    }
  }

  if (!cached) {
    return Response.json(
      { ok: false, ...(failReason ? { reason: failReason } : {}) },
      { headers: FAIL_HEADERS }
    );
  }
  return Response.json({ ok: true, ...cached }, { headers: HEADERS });
}
