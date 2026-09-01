import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  const path = searchParams.get("path") ?? "";

  const { env } = getCloudflareContext();

  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
    return new Response("Accès refusé.", { status: 403 });
  }
  if (
    !(path.startsWith("submissions/") || path.startsWith("virtual/")) ||
    path.includes("..")
  ) {
    return new Response("Chemin invalide.", { status: 400 });
  }
  if (!env.UPLOADS) {
    return new Response("Stockage non configuré.", { status: 500 });
  }

  // Téléchargement PAR MORCEAUX (Range) : les grosses photos coupaient en
  // plein transfert vers l'app de vente — chaque morceau est une requête
  // courte qui ne peut pas être coupée.
  const rangeHeader = request.headers.get("range") ?? "";
  const m = /^bytes=(\d+)-(\d+)?$/.exec(rangeHeader);
  if (m) {
    const offset = Number(m[1]);
    const head = await env.UPLOADS.head(path);
    if (!head) {
      return new Response("Fichier introuvable.", { status: 404 });
    }
    const size = head.size;
    const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (offset >= size || end < offset) {
      return new Response("Plage invalide.", { status: 416 });
    }
    const obj = await env.UPLOADS.get(path, {
      range: { offset, length: end - offset + 1 },
    });
    if (!obj) {
      return new Response("Fichier introuvable.", { status: 404 });
    }
    return new Response(obj.body, {
      status: 206,
      headers: {
        "content-type":
          obj.httpMetadata?.contentType ?? "application/octet-stream",
        "content-range": `bytes ${offset}-${end}/${size}`,
        "cache-control": "private, max-age=0",
      },
    });
  }

  const obj = await env.UPLOADS.get(path);
  if (!obj) {
    return new Response("Fichier introuvable.", { status: 404 });
  }

  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "application/octet-stream",
      "cache-control": "private, max-age=0",
    },
  });
}
