// Commande Wolseley : préparation, panier, puis soumission.
//
// RÈGLE : remplir un panier est réversible, passer une commande ne l'est pas.
// Les deux sont donc séparés, et la soumission exige une confirmation
// explicite + un total attendu qui correspond. Un bug ici ne coûte pas un
// test raté : il coûte 40 rouleaux de cuivre livrés à l'atelier.
//
// ⚠️ ROUTE_SOUMISSION est INCONNUE et volontairement vide. Le paiement B2B
// de Wolseley (compte sur terme, bon de commande) passe par un tunnel
// personnalisé. Tant qu'elle n'est pas remplie et vérifiée, soumettre()
// refuse de partir. C'est voulu.

import type { WolseleyClient } from "./wolseley";

// À remplir depuis wolseley-routes.json, une fois la vraie route capturée.
const ROUTE_SOUMISSION = "";

// Double sécurité : la confirmation dans le code NE SUFFIT PAS, il faut
// aussi l'autorisation dans l'environnement. Un script lancé par erreur
// ne dépense donc rien.
const AUTORISATION_ENV = "WOLSELEY_ACHAT_REEL";

export type LigneDemandee = {
  sku: string;
  quantite: number;
  /** Garde-fou : au-dessus de ce prix unitaire, la ligne est refusée. */
  prixMaxUnitaire?: number;
};

export type LignePreparee = LigneDemandee & {
  productId: number | null;
  chemin: string | null;
  disponible: boolean | null;
  quantiteEnStock: number | null;
  probleme: string | null;
};

export type PlanCommande = {
  lignes: LignePreparee[];
  problemes: string[];
  /** false dès qu'une ligne cloche — rien ne part dans ce cas. */
  utilisable: boolean;
};

/**
 * Étape 1 — résolution et inventaire. NE TOUCHE PAS au panier.
 * Sans effet de bord : sûr à lancer autant de fois qu'on veut.
 */
export async function preparerCommande(
  client: WolseleyClient,
  demandes: LigneDemandee[]
): Promise<PlanCommande> {
  const lignes: LignePreparee[] = [];

  for (const d of demandes) {
    const base: LignePreparee = {
      ...d,
      productId: null,
      chemin: null,
      disponible: null,
      quantiteEnStock: null,
      probleme: null,
    };

    if (!Number.isInteger(d.quantite) || d.quantite < 1) {
      lignes.push({ ...base, probleme: `quantité invalide : ${d.quantite}` });
      continue;
    }

    const trouve = await client.resolveSku(d.sku);
    if (!trouve) {
      lignes.push({ ...base, probleme: "SKU introuvable" });
      continue;
    }

    const stock = await client.checkStock(trouve.productId, d.sku);
    const ligne: LignePreparee = {
      ...base,
      productId: trouve.productId,
      chemin: trouve.path,
      disponible: stock.inStock,
      quantiteEnStock: stock.quantity,
      probleme: null,
    };

    // Un inventaire illisible n'est PAS un feu vert.
    if (stock.inStock === null) {
      ligne.probleme = `inventaire indéterminé (« ${stock.availability} »)`;
    } else if (!stock.inStock) {
      ligne.probleme = "en rupture";
    } else if (stock.quantity !== null && stock.quantity < d.quantite) {
      ligne.probleme = `${stock.quantity} en stock, ${d.quantite} demandés`;
    }

    lignes.push(ligne);
  }

  const problemes = lignes
    .filter((l) => l.probleme)
    .map((l) => `${l.sku} : ${l.probleme}`);

  return { lignes, problemes, utilisable: problemes.length === 0 };
}

/**
 * Étape 2 — remplissage du panier. Réversible : le panier se vide à la main
 * sur le site. Refuse un plan qui comporte le moindre problème.
 */
export async function remplirPanier(
  client: WolseleyClient,
  plan: PlanCommande
): Promise<{ ajoutees: number; echecs: string[] }> {
  if (!plan.utilisable) {
    throw new Error(`Panier refusé — problèmes non résolus :\n  ${plan.problemes.join("\n  ")}`);
  }

  const echecs: string[] = [];
  let ajoutees = 0;

  for (const ligne of plan.lignes) {
    if (ligne.productId === null) continue;
    const res = await client.addToCart(ligne.productId, ligne.quantite, ligne.chemin ?? undefined);
    if (res.success) ajoutees += 1;
    else echecs.push(`${ligne.sku} : ${res.message || "refus du serveur"}`);
  }

  return { ajoutees, echecs };
}

/**
 * Étape 3 — soumission. Irréversible.
 *
 * Quatre verrous, tous obligatoires :
 *   1. la route de soumission est connue et vérifiée ;
 *   2. WOLSELEY_ACHAT_REEL=oui dans l'environnement ;
 *   3. confirmer: true passé explicitement par l'appelant ;
 *   4. totalAttendu correspond au total réel du panier (au cent près).
 *
 * Le verrou 4 est le plus important : il attrape le cas où le panier
 * contient autre chose que ce qu'on croit — reliquat d'un essai précédent,
 * prix changé depuis la préparation.
 */
export async function soumettreCommande(
  client: WolseleyClient,
  options: {
    confirmer: boolean;
    totalAttendu: number;
    /** Tolérance en dollars sur le total. Volontairement serrée. */
    tolerance?: number;
    environnement?: Record<string, string | undefined>;
  }
): Promise<{ soumise: boolean; raison?: string; confirmation?: string }> {
  const env = options.environnement ?? (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

  if (!ROUTE_SOUMISSION) {
    return { soumise: false, raison: "route de soumission inconnue — voir wolseley-routes.json" };
  }
  if (env[AUTORISATION_ENV] !== "oui") {
    return { soumise: false, raison: `${AUTORISATION_ENV} absent de l'environnement` };
  }
  if (options.confirmer !== true) {
    return { soumise: false, raison: "confirmer !== true" };
  }

  const panier = await client.readCart();
  if (panier.lignes.length === 0) {
    return { soumise: false, raison: "panier vide" };
  }

  const ecart = Math.abs(panier.total - options.totalAttendu);
  const tolerance = options.tolerance ?? 0.01;
  if (ecart > tolerance) {
    return {
      soumise: false,
      raison: `total du panier ${panier.total.toFixed(2)} $ ≠ attendu ${options.totalAttendu.toFixed(2)} $`,
    };
  }

  const res = await client.submitOrder(ROUTE_SOUMISSION);
  return { soumise: res.success, raison: res.success ? undefined : res.message, confirmation: res.orderNumber };
}

/** Résumé lisible à faire valider par un humain avant de soumettre. */
export function resumerPlan(plan: PlanCommande): string {
  const lignes = plan.lignes.map((l) => {
    const etat = l.probleme
      ? `⚠️  ${l.probleme}`
      : l.quantiteEnStock !== null
        ? `${l.quantiteEnStock} en stock`
        : "disponible";
    return `  ${l.quantite} × ${l.sku.padEnd(20)} ${etat}`;
  });
  return [
    `Commande Wolseley — ${plan.lignes.length} ligne(s)`,
    ...lignes,
    plan.utilisable ? "\n✅ Prêt pour le panier." : `\n❌ ${plan.problemes.length} problème(s) — rien ne sera envoyé.`,
  ].join("\n");
}
