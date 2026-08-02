// Moteur d'estimation — porté du module sales/pricing.py de l'application
// de vente DPSD (formule confirmée du propriétaire) :
//   prix client = équipement au coût (prix net concessionnaire − 15 %)
//               + 1 000 $ de main-d'œuvre PAR PIÈCE (unité int. ou ext.)
//               + 50 $ de pièces diverses
//               + 150 $ support/fouet/sectionneur
//               + cuivre en ROULEAUX COMPLETS de 50 pi (un rouleau par tuyau,
//                 paire selon la liste concessionnaire)
//   puis TPS 5 % + TVQ 9,975 %.
// L'outil public affiche ce total ± RANGE_MARGIN, confirmé par une visite.
//
// Prix : reference/gree_price_list_2026.csv (liste concessionnaire mars 2026).
// Subventions : reference/gree_ahri_subsidy.csv (barème LogisVert), par AHRI.

import type { GreeOption } from "./gree-options";

export const RANGE_MARGIN = 500;

const COST_FACTOR = 0.85; // prix net − 15 %
const LABOR_PER_PIECE = 1000;
const MISC_PARTS = 50;
const WHIP_DISCONNECT = 150;
const GST = 0.05;
const QST = 0.09975;

// Main-d'œuvre centrale (FLEXX), prix du propriétaire 2026-07-22.
const CENTRAL_LABOR_HANDLER = 4000;
const CENTRAL_SHEETMETAL_HANDLER = 1500;
const CENTRAL_LABOR_COIL = 3250;
const CENTRAL_SHEETMETAL_COIL = 900;

// Rouleaux de cuivre 50 pi, prix Wolseley EZ-Roll 2026-07.
const COPPER_ROLLS: Record<string, number> = {
  "1/4": 96.7,
  "3/8": 144.0, // isolé — minisplits
  "3/8bare": 140.98, // NON isolé — central
  "1/2": 185.05,
  "5/8": 227.48,
  "3/4": 268.98, // isolé — central
};

// Paire de tuyaux par famille/capacité (colonne « Tuyauterie » de la liste).
const PIPE_PAIRS: Record<string, [string, string]> = {
  "Airy-12k": ["1/4", "1/2"],
  "Airy-18k": ["1/4", "5/8"],
  "Airy-24k": ["1/4", "5/8"],
  "Clivia-12k": ["1/4", "1/2"],
  "Clivia-18k": ["1/4", "1/2"],
  "Clivia-24k": ["1/4", "5/8"],
  "Charmo-12k": ["1/4", "3/8"],
  "Charmo-18k": ["1/4", "1/2"],
  "Charmo-24k": ["1/4", "1/2"],
  "Charmo-36k": ["1/4", "5/8"],
};
const CENTRAL_PIPE_PAIR: [string, string] = ["3/8bare", "3/4"];

// Cassette au plafond : grille décorative en sus (TF05 12k/18k, TF06 24k).
const CASSETTE_GRILLE: Record<string, string> = {
  "12k": "GRETF05",
  "18k": "GRETF05",
  "24k": "GRETF06",
};

// Chauffage d'appoint par taille de ventilo-convecteur (défauts du
// propriétaire) ; true = bloc terminal DETB04537 requis.
const CENTRAL_HEATERS: Record<number, [string, boolean]> = {
  24: ["GRE21421603", false],
  36: ["GRE21421603", false],
  48: ["GRE21421701", true],
  60: ["GRE21422801", true],
};
const CENTRAL_TERMINAL_BLOCK = "DETB04537";

// Prix nets concessionnaire (gree_price_list_2026.csv, mars 2026).
const MODEL_PRICES: Record<string, number> = {
  GREGWH12AVDXED6DNA1O: 1668.8,
  GREGWH12AVDXED6DNA1I: 898.58,
  GREGWH18AVEXFD6DNA1O: 2220.23,
  GREGWH18AVEXFD6DNA1I: 1195.51,
  GREGKH12EBD6DNA1AI: 788.54,
  GREGEH12AAD6DNA1AI: 674.63,
  GREGFH12DAD6DNA1AI: 1123.69,
  GREGWH12AGCXDD6DNA4O: 1224.01,
  GREGWH12AUCXDD6DNA2I: 533.22,
  GREGWH18AGDXFD6DNA4O: 1640.17,
  GREGWH18AUDXFD6DNA2I: 714.51,
  GREGWH24AGEXFD6DNA4O: 1957.43,
  GREGWH24AUDXFD6DNA2I: 997.34,
  GREGKH24ECD6DNA1AI: 1084.65,
  GREGFH18DBD6DNA1AI: 1445.9,
  GREGFH24DBD6DNA1AI: 1483.15,
  GREGWH12ATCXBD6DNA4O: 692.03,
  GREGWH12ATCXBD6DNA4I: 372.63,
  GREGWH18ATDXDD6DNA4O: 1088.46,
  GREGWH18ATDXDD6DNA4I: 586.1,
  GREGWH24ATEXFD6DNA4O: 1310.69,
  GREGWH24ATEXFD6DNA4I: 705.76,
  GREGWH36ATEXHD6DNA1O: 2300.79,
  GREGWH36ATEXHD6DNA1I: 1230.55,
  GREGWHD18ND6MO: 2190.74,
  GREGWHD24ND6MO: 2684.71,
  GREGWHD30ND6MO: 3000.36,
  GREGWHD36ND6MO: 4125.49,
  GREGWHD42ND6MO: 4350.41,
  GREGUD36W2NHEDU: 3088.77,
  GREGUD60W2NHEDU: 4408.59,
  GREGUD24AH2EDU: 2191.91,
  GREGUD36AH2EDU: 2339.41,
  GREGUD36AH2GDU: 2339.41,
  GREGUD48AH2EDU: 2591.59,
  GREGUD60AH2GDU: 2772.4,
  GREGCAC24FNHA: 1282.65,
  GREGCAC36FNHA: 1282.65,
  GREGCAC48HNHA: 1702.43,
  GREGCAC60HNHA: 1702.43,
  GRETF05: 163.25,
  GRETF06: 287.62,
  GRE21421603: 345.8,
  GRE21421701: 419.89,
  GRE21422801: 518.69,
  DETB04537: 127.61,
};

