import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  buildEstimatePdf,
  type PdfRecord,
  type PdfReviews,
} from "../../../../lib/estimatePdf";

// Versions JPEG réduites (public/products/pdf) : l'incorporation JPEG dans
// pdf-lib est quasi gratuite en CPU, alors que les gros PNG dépassent la
// limite CPU des Workers (erreur 1102).
const OPTION_ASSETS: Record<string, { photo: string; logo: string }> = {
  charmo: { photo: "/products/pdf/charmo.jpg", logo: "/products/pdf/charmologo.jpg" },
  clivia: { photo: "/products/pdf/clivia.jpg", logo: "/products/pdf/clivialogo.jpg" },
  airy: { photo: "/products/pdf/airy.jpg", logo: "/products/pdf/airylogo.jpg" },
  handler: { photo: "/products/pdf/airhandler.jpg", logo: "/products/pdf/flexxlogo.jpg" },
  coil: { photo: "/products/pdf/coil.jpg", logo: "/products/pdf/flexxlogo.jpg" },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const date = searchParams.get("date") ?? "";
  const langOverride = searchParams.get("lang");

  if (!/^[0-9a-f-]{36}$/.test(id) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response("Bad request", { status: 400 });
  }

  const { env } = getCloudflareContext();
  if (!env.UPLOADS) {
    return new Response("Storage not configured", { status: 500 });
  }

  const obj = await env.UPLOADS.get(`submissions/${date}/${id}/record.json`);
  if (!obj) {
    return new Response("Not found", { status: 404 });
  }

  let record: PdfRecord;
  try {
    record = JSON.parse(await obj.text()) as PdfRecord;
  } catch {
    return new Response("Corrupt record", { status: 500 });
  }
  if (langOverride === "en" || langOverride === "fr") {
    record = { ...record, lang: langOverride };
  }

  // Les images statiques sont servies par la liaison ASSETS du worker.
  const origin = new URL(request.url).origin;
  const asset = async (path: string): Promise<Uint8Array | null> => {
    try {
      const res = env.ASSETS
        ? await env.ASSETS.fetch(new Request(origin + path))
        : await fetch(origin + path);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch {
      return null;
    }
  };

  const lang = record.lang === "en" ? "en" : "fr";
  const photos: Record<string, Uint8Array | null> = {};
  const logos: Record<string, Uint8Array | null> = {};
  for (const o of record.options ?? []) {
    const meta = OPTION_ASSETS[o.key];
    if (meta && o.available && o.estimate) {
      photos[o.key] = await asset(meta.photo);
      logos[o.key] = await asset(meta.logo);
    }
  }

  // Avis Google récents, depuis le cache R2 alimenté par le site. Absent ou
  // illisible → la section est simplement omise du PDF.
  let reviews: PdfReviews | null = null;
  try {
    const revObj = await env.UPLOADS.get(`cache/google-reviews-v2-${lang}.json`);
    if (revObj) {
      const data = JSON.parse(await revObj.text()) as {
        rating?: number | null;
        total?: number;
        reviews?: { author: string; rating: number; when: string; text: string }[];
      };
      const picks = (data.reviews ?? [])
        .filter((r) => (r.text ?? "").trim())
        .slice(0, 2)
        .map((r) => {
          const text = r.text.replace(/\s+/g, " ").trim();
          return {
            ...r,
            text:
              text.length > 220
                ? text.slice(0, text.lastIndexOf(" ", 220)) + "…"
                : text,
          };
        });
      if (picks.length) {
        reviews = { rating: data.rating ?? null, total: data.total ?? 0, picks };
      }
    }
  } catch {
    reviews = null;
  }

  const pdf = await buildEstimatePdf(
    record,
    {
      logo: await asset("/products/pdf/logo.jpg"),
      guarantee: await asset(`/products/pdf/guarantee-${lang}.jpg`),
      photos,
      logos,
    },
    reviews
  );

  const filename = `Estimation-DPSD-${record.id.slice(0, 8).toUpperCase()}.pdf`;
  return new Response(pdf as unknown as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "private, max-age=3600",
    },
  });
}
