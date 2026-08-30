// Client HTTP pour Wolseley Express — remplace l'automatisation Playwright.
//
// Le site tourne sur nopCommerce (ASP.NET Core). Ses boutons « vérifier
// l'inventaire » et « ajouter au panier » sont de simples appels AJAX qui
// renvoient du JSON : pas besoin d'un navigateur pour les appeler. On garde
// une session par cookies, exactement comme le ferait le navigateur.
//
// AVANTAGE CLÉ : ceci tourne sur Cloudflare Workers (fetch pur, zéro
// dépendance). Playwright, lui, ne peut pas y tourner du tout.
//
// ⚠️ ROUTES NON VÉRIFIÉES — voir ROUTES plus bas. Ce sont les routes
// standard de nopCommerce. Wolseley est une version B2B personnalisée
// (divisions, inventaire par succursale, prix par compte) : l'inventaire
// et le panier passent probablement par un plugin maison. Confirmer avec
// scripts/wolseley-discover.mjs AVANT de s'y fier.

const BASE = "https://www.wolseleyexpress.com";

// ⚠️ Bloc à confirmer par la découverte DevTools / le script de découverte.
const ROUTES = {
  login: "/login",
  autocomplete: "/catalog/searchtermautocomplete",
  // nopCommerce renvoie ici le modèle produit en JSON, dont stockAvailability.
  stock: (productId: number) =>
    `/shoppingcart/productdetails_attributechange/${productId}/false/false`,
  // Variante « catalogue » : pas d'attributs à poster, quantité dans l'URL.
  addToCart: (productId: number, qty: number) =>
    `/addproducttocart/catalog/${productId}/1/${qty}`,
  cart: "/cart",
};

// nopCommerce refuse tout POST sans le jeton antiforgery ET son cookie.
const ANTIFORGERY_FIELD = "__RequestVerificationToken";

export type StockResult = {
  productId: number;
  sku: string;
  /** Texte brut renvoyé par le site (« In stock », « 12 in stock », …). */
  availability: string;
  /** null quand le texte n'est pas concluant — ne pas deviner. */
  inStock: boolean | null;
  quantity: number | null;
};

export type AddToCartResult = {
  productId: number;
  quantity: number;
  success: boolean;
  message: string;
};

/** Sac à cookies minimal : Workers ne conserve rien entre deux fetch. */
class CookieJar {
  private jar = new Map<string, string>();

  absorb(headers: Headers): void {
    const raw =
      typeof headers.getSetCookie === "function"
        ? headers.getSetCookie()
        : [headers.get("set-cookie")].filter((v): v is string => v !== null);
    for (const line of raw) {
      const [pair] = line.split(";");
      const eq = pair.indexOf("=");
      if (eq < 1) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      // Une valeur vide = suppression demandée par le serveur (déconnexion).
      if (value === "") this.jar.delete(name);
      else this.jar.set(name, value);
    }
  }

