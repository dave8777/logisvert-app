import { GREE_OPTIONS } from "./gree-options";

// Quebec sales tax rates
export const TAX_RATES = {
  gst: 0.05, // GST 5%
  qst: 0.09975, // QST 9.975%
} as const;

export type WallMountLine = "Charmo" | "Clivia" | "Airy";
export type WallMountSize = "9k" | "12k" | "18k" | "24k" | "36k";
export type MultiZoneType = "Ductless" | "Ducted" | "Mix";
export type MultiZoneSize = "18k" | "24k" | "30k" | "36k" | "42k";

export const WALL_MOUNT_LINES: WallMountLine[] = ["Charmo", "Clivia", "Airy"];
export const WALL_MOUNT_SIZES: WallMountSize[] = [
  "9k",
  "12k",
  "18k",
  "24k",
  "36k",
];
export const MULTI_ZONE_TYPES: MultiZoneType[] = ["Ductless", "Ducted", "Mix"];
export const MULTI_ZONE_SIZES: MultiZoneSize[] = [
  "18k",
  "24k",
  "30k",
  "36k",
  "42k",
];

export type Pricing = {
  /** Installed selling price BEFORE taxes ($ CAD) */
  priceBeforeTax: number;
  /** LogisVert subsidy amount ($ CAD). Use 0 when not eligible (e.g. 9k). */
  subsidy: number;
};

// ==================================================================
// ⚠️  YOUR PRICES — EDIT THE AMOUNTS HERE ⚠️
//
// priceBeforeTax : installed selling price BEFORE taxes ($ CAD).
//                  Taxes (GST + QST) are added automatically.
// subsidy        : LogisVert subsidy for this model ($ CAD).
//
// The amounts below are EXAMPLES — replace them with your real
// prices and the real LogisVert amounts.
// ==================================================================
export const WALL_MOUNT_PRICES: Record<
  WallMountLine,
  Partial<Record<WallMountSize, Pricing>>
> = {
  Charmo: {
    "9k": { priceBeforeTax: 3295, subsidy: 0 },
    "12k": { priceBeforeTax: 3495, subsidy: 1000 },
    "18k": { priceBeforeTax: 4295, subsidy: 1300 },
    "24k": { priceBeforeTax: 4995, subsidy: 1700 },
    "36k": { priceBeforeTax: 6495, subsidy: 2000 },
  },
  Clivia: {
    "9k": { priceBeforeTax: 3695, subsidy: 0 },
    "12k": { priceBeforeTax: 3895, subsidy: 1000 },
    "18k": { priceBeforeTax: 4695, subsidy: 1300 },
    "24k": { priceBeforeTax: 5395, subsidy: 1700 },
  },
  Airy: {
    "9k": { priceBeforeTax: 4095, subsidy: 0 },
    "12k": { priceBeforeTax: 4295, subsidy: 1000 },
    "18k": { priceBeforeTax: 5095, subsidy: 1300 },
  },
};

export const MULTI_ZONE_PRICES: Record<
  MultiZoneType,
  Partial<Record<MultiZoneSize, Pricing>>
> = {
  Ductless: {
    "18k": { priceBeforeTax: 6995, subsidy: 1300 },
    "24k": { priceBeforeTax: 7995, subsidy: 1700 },
    "30k": { priceBeforeTax: 8995, subsidy: 1800 },
    "36k": { priceBeforeTax: 9995, subsidy: 2000 },
    "42k": { priceBeforeTax: 10995, subsidy: 2200 },
  },
  Ducted: {
    "18k": { priceBeforeTax: 7495, subsidy: 1300 },
    "24k": { priceBeforeTax: 8495, subsidy: 1700 },
    "30k": { priceBeforeTax: 9495, subsidy: 1800 },
    "36k": { priceBeforeTax: 10495, subsidy: 2000 },
    "42k": { priceBeforeTax: 11495, subsidy: 2200 },
  },
  Mix: {
    "18k": { priceBeforeTax: 7245, subsidy: 1300 },
    "24k": { priceBeforeTax: 8245, subsidy: 1700 },
    "30k": { priceBeforeTax: 9245, subsidy: 1800 },
    "36k": { priceBeforeTax: 10245, subsidy: 2000 },
    "42k": { priceBeforeTax: 11245, subsidy: 2200 },
  },
};

export type Quote = {
  /** Product line (wall mount) or system type (multi-zone) */
  name: string;
  size: string;
  ahri: string;
  quantity: number;
  priceBeforeTax: number;
  gst: number;
  qst: number;
  priceWithTax: number;
  subsidy: number;
  finalPrice: number;
};

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeQuote(
  pricing: Pricing,
  name: string,
  size: string,
  ahri: string,
  quantity: number
): Quote {
  const priceBeforeTax = roundCents(pricing.priceBeforeTax * quantity);
  const gst = roundCents(priceBeforeTax * TAX_RATES.gst);
  const qst = roundCents(priceBeforeTax * TAX_RATES.qst);
  const priceWithTax = roundCents(priceBeforeTax + gst + qst);
  const subsidy = roundCents(pricing.subsidy * quantity);
  const finalPrice = roundCents(priceWithTax - subsidy);

  return {
    name,
    size,
    ahri,
    quantity,
    priceBeforeTax,
    gst,
    qst,
    priceWithTax,
    subsidy,
    finalPrice,
  };
}

/**
 * Full quote for a wall-mounted unit: price taxes included, subsidy and
 * final price. Returns null when the line does not offer that capacity.
 */
export function getWallMountQuote(
  line: WallMountLine,
  size: WallMountSize,
  quantity: number
): Quote | null {
  const pricing = WALL_MOUNT_PRICES[line][size];
  if (!pricing) return null;

  const option = GREE_OPTIONS.find(
    (item) =>
      item.line === line &&
      item.equipmentType === "Wall Mount" &&
      item.sizeLabel === size
  );

  return computeQuote(pricing, line, size, option?.ahri ?? "", quantity);
}

/**
 * Full quote for a multi-zone system (ductless, ducted or mixed indoor
 * units). Returns null when that combination is not offered.
 */
export function getMultiZoneQuote(
  type: MultiZoneType,
  size: MultiZoneSize,
  quantity: number
): Quote | null {
  const pricing = MULTI_ZONE_PRICES[type][size];
  if (!pricing) return null;

  const option = GREE_OPTIONS.find(
    (item) =>
      item.line === "Multizone" &&
      item.equipmentType === type &&
      item.sizeLabel === size
  );

  return computeQuote(pricing, type, size, option?.ahri ?? "", quantity);
}
