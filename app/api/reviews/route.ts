import { getCloudflareContext } from "@opennextjs/cloudflare";

// Avis Google de Groupe DPSD, mis en cache dans R2 et servis au site.
// Rafraîchi au plus toutes les 12 h → une poignée d'appels Places par jour,
// largement dans le palier gratuit. Échec de fetch = on garde l'ancien cache.
const PLACE_ID = "ChIJYdywAFE5yUwRovisYp3U-gc";
const CACHE_KEY = "cache/google-reviews.json";
const MAX_AGE_MS = 12 * 3600 * 1000;

const HEADERS = {
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=3600",
};

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

  if (!fresh && env.GOOGLE_PLACES_API_KEY) {
    try {
      const url = new URL(
        "https://maps.googleapis.com/maps/api/place/details/json"
      );
      url.searchParams.set("place_id", PLACE_ID);
      url.searchParams.set("fields", "rating,user_ratings_total,url,reviews");
      url.searchParams.set("reviews_sort", "newest");
      url.searchParams.set("key", env.GOOGLE_PLACES_API_KEY);
      const res = await fetch(url.toString());
      const data = (await res.json()) as {
        status?: string;
        result?: {
          rating?: number;
          user_ratings_total?: number;
          url?: string;
          reviews?: {
            author_name?: string;
            rating?: number;
            relative_time_description?: string;
            text?: string;
          }[];
        };
      };
      if (data.status === "OK" && data.result) {
        const r = data.result;
        cached = {
          fetchedAt: Date.now(),
          rating: r.rating ?? null,
          total: r.user_ratings_total ?? 0,
          url:
            r.url ??
            `https://search.google.com/local/reviews?placeid=${PLACE_ID}`,
          reviews: (r.reviews ?? [])
            .filter((x) => (x.rating ?? 0) >= 4 && (x.text ?? "").trim())
            .slice(0, 8)
            .map((x) => ({
              author: x.author_name ?? "",
              rating: x.rating ?? 5,
              when: x.relative_time_description ?? "",
              text: String(x.text).slice(0, 320),
            })),
        };
        if (env.UPLOADS) {
          await env.UPLOADS.put(CACHE_KEY, JSON.stringify(cached), {
            httpMetadata: { contentType: "application/json" },
          });
        }
      }
    } catch {
      // on garde le cache existant
    }
  }

  if (!cached) {
    return Response.json({ ok: false }, { headers: HEADERS });
  }
  return Response.json({ ok: true, ...cached }, { headers: HEADERS });
}
