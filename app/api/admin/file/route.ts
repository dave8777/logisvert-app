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
