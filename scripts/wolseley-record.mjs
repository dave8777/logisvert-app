// Enregistreur réseau à greffer sur le script Playwright QUI MARCHE DÉJÀ.
//
// Le script Playwright existant fait déjà les bons clics : le site déclenche
// donc les vrais appels AJAX pendant qu'il tourne. On les écoute au passage
// plutôt que de deviner les routes.
//
// Deux lignes à ajouter dans le script existant :
//
//   import { attachRecorder } from "./wolseley-record.mjs";
//   const stop = await attachRecorder(page);        // après la création de page
//   ...   le flux habituel : login, inventaire, ajout au panier   ...
//   await stop();                                   // avant browser.close()
//
// Sortie : wolseley-routes.json — méthode, URL, corps envoyé, début de la
// réponse, pour chaque appel XHR/fetch. C'est la liste exacte des routes à
// reproduire en HTTP pur.

import { writeFile } from "node:fs/promises";

const IGNORE = /\.(js|css|png|jpe?g|gif|svg|woff2?|ico|map)(\?|$)/i;
// Ce qui ne doit jamais atterrir dans un fichier partagé.
const SECRET = /pass|token|auth|cookie|secret/i;

export async function attachRecorder(page, out = "wolseley-routes.json") {
  const calls = [];

  page.on("request", (req) => {
    const url = req.url();
    const type = req.resourceType();
    if (IGNORE.test(url)) return;
    if (type !== "xhr" && type !== "fetch" && req.method() !== "POST") return;

    let body = req.postData() ?? "";
    // Le mot de passe et les jetons ne sortent pas d'ici.
    body = body
      .split("&")
      .map((p) => (SECRET.test(p.split("=")[0]) ? `${p.split("=")[0]}=<masqué>` : p))
      .join("&");

    calls.push({
      method: req.method(),
      url,
      resourceType: type,
      contentType: req.headers()["content-type"] ?? "",
      requestedWith: req.headers()["x-requested-with"] ?? "",
      body: body.slice(0, 1000),
    });
  });

  page.on("response", async (res) => {
    const call = calls.find((c) => c.url === res.url() && c.status === undefined);
    if (!call) return;
    call.status = res.status();
    call.responseType = (res.headers()["content-type"] ?? "").split(";")[0];
    try {
      // Seules les réponses JSON nous intéressent : ce sont les API.
      if (call.responseType.includes("json")) {
        call.responsePreview = (await res.text()).slice(0, 600);
      }
    } catch {
      // Réponse déjà consommée ou navigation : sans importance ici.
    }
  });

  return async function stop() {
    const json = calls.filter((c) => c.responseType?.includes("json") || c.method === "POST");
    await writeFile(out, JSON.stringify(json, null, 2));
    console.log(`\n${json.length} appels retenus → ${out}`);
    for (const c of json) {
      console.log(`  ${c.method} ${new URL(c.url).pathname}  → ${c.status} ${c.responseType ?? ""}`);
    }
  };
}
