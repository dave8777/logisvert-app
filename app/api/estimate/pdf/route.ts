import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildEstimatePdf, type PdfRecord } from "../../../../lib/estimatePdf";

const OPTION_ASSETS: Record<string, { photo: string; logo: string }> = {
  charmo: { photo: "/products/charmo.png", logo: "/products/charmologo.png" },
  clivia: { photo: "/products/clivia.png", logo: "/products/clivialogo.png" },
  airy: { photo: "/products/airy.png", logo: "/products/airylogo.png" },
  handler: { photo: "/products/airhandler.png", logo: "/products/flexxlogo.png" },
  coil: { photo: "/products/coil.png", logo: "/products/flexxlogo.png" },
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

  const pdf = await buildEstimatePdf(record, {
    logo: await asset("/logo-mark.png"),
    guarantee: await asset(`/products/guarantee-${lang}.png`),
    photos,
    logos,
  });

  const filename = `Estimation-DPSD-${record.id.slice(0, 8).toUpperCase()}.pdf`;
  return new Response(pdf as unknown as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${filename}"`,
      "cache-control": "private, max-age=3600",
    },
  });
}
