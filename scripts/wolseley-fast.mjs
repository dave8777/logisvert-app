// Accélérateurs à greffer sur le script Playwright existant.
// Aucune réécriture : on remplace la création du contexte, rien d'autre.
//
// D'où vient la lenteur, dans l'ordre :
//   1. le login refait à chaque exécution        → economiseSession / reprendSession
//   2. images, CSS et polices téléchargées       → contexteRapide (bloque tout ça)
//   3. les SKU vérifiés un par un                → enParallele
//   4. une page rendue juste pour lire un statut → appelJson (le vrai saut)
//
// 1 à 3 marchent sans connaître les routes du site. 4 exige les routes
// réelles (scripts/wolseley-record.mjs les capture).

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";

const SESSION = "wolseley-session.json";
// Une session Wolseley tient largement la journée ; on relogue au-delà.
const SESSION_MAX_AGE_MS = 8 * 3600 * 1000;

// Rien de tout ça n'est nécessaire pour lire un inventaire ou remplir un panier.
const INUTILE = ["image", "media", "font", "stylesheet"];

/**
 * Contexte prêt à l'emploi : session restaurée si elle est encore fraîche,
 * ressources décoratives bloquées.
 *
 *   const { context, dejaConnecte } = await contexteRapide(browser);
 *   const page = await context.newPage();
 *   if (!dejaConnecte) await tonLogin(page);   // ton code existant
 */
export async function contexteRapide(browser, options = {}) {
  const frais = await sessionFraiche();
  const context = await browser.newContext({
    ...options,
    ...(frais ? { storageState: frais } : {}),
  });

  await context.route("**/*", (route) => {
    if (INUTILE.includes(route.request().resourceType())) route.abort();
    else route.continue();
  });

  return { context, dejaConnecte: frais !== null };
}

async function sessionFraiche() {
  if (!existsSync(SESSION)) return null;
  try {
    const saved = JSON.parse(await readFile(SESSION, "utf8"));
    if (Date.now() - saved.__savedAt > SESSION_MAX_AGE_MS) return null;
    delete saved.__savedAt;
    return saved;
  } catch {
    return null;
  }
}

/** À appeler une fois le login réussi — les exécutions suivantes le sautent. */
export async function economiseSession(context) {
  const state = await context.storageState();
  await writeFile(SESSION, JSON.stringify({ ...state, __savedAt: Date.now() }));
}

/**
 * Vérifie N articles de front au lieu d'un par un. La limite protège le
 * serveur de Wolseley autant que ton poste : 4 à 6 est raisonnable.
 */
export async function enParallele(items, limite, tache) {
  const resultats = new Array(items.length);
  let curseur = 0;

  const ouvriers = Array.from({ length: Math.min(limite, items.length) }, async () => {
    while (curseur < items.length) {
      const i = curseur++;
      resultats[i] = await tache(items[i], i);
    }
  });

  await Promise.all(ouvriers);
  return resultats;
}

/**
 * Appel HTTP direct réutilisant les cookies de la session Playwright :
 * pas de page, pas de rendu. C'est ici que ça devient vraiment rapide.
 * Nécessite la route réelle (voir wolseley-record.mjs).
 *
 *   const stock = await appelJson(context, "/la/vraie/route", { productId });
 */
export async function appelJson(context, path, form = null) {
  const res = await context.request.fetch(`https://www.wolseleyexpress.com${path}`, {
    method: form ? "POST" : "GET",
    headers: {
      // Sans ça, nopCommerce renvoie une page HTML au lieu du JSON.
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json, text/javascript, */*; q=0.01",
    },
    ...(form ? { form } : {}),
  });

  if (!res.ok()) throw new Error(`Wolseley ${path} → HTTP ${res.status()}`);
  return res.json();
}
