import { GREE_OPTIONS } from "./gree-options";

// Taux de taxes du Québec
export const TAX_RATES = {
  tps: 0.05, // TPS 5 %
  tvq: 0.09975, // TVQ 9,975 %
} as const;

export type WallMountLine = "Charmo" | "Clivia" | "Airy";
export type WallMountSize = "12k" | "18k" | "24k" | "36k";

export const WALL_MOUNT_LINES: WallMountLine[] = ["Charmo", "Clivia", "Airy"];
export const WALL_MOUNT_SIZES: WallMountSize[] = ["12k", "18k", "24k", "36k"];

export type WallMountPricing = {
  /** Prix de vente installé AVANT taxes ($ CAD) */
  priceBeforeTax: number;
  /** Subvention LogisVert ($ CAD) */
  subsidy: number;
};

// ==================================================================
// ⚠️  VOS PRIX — MODIFIEZ LES MONTANTS ICI ⚠️
//
// priceBeforeTax : prix de vente installé AVANT taxes ($ CAD).
//                  Les taxes (TPS + TVQ) sont ajoutées automatiquement.
// subsidy        : subvention LogisVert pour ce modèle ($ CAD).
//
// Les montants ci-dessous sont des EXEMPLES à remplacer par vos
// vrais prix et les vrais montants LogisVert.
// ==================================================================
export const WALL_MOUNT_PRICES: Record<
  WallMountLine,
  Partial<Record<WallMountSize, WallMountPricing>>
> = {
  Charmo: {
    "12k": { priceBeforeTax: 3495, subsidy: 1000 },
    "18k": { priceBeforeTax: 4295, subsidy: 1300 },
    "24k": { priceBeforeTax: 4995, subsidy: 1700 },
    "36k": { priceBeforeTax: 6495, subsidy: 2000 },
  },
  Clivia: {
    "12k": { priceBeforeTax: 3895, subsidy: 1000 },
    "18k": { priceBeforeTax: 4695, subsidy: 1300 },
    "24k": { priceBeforeTax: 5395, subsidy: 1700 },
  },
  Airy: {
    "12k": { priceBeforeTax: 4295, subsidy: 1000 },
    "18k": { priceBeforeTax: 5095, subsidy: 1300 },
  },
};

export type Quote = {
  line: WallMountLine;
  size: WallMountSize;
  ahri: string;
  quantity: number;
  priceBeforeTax: number;
  tps: number;
  tvq: number;
  priceWithTax: number;
  subsidy: number;
  finalPrice: number;
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calcule la soumission complète pour une gamme, une capacité et une
 * quantité : prix taxes incluses, subvention et prix final.
 * Retourne null si la gamme n'offre pas cette capacité en murale.
 */
export function getQuote(
  line: WallMountLine,
  size: WallMountSize,
  quantity: number
): Quote | null {
  const pricing = WALL_MOUNT_PRICES[line][size];
  if (!pricing) return null;

  const option = GREE_OPTIONS.find(
    (item) =>
      item.line === line &&
      item.equipmentType === "Murale" &&
      item.sizeLabel === size
  );

  const priceBeforeTax = roundCents(pricing.priceBeforeTax * quantity);
  const tps = roundCents(priceBeforeTax * TAX_RATES.tps);
  const tvq = roundCents(priceBeforeTax * TAX_RATES.tvq);
  const priceWithTax = roundCents(priceBeforeTax + tps + tvq);
  const subsidy = roundCents(pricing.subsidy * quantity);
  const finalPrice = roundCents(priceWithTax - subsidy);

  return {
    line,
    size,
    ahri: option?.ahri ?? "",
    quantity,
    priceBeforeTax,
    tps,
    tvq,
    priceWithTax,
    subsidy,
    finalPrice,
  };
}