  header(): string {
    return [...this.jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  has(name: string): boolean {
    return this.jar.has(name);
  }

  /** Sérialisable : permet de réutiliser une session (KV/R2) sans re-login. */
  dump(): Record<string, string> {
    return Object.fromEntries(this.jar);
  }

  static restore(saved: Record<string, string>): CookieJar {
    const jar = new CookieJar();
    for (const [k, v] of Object.entries(saved)) jar.jar.set(k, v);
    return jar;
  }
}

function extractToken(html: string): string {
  const m = html.match(
    new RegExp(`name="${ANTIFORGERY_FIELD}"[^>]*value="([^"]+)"`)
  );
  return m ? m[1] : "";
}

export class WolseleyClient {
  private jar: CookieJar;

  private constructor(jar: CookieJar) {
    this.jar = jar;
  }

  /** Session neuve : nécessite un aller-retour de login. */
  static async login(email: string, password: string): Promise<WolseleyClient> {
    const client = new WolseleyClient(new CookieJar());

    // 1) GET du formulaire : on récupère le jeton + le cookie antiforgery.
    const form = await client.fetch(ROUTES.login);
    const token = extractToken(await form.text());
    if (!token) {
      throw new Error("Wolseley: jeton antiforgery introuvable sur /login");
    }

    // 2) POST des identifiants.
    const body = new URLSearchParams({
      [ANTIFORGERY_FIELD]: token,
      Email: email,
      Password: password,
      RememberMe: "true",
    });
    const res = await client.fetch(ROUTES.login, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    // Succès = redirection 302 + cookie d'authentification. Un 200 signifie
    // que la page de login est re-servie avec les erreurs de validation.
    const authed =
      client.jar.has(".Nop.Authentication") || client.jar.has(".AspNetCore.Identity.Application");
    if (!authed) {
      throw new Error(`Wolseley: login refusé (HTTP ${res.status})`);
    }
    return client;
  }

  /** Reprend une session déjà ouverte (cookies persistés ailleurs). */
  static fromCookies(saved: Record<string, string>): WolseleyClient {
    return new WolseleyClient(CookieJar.restore(saved));
  }

  cookies(): Record<string, string> {
    return this.jar.dump();
  }

  private async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const cookie = this.jar.header();
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      redirect: "manual", // sinon on perd le 302 qui prouve le login
      headers: {
        // Sans en-tête AJAX, nopCommerce renvoie du HTML au lieu du JSON.
        "x-requested-with": "XMLHttpRequest",
        accept: "application/json, text/javascript, */*; q=0.01",
        ...(cookie ? { cookie } : {}),
        ...(init.headers as Record<string, string> | undefined),
      },
    });
    this.jar.absorb(res.headers);
    return res;
  }

  /** Jeton frais : nopCommerce le lie à la session, il faut le relire. */
  private async token(productPath: string): Promise<string> {
    const res = await this.fetch(productPath, {
      headers: { accept: "text/html" },
    });
    return extractToken(await res.text());
  }

  /**
   * SKU → identifiant interne nopCommerce. L'autocomplétion ne renvoie que
   * l'URL du produit ; l'identifiant se lit dans le lien d'ajout au panier
   * de la fiche produit.
   */
  async resolveSku(sku: string): Promise<{ productId: number; path: string } | null> {
    const res = await this.fetch(
      `${ROUTES.autocomplete}?term=${encodeURIComponent(sku)}`
    );
    if (!res.ok) return null;
    const hits = (await res.json()) as Array<{ producturl?: string }>;
    const url = hits?.[0]?.producturl;
    if (!url) return null;

    const path = url.startsWith("http") ? new URL(url).pathname : url;
    const page = await this.fetch(path, { headers: { accept: "text/html" } });
    const html = await page.text();
    const m = html.match(/addproducttocart\/(?:details|catalog)\/(\d+)/);
    return m ? { productId: Number(m[1]), path } : null;
  }

  /** Inventaire d'un produit déjà résolu. */
  async checkStock(productId: number, sku = ""): Promise<StockResult> {
    const res = await this.fetch(ROUTES.stock(productId), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(),
    });

    let availability = "";
    if (res.ok) {
      const data = (await res.json().catch(() => null)) as
        | { stockAvailability?: string; sku?: string }
        | null;
      availability = data?.stockAvailability ?? "";
      if (data?.sku) sku = data.sku;
    }

