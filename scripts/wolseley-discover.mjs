#!/usr/bin/env node
// Découverte des routes Wolseley Express — à lancer depuis TON poste
// (le site est joignable de là, pas depuis un sandbox CI).
//
//   WOLSELEY_EMAIL=... WOLSELEY_PASSWORD=... \
//     node scripts/wolseley-discover.mjs W-EZR-1-4-50
//
// Ajouter --add pour tester réellement l'ajout au panier (modifie ton panier).
//
// Le script ne devine rien : il appelle chaque route candidate et rapporte
// ce que le serveur répond (statut, type de contenu, début du corps). Une
// route qui renvoie du HTML au lieu du JSON n'est pas la bonne.
//
// Si une route sort en 404, la réponse est dans l'onglet Réseau de Chrome :
// filtre « Fetch/XHR », clique sur « vérifier l'inventaire » puis sur
// « ajouter au panier », et fais « Copy as cURL » sur les appels qui
// apparaissent. C'est la source de vérité — ce script ne fait que confirmer.

const BASE = "https://www.wolseleyexpress.com";
const FIELD = "__RequestVerificationToken";

const sku = process.argv.find((a) => !a.startsWith("-") && !a.includes("/")) ?? "";
const doAdd = process.argv.includes("--add");
const email = process.env.WOLSELEY_EMAIL;
const password = process.env.WOLSELEY_PASSWORD;

if (!email || !password) {
  console.error("Manque WOLSELEY_EMAIL / WOLSELEY_PASSWORD dans l'environnement.");
  process.exit(1);
}

const jar = new Map();

function absorb(res) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq < 1) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === "") jar.delete(name);
    else jar.set(name, value);
  }
}

async function call(path, init = {}) {
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      "x-requested-with": "XMLHttpRequest",
      accept: "application/json, text/javascript, */*; q=0.01",
      "user-agent": "Mozilla/5.0 (compatible; DPSD-integration/1.0)",
      ...(cookie ? { cookie } : {}),
      ...init.headers,
    },
  });
  absorb(res);
  return res;
}

async function probe(label, path, init) {
  const res = await call(path, init);
  const type = (res.headers.get("content-type") ?? "").split(";")[0];
  const body = await res.text();
  const verdict =
    res.status === 404 ? "ROUTE INEXISTANTE"
    : type.includes("json") ? "JSON ✅"
    : res.status >= 300 && res.status < 400 ? `redirige → ${res.headers.get("location")}`
    : "HTML (pas la bonne route, ou session expirée)";
  console.log(`\n── ${label}\n   ${path}\n   HTTP ${res.status} · ${type || "?"} · ${verdict}`);
  console.log(`   ${body.slice(0, 240).replace(/\s+/g, " ")}`);
  return { res, body, type };
}

function token(html) {
  const m = html.match(new RegExp(`name="${FIELD}"[^>]*value="([^"]+)"`));
  return m ? m[1] : "";
}

// 1. Login ------------------------------------------------------------------
const form = await call("/login", { headers: { accept: "text/html" } });
const t = token(await form.text());
console.log(`Jeton antiforgery : ${t ? "trouvé" : "INTROUVABLE (login peut-être en SSO)"}`);

await call("/login", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({ [FIELD]: t, Email: email, Password: password, RememberMe: "true" }),
});

const authCookie = [...jar.keys()].find((k) => /auth|identity/i.test(k));
console.log(`Cookies après login : ${[...jar.keys()].join(", ") || "(aucun)"}`);
console.log(authCookie ? `Connecté ✅ (${authCookie})` : "Login ÉCHOUÉ ❌ — le reste sera faux");

// 2. SKU → productId --------------------------------------------------------
let productId = null;
let productPath = null;
if (sku) {
  const { body } = await probe(
    "Autocomplétion (SKU → produit)",
    `/catalog/searchtermautocomplete?term=${encodeURIComponent(sku)}`
  );
  try {
    const url = JSON.parse(body)?.[0]?.producturl;
    if (url) {
      productPath = url.startsWith("http") ? new URL(url).pathname : url;
      const page = await call(productPath, { headers: { accept: "text/html" } });
      const html = await page.text();
      productId = html.match(/addproducttocart\/(?:details|catalog)\/(\d+)/)?.[1] ?? null;
      console.log(`   → fiche ${productPath} · productId = ${productId ?? "INTROUVABLE"}`);
      // Le libellé d'inventaire est aussi rendu dans la page, en secours.
      const inline = html.match(/stock-availability[^>]*>([^<]+)</)?.[1];
      if (inline) console.log(`   → inventaire lu dans le HTML : « ${inline.trim()} »`);
    }
  } catch {
    console.log("   → réponse non-JSON, autocomplétion probablement personnalisée");
  }
}

// 3. Inventaire -------------------------------------------------------------
if (productId) {
  await probe(
    "Inventaire (JSON nopCommerce)",
    `/shoppingcart/productdetails_attributechange/${productId}/false/false`,
    { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams() }
  );
}

// 4. Ajout au panier --------------------------------------------------------
if (productId && doAdd) {
  const page = await call(productPath, { headers: { accept: "text/html" } });
  const pt = token(await page.text());
  await probe("Ajout au panier", `/addproducttocart/catalog/${productId}/1/1`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(pt ? { [FIELD]: pt } : {}),
  });
} else if (productId) {
  console.log("\n── Ajout au panier : ignoré (relancer avec --add)");
}