// Subvention LogisVert par AHRI (gree_ahri_subsidy.csv — tous admissibles).
const SUBSIDIES: Record<string, number> = {
  "215386290": 1560,
  "215386340": 2340,
  "215415524": 1236,
  "216618225": 1236,
  "216618221": 1236,
  "216032436": 1440,
  "216052270": 2160,
  "216623541": 2400,
  "216618222": 1236,
  "216618217": 2328,
  "211497195": 730,
  "216618216": 2376,
  "215402236": 1164,
  "215224737": 1836,
  "215390442": 2304,
  "214568849": 3288,
  "214931586": 2112,
  "214931591": 2112,
  "214931592": 2112,
  "214931587": 2832,
  "214931593": 2640,
  "214931597": 2760,
  "214931588": 3360,
  "214931594": 3264,
  "214931598": 3312,
  "214931589": 4320,
  "214931595": 4320,
  "214931599": 4320,
  "214931590": 5340,
  "214931596": 4800,
  "214931600": 4800,
  "216621482": 2472,
  "214568826": 3384,
  "217120760": 3384,
  "216621484": 4740,
  "214568857": 5400,
  "216768109": 1800,
  "216765692": 3120,
  "216768110": 4224,
  "216765694": 4920,
};

export type Estimate = {
  min: number;
  max: number;
  subsidy: number | null;
};

function copperCost(pair: [string, string]): number {
  return COPPER_ROLLS[pair[0]] + COPPER_ROLLS[pair[1]];
}

function indoorSizeFromLabel(sizeLabel: string): number {
  // "24k / 2 ton" -> 24
  return Number.parseInt(sizeLabel, 10);
}

function withTaxes(subtotal: number): number {
  return subtotal * (1 + GST + QST);
}

/**
 * Le total installé (taxes incluses) calculé avec la formule de vente DPSD,
 * ou null quand la configuration ne se chiffre pas sans visite (multizone :
 * le prix dépend du nombre et du style des unités intérieures).
 */
function installedTotal(option: GreeOption, quantity: number): number | null {
  const out = MODEL_PRICES[option.outdoorUnit];

  if (option.line === "Multizone") {
    return null; // têtes intérieures inconnues — prix confirmé après visite
  }

  if (option.line === "Flexx Central" || option.line === "Flexx Add-On") {
    const indoor = MODEL_PRICES[option.indoorUnit];
    if (out === undefined || indoor === undefined) return null;

    let equipment = out + indoor;
    let labor: number;
    let sheetmetal: number;

    if (option.line === "Flexx Central") {
      const size = indoorSizeFromLabel(option.sizeLabel);
      const heater = CENTRAL_HEATERS[size];
      if (!heater) return null;
      equipment += MODEL_PRICES[heater[0]];
      if (heater[1]) equipment += MODEL_PRICES[CENTRAL_TERMINAL_BLOCK];
      labor = CENTRAL_LABOR_HANDLER;
      sheetmetal = CENTRAL_SHEETMETAL_HANDLER;
    } else {
      labor = CENTRAL_LABOR_COIL;
      sheetmetal = CENTRAL_SHEETMETAL_COIL;
    }

    const perSystem =
      equipment * COST_FACTOR +
      copperCost(CENTRAL_PIPE_PAIR) +
      labor +
      sheetmetal +
      MISC_PARTS +
      WHIP_DISCONNECT;
    return withTaxes(perSystem * quantity);
  }

  // Mono-zone : Airy / Clivia / Charmo
  const indoor = MODEL_PRICES[option.indoorUnit];
  if (out === undefined || indoor === undefined) return null;

  let equipment = out + indoor;
  if (option.equipmentType === "Cassette") {
    const grille = CASSETTE_GRILLE[option.sizeLabel];
    if (grille) equipment += MODEL_PRICES[grille];
  }

  const pair = PIPE_PAIRS[`${option.line}-${option.sizeLabel}`];
  if (!pair) return null;

  const perSystem =
    equipment * COST_FACTOR +
    copperCost(pair) +
    2 * LABOR_PER_PIECE +
    MISC_PARTS +
    WHIP_DISCONNECT;
  return withTaxes(perSystem * quantity);
}

export function estimateFor(
  option: GreeOption,
  quantity: number
): Estimate | null {
  const total = installedTotal(option, quantity);
  const subsidyPerUnit = SUBSIDIES[option.ahri];
  const subsidy =
    subsidyPerUnit !== undefined ? subsidyPerUnit * quantity : null;

  if (total === null) return null;

  return {
    min: Math.max(0, Math.round(total) - RANGE_MARGIN),
    max: Math.round(total) + RANGE_MARGIN,
    subsidy,
  };
}

/** La subvention seule (multizone : connue même sans prix). */
export function subsidyFor(option: GreeOption, quantity: number): number | null {
  const s = SUBSIDIES[option.ahri];
  return s !== undefined ? s * quantity : null;
}