    return { productId, sku, availability, ...readAvailability(availability) };
  }

  /** Ajout au panier. Le panier reste celui du compte connecté. */
  async addToCart(
    productId: number,
    quantity: number,
    productPath?: string
  ): Promise<AddToCartResult> {
    const body = new URLSearchParams();
    // Le jeton se lit sur la fiche produit quand on l'a, sinon sur le panier.
    const token = await this.token(productPath ?? ROUTES.cart);
    if (token) body.set(ANTIFORGERY_FIELD, token);

    const res = await this.fetch(ROUTES.addToCart(productId, quantity), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; message?: string | string[] }
      | null;
    const message = Array.isArray(data?.message)
      ? data.message.join(" ")
      : (data?.message ?? "");

    return {
      productId,
      quantity,
      success: res.ok && data?.success === true,
      message,
    };
  }

  /**
   * Lecture du panier. nopCommerce n'expose pas le panier en JSON : on lit
   * la page. ⚠️ Analyse HTML = fragile, et c'est ce qui garde le verrou du
   * total à l'étape de soumission — à vérifier en priorité contre le vrai
   * site avant tout achat automatisé.
   */
  async readCart(): Promise<{ lignes: Array<{ nom: string; sousTotal: number }>; total: number }> {
    const res = await this.fetch(ROUTES.cart, { headers: { accept: "text/html" } });
    const html = await res.text();

    const lignes: Array<{ nom: string; sousTotal: number }> = [];
    for (const row of html.match(/<tr[^>]*class="[^"]*cart-item-row[^"]*"[\s\S]*?<\/tr>/g) ?? []) {
      const nom = row.match(/class="product-name"[^>]*>([^<]+)</)?.[1]?.trim() ?? "";
      const sousTotal = readMoney(row.match(/class="[^"]*subtotal[^"]*"[\s\S]*?([\d.,\s ]+)\s*\$/)?.[1] ?? "");
      if (nom) lignes.push({ nom, sousTotal });
    }

    // Total commande : dernier montant de la table des totaux.
    const total = readMoney(
      html.match(/order-total[\s\S]{0,200}?([\d.,\s ]+)\s*\$/)?.[1] ?? ""
    );

    return { lignes, total };
  }

  /**
   * Soumission finale. Volontairement dépourvue de garde-fous : ceux-ci
   * vivent dans soumettreCommande() (wolseley-order.ts), qui est le SEUL
   * point d'entrée à utiliser. Ne pas appeler cette méthode directement.
   *
   * En cas d'erreur réseau, NE JAMAIS relancer à l'aveugle : la commande
   * est peut-être passée. Vérifier l'historique de commandes d'abord.
   */
  async submitOrder(route: string): Promise<{ success: boolean; message: string; orderNumber?: string }> {
    const body = new URLSearchParams();
    const token = await this.token(ROUTES.cart);
    if (token) body.set(ANTIFORGERY_FIELD, token);

    const res = await this.fetch(route, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });

    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; error?: string; redirect?: string }
      | null;

    return {
      success: res.ok && data?.success === true,
      message: data?.error ?? `HTTP ${res.status}`,
      orderNumber: data?.redirect?.match(/orderId=(\d+)/)?.[1],
    };
  }
}

/**
 * « In stock » / « 12 in stock » / « Out of stock » → booléen + quantité.
 * Renvoie null plutôt que de deviner : un faux « en stock » coûte un
 * déplacement au technicien.
 */
export function readAvailability(text: string): {
  inStock: boolean | null;
  quantity: number | null;
} {
  const t = text.trim().toLowerCase();
  if (!t) return { inStock: null, quantity: null };

  const n = t.match(/([\d\s ,]+)\s*(?:in stock|en stock|disponible)/);
  if (n) {
    const qty = Number(n[1].replace(/[\s ,]/g, ""));
    if (Number.isFinite(qty)) return { inStock: qty > 0, quantity: qty };
  }
  if (/out of stock|rupture|non disponible|unavailable/.test(t)) {
    return { inStock: false, quantity: null };
  }
  if (/in stock|en stock|disponible|available/.test(t)) {
    return { inStock: true, quantity: null };
  }
  return { inStock: null, quantity: null };
}

/** « 1 234,56 » ou « 1,234.56 » → nombre. Renvoie NaN si illisible. */
function readMoney(raw: string): number {
  const t = raw.replace(/[\s ]/g, "");
  if (!t) return NaN;
  // Le dernier séparateur est le décimal ; les autres sont des milliers.
  const dernier = Math.max(t.lastIndexOf(","), t.lastIndexOf("."));
  if (dernier === -1) return Number(t);
  const entier = t.slice(0, dernier).replace(/[.,]/g, "");
  return Number(`${entier}.${t.slice(dernier + 1)}`);
}
