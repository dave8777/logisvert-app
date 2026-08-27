// Projection d'économies — comparaison entre le système de chauffage actuel
// du client et une thermopompe Gree installée par Groupe DPSD.
//
// Le module ne contient AUCUN prix concessionnaire : le prix installé arrive
// de l'estimation (lib/pricing.ts, côté serveur) ou est saisi par le client.
// Ici, on ne modélise que l'énergie.
//
// Méthode :
//   1. Besoin de chauffage annuel en kWh UTILES (chaleur livrée à la maison),
//      estimé par superficie/époque ou déduit de la consommation réelle.
//   2. Coût actuel  = besoin / rendement saisonnier → unités de combustible
//                     × prix unitaire.
//   3. Coût thermopompe = part couverte / COP saisonnier × tarif électrique
//                     + part d'appoint (électrique ou système actuel conservé).
//   4. Projection sur N ans avec indexation annuelle des tarifs.
//
// Toutes les hypothèses ci-dessous sont des valeurs par défaut modifiables
// par le client dans la page — ce sont des ordres de grandeur Québec 2026,
// pas des garanties.

import {
  ANNUAL_CDD_NORMAL,
  DAYS_IN_MONTH,
  weatherRatio,
  type DegreeDays,
} from "./climate";

export type FuelKey = "electric" | "oil" | "propane" | "gas";

export type Fuel = {
  key: FuelKey;
  unit: "kWh" | "L" | "m³";
  kwhPerUnit: number; // contenu énergétique d'une unité
  defaultPrice: number; // $ / unité
  defaultEscalation: number; // hausse annuelle par défaut
  co2PerUnit: number; // kg CO₂ / unité
};

// Tarifs de référence (Québec, été 2026) :
//   électricité  — Hydro-Québec tarif D, 2ᵉ tranche (le chauffage est de
//                  l'énergie marginale, donc facturée à la tranche haute) ;
//   mazout       — moyenne provinciale résidentielle #2 ;
//   propane      — moyenne résidentielle en vrac ;
//   gaz naturel  — Énergir, coût livré tout inclus (fourniture, transport,
//                  distribution, redevances).
// Contenu énergétique : mazout 38,2 MJ/L, propane 25,3 MJ/L, gaz 37,5 MJ/m³.
// CO₂ : facteurs ECCC ; l'électricité québécoise est quasi nulle (hydro).
export const FUELS: Record<FuelKey, Fuel> = {
  electric: {
    key: "electric",
    unit: "kWh",
    kwhPerUnit: 1,
    defaultPrice: 0.107,
    defaultEscalation: 0.03,
    co2PerUnit: 0.0016,
  },
  oil: {
    key: "oil",
    unit: "L",
    kwhPerUnit: 10.61,
    defaultPrice: 1.35,
    defaultEscalation: 0.04,
    co2PerUnit: 2.75,
  },
  propane: {
    key: "propane",
    unit: "L",
    kwhPerUnit: 7.03,
    defaultPrice: 1.05,
    defaultEscalation: 0.04,
    co2PerUnit: 1.55,
  },
  gas: {
    key: "gas",
    unit: "m³",
    kwhPerUnit: 10.42,
    defaultPrice: 0.65,
    defaultEscalation: 0.04,
    co2PerUnit: 1.92,
  },
};

export type CurrentSystemKey =
  | "baseboard"
  | "electricFurnace"
  | "oldHeatPump"
  | "oil"
  | "propane"
  | "gas";

export type CurrentSystem = {
  key: CurrentSystemKey;
  fuel: FuelKey;
  // Rendement saisonnier : kWh de chaleur livrée par kWh d'énergie achetée.
  // Plinthes = 1,00 (tout devient chaleur) ; fournaises = rendement AFUE
  // moyen d'un appareil de 10-20 ans ; vieille thermopompe = COP saisonnier
  // d'un appareil non-inverter de 10 ans et plus.
  efficiency: number;
  // Vrai quand l'appareil actuel est lui-même une thermopompe : il porte
  // alors la même part du besoin que le neuf (même maison, même
  // distribution), le reste allant à l'appoint électrique des deux côtés.
  // Sans ça, on comparerait une couverture partielle à une couverture
  // totale et l'écart serait faussé.
  sharesCoverage?: boolean;
};

export const CURRENT_SYSTEMS: Record<CurrentSystemKey, CurrentSystem> = {
  baseboard: { key: "baseboard", fuel: "electric", efficiency: 1.0 },
  electricFurnace: { key: "electricFurnace", fuel: "electric", efficiency: 0.97 },
  oldHeatPump: {
    key: "oldHeatPump",
    fuel: "electric",
    efficiency: 2.0,
    sharesCoverage: true,
  },
  oil: { key: "oil", fuel: "oil", efficiency: 0.78 },
  propane: { key: "propane", fuel: "propane", efficiency: 0.85 },
  gas: { key: "gas", fuel: "gas", efficiency: 0.88 },
};

export type HeatPumpKey = "charmo" | "clivia" | "airy" | "handler" | "coil";

export type HeatPumpModel = {
  key: HeatPumpKey;
  systemType: "murale" | "centrale";
  // COP saisonnier MESURÉ en climat froid, pas la fiche technique : les
  // suivis de terrain sur thermopompes froid extrême donnent 2,2 à 2,7 sur
  // une saison complète, loin des COP d'essai à 8 °C. On reste dans le bas
  // de cette fourchette — une économie annoncée trop belle se retourne
  // contre nous à la première facture.
  cop: number;
  // Part du besoin annuel portée par la thermopompe. Une murale chauffe
  // surtout l'aire ouverte ; un système central distribué par conduits
  // couvre presque tout.
  coverage: number;
};

export const HEAT_PUMPS: Record<HeatPumpKey, HeatPumpModel> = {
  charmo: { key: "charmo", systemType: "murale", cop: 2.4, coverage: 0.65 },
  clivia: { key: "clivia", systemType: "murale", cop: 2.5, coverage: 0.65 },
  airy: { key: "airy", systemType: "murale", cop: 2.6, coverage: 0.65 },
  handler: { key: "handler", systemType: "centrale", cop: 2.4, coverage: 0.88 },
  coil: { key: "coil", systemType: "centrale", cop: 2.4, coverage: 0.85 },
};

/**
 * Ce que le catalogue ne dit pas : dégivrages, cycles courts en mi-saison,
 * et le confort qu'on prend en plus une fois que chauffer coûte moins cher
 * (on monte le thermostat, on chauffe des pièces qu'on laissait froides).
 * On rabote le COP d'autant plutôt que de promettre le laboratoire.
 */
export const REALISM_FACTOR = 0.95;

// Intensité de chauffage — kWh de chaleur utile par pi² par an, climat du
// Grand Montréal (~4 200 degrés-jours). Ordres de grandeur usuels pour une
// maison unifamiliale selon l'époque de construction et l'isolation.
export type Vintage = "recent" | "average" | "older";

export const HEAT_INTENSITY: Record<Vintage, number> = {
  recent: 8, // 2000 et après / rénovée
  average: 11, // 1980-2000
  older: 15, // avant 1980
};

/**
 * Superficie approximative déduite de la capacité de l'équipement existant
 * (règle du pouce d'installation : ~550 pi² par tonne de refroidissement au
 * Québec). Sert uniquement à préremplir le champ après lecture d'une plaque
 * — le client ajuste ensuite.
 */
export function areaFromCapacity(sizeBtu: number): number {
  const area = (sizeBtu / 12) * 550;
  return Math.round(Math.min(4000, Math.max(600, area)) / 50) * 50;
}

export function demandFromArea(areaSqft: number, vintage: Vintage): number {
  return Math.max(0, areaSqft) * HEAT_INTENSITY[vintage];
}

/**
 * Consommation annuelle réelle (L, m³ ou kWh) → chaleur utile livrée.
 * Pour une thermopompe existante, la consommation couvre déjà un mélange
 * thermopompe + appoint : on inverse le même partage que la projection.
 */
export function demandFromConsumption(
  quantity: number,
  fuel: Fuel,
  efficiency: number,
  options?: { sharesCoverage?: boolean; coverage?: number }
): number {
  const energy = Math.max(0, quantity) * fuel.kwhPerUnit;
  if (options?.sharesCoverage && options.coverage !== undefined) {
    const coverage = Math.min(1, Math.max(0, options.coverage));
    return energy / (coverage / Math.max(1, efficiency) + (1 - coverage));
  }
  return energy * efficiency;
}

/** L'appoint : la fournaise reste en place, sauf remplacement complet. */
export function backupModeFor(
  currentKey: CurrentSystemKey,
  hpKey: HeatPumpKey
): "electric" | "current" {
  if (hpKey === "handler") return "electric"; // ventilo-convecteur neuf
  if (CURRENT_SYSTEMS[currentKey].fuel === "electric") return "electric";
  return "current"; // biénergie : la fournaise existante prend les pointes
}

// ---- Facture d'électricité : remonter du montant à la consommation ----
// Le client connaît son montant annuel, pas ses kWh. Le tarif D n'est pas
// linéaire (redevance quotidienne + deux tranches), et le chauffage tombe
// justement dans la tranche haute : on reconstitue donc la facture mois par
// mois plutôt que de diviser par un tarif moyen.
//
// Valeurs approximatives 2026 — à confirmer sur une vraie facture.
export const RATE_D = {
  dailyCharge: 0.4562, // $ / jour (redevance d'abonnement)
  tier1: 0.0694, // $ / kWh, premiers 40 kWh par jour
  tier2: 0.107, // $ / kWh, au-delà
  tier1DailyKwh: 40,
};

export type Tariff = typeof RATE_D;

/** Facture annuelle produite par une répartition mensuelle de kWh. */
export function rateDAnnualBill(
  monthlyKwh: number[],
  days: number[],
  tariff: Tariff = RATE_D
): number {
  let total = 0;
  for (let m = 0; m < 12; m += 1) {
    const tier1Cap = tariff.tier1DailyKwh * days[m];
    const kwh = Math.max(0, monthlyKwh[m]);
    total +=
      tariff.dailyCharge * days[m] +
      Math.min(kwh, tier1Cap) * tariff.tier1 +
      Math.max(0, kwh - tier1Cap) * tariff.tier2;
  }
  return total;
}

export type AcType = "none" | "window" | "central";

// Piscine et spa : gros consommateurs qu'il faut sortir de la facture AVANT
// d'en déduire le chauffage. Une piscine chauffée, c'est un bloc d'été ; un
// spa utilisé l'hiver perd d'autant plus de chaleur qu'il fait froid, donc
// une partie de sa consommation suit les degrés-jours — exactement la même
// signature que le chauffage de la maison. Sans les retirer, on attribuerait
// leur consommation à la thermopompe et on promettrait des économies qui
// n'existent pas.
export type PoolType = "none" | "pump" | "heatPump" | "electric";
export type SpaType = "none" | "summer" | "yearRound";

// kWh par saison : filtration seule ; filtration + thermopompe de piscine ;
// filtration + chauffe-eau électrique (le poste le plus lourd d'une maison).
export const POOL_KWH: Record<PoolType, number> = {
  none: 0,
  pump: 1800,
  heatPump: 5300,
  electric: 10800,
};

// Spa : l'été seulement (vidangé ou éteint l'hiver), ou à l'année.
export const SPA_KWH: Record<SpaType, number> = {
  none: 0,
  summer: 1400,
  yearRound: 3200,
};

// Saison de piscine, mai → septembre (part de la consommation par mois).
export const POOL_SEASON = [0, 0, 0, 0, 0.12, 0.24, 0.28, 0.24, 0.12, 0, 0, 0];

// Spa à l'année : une part constante (filtration, veille) et une part qui
// suit le froid (pertes du couvercle et de la cuve).
export const SPA_FLAT_SHARE = 0.45;

// Consommation de base : ce qui ne dépend pas de la météo. L'eau chaude
// domine et suit le nombre de personnes ; l'éclairage et les électros sont
// à peu près fixes par ménage. Chauffe-eau électrique supposé — la norme
// au Québec.
export const BASE_KWH_HOUSEHOLD = 3500;
export const BASE_KWH_PER_OCCUPANT = 1800;

// Climatisation par saison normale, selon ce que le client possède.
export const COOLING_KWH: Record<AcType, number> = {
  none: 0,
  window: 350,
  central: 900,
};

export type BillBreakdown = {
  totalKwh: number;
  baseKwh: number;
  coolingKwh: number;
  poolSpaKwh: number; // piscine + spa, retirés avant de déduire le chauffage
  heatingKwh: number; // électricité de chauffage de l'année facturée
  heatingKwhNormalized: number; // ramenée à une année météo normale
  weatherRatio: number; // > 1 = l'année facturée a été plus douce que la normale
  effectiveRate: number; // $ / kWh réellement payés, toutes tranches comprises
  belowBaseLoad: boolean; // la facture n'explique même pas la base : rien à chauffer
};

/**
 * Facture annuelle ($) → part chauffage, climatisation et base, en tenant
 * compte de la météo de l'année facturée.
 */
export function breakdownFromBill(input: {
  billAmount: number;
  occupants: number;
  acType: AcType;
  degreeDays: DegreeDays;
  poolType?: PoolType;
  spaType?: SpaType;
  poolKwh?: number; // valeurs connues du client, si elles le sont
  spaKwh?: number;
  tariff?: Tariff;
}): BillBreakdown {
  const tariff = input.tariff ?? RATE_D;
  const dd = input.degreeDays;
  const days = DAYS_IN_MONTH;

  const baseKwh =
    BASE_KWH_HOUSEHOLD + BASE_KWH_PER_OCCUPANT * Math.max(1, input.occupants);
  const coolingKwh =
    COOLING_KWH[input.acType] *
    (ANNUAL_CDD_NORMAL > 0 ? dd.annualCdd / ANNUAL_CDD_NORMAL : 1);

  const hddTotal = dd.monthlyHdd.reduce((a, b) => a + b, 0) || 1;
  const cddTotal = dd.monthlyCdd.reduce((a, b) => a + b, 0) || 1;
  const daysTotal = days.reduce((a, b) => a + b, 0);

  // Piscine et spa, répartis sur les mois où ils consomment vraiment.
  const poolKwh =
    input.poolKwh ?? POOL_KWH[input.poolType ?? "none"];
  const spaKwh = input.spaKwh ?? SPA_KWH[input.spaType ?? "none"];
  const spaYearRound = (input.spaType ?? "none") === "yearRound";
  const poolSpaMonthly = days.map((d, m) => {
    const pool = poolKwh * POOL_SEASON[m];
    const spa = spaYearRound
      ? spaKwh * SPA_FLAT_SHARE * (d / daysTotal) +
        spaKwh * (1 - SPA_FLAT_SHARE) * (dd.monthlyHdd[m] / hddTotal)
      : spaKwh * POOL_SEASON[m];
    return pool + spa;
  });
  const poolSpaKwh = poolSpaMonthly.reduce((a, b) => a + b, 0);

  // Facture modélisée pour une quantité annuelle de chauffage donnée : la
  // base s'étale sur l'année, le chauffage suit les degrés-jours, la
  // climatisation suit les degrés-jours de refroidissement.
  const billFor = (heatingKwh: number): number => {
    const monthly = days.map(
      (d, m) =>
        (baseKwh * d) / daysTotal +
        poolSpaMonthly[m] +
        (heatingKwh * dd.monthlyHdd[m]) / hddTotal +
        (coolingKwh * dd.monthlyCdd[m]) / cddTotal
    );
    return rateDAnnualBill(monthly, days, tariff);
  };

  const floor = billFor(0);
  if (input.billAmount <= floor) {
    // Facture plus basse que la consommation de base estimée : on ne peut
    // pas en tirer de chauffage sans inventer.
    return {
      totalKwh: baseKwh + coolingKwh + poolSpaKwh,
      baseKwh,
      coolingKwh,
      poolSpaKwh,
      heatingKwh: 0,
      heatingKwhNormalized: 0,
      weatherRatio: weatherRatio(dd),
      effectiveRate:
        input.billAmount / Math.max(1, baseKwh + coolingKwh + poolSpaKwh),
      belowBaseLoad: true,
    };
  }

  // La facture croît avec le chauffage : bissection, 40 passes suffisent
  // largement pour tomber au kWh près.
  let low = 0;
  let high = 60000;
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (billFor(mid) < input.billAmount) low = mid;
    else high = mid;
  }
  const heatingKwh = (low + high) / 2;
  const totalKwh = baseKwh + coolingKwh + poolSpaKwh + heatingKwh;

  return {
    totalKwh,
    baseKwh,
    coolingKwh,
    poolSpaKwh,
    heatingKwh,
    heatingKwhNormalized: heatingKwh * weatherRatio(dd),
    weatherRatio: weatherRatio(dd),
    effectiveRate: input.billAmount / Math.max(1, totalKwh),
    belowBaseLoad: false,
  };
}

export type ProjectionInput = {
  demandKwh: number; // chaleur utile annuelle
  currentKey: CurrentSystemKey;
  currentEfficiency: number;
  fuelPrice: number; // $ / unité du combustible actuel
  fuelEscalation: number;
  electricPrice: number; // $ / kWh
  electricEscalation: number;
  cop: number;
  coverage: number; // 0-1
  realism: number; // rabot sur le COP (dégivrage, cycles, rebond de confort)
  backup: "electric" | "current";
  years: number;
  investment: number | null; // prix installé, taxes incluses
  subsidy: number; // subvention LogisVert
};

export type ProjectionYear = {
  year: number; // 1 … N
  currentCost: number;
  heatPumpCost: number;
  savings: number;
  cumulativeSavings: number;
  cumulativeCurrent: number; // coût cumulé si on ne change rien
  cumulativeHeatPump: number; // coût cumulé avec la thermopompe + investissement net
};

export type Projection = {
  rows: ProjectionYear[];
  firstYearCurrent: number;
  firstYearHeatPump: number;
  firstYearSavings: number;
  totalCurrent: number;
  totalHeatPump: number;
  totalSavings: number;
  netInvestment: number | null;
  netPosition: number | null; // économies cumulées − investissement net
  paybackYears: number | null; // null si jamais rentabilisé sur l'horizon
  currentUnitsPerYear: number; // L, m³ ou kWh achetés aujourd'hui
  heatPumpKwhPerYear: number; // électricité de la thermopompe + appoint élec.
  backupUnitsPerYear: number; // combustible d'appoint conservé, s'il y a lieu
  co2SavedPerYear: number; // kg
  co2SavedTotal: number; // kg
  effectiveCop: number; // COP après rabot de réalisme
  heatingBillReduction: number; // part de la facture de chauffage effacée (0-1)
};

function escalated(price: number, rate: number, year: number): number {
  return price * Math.pow(1 + rate, year - 1);
}

export function project(input: ProjectionInput): Projection {
  const current = CURRENT_SYSTEMS[input.currentKey];
  const fuel = FUELS[current.fuel];
  const efficiency = Math.max(0.1, input.currentEfficiency);
  const realism = Math.min(1, Math.max(0.5, input.realism));
  const cop = Math.max(1, input.cop * realism);
  const coverage = Math.min(1, Math.max(0, input.coverage));
  const years = Math.max(1, Math.round(input.years));

  // Quantités annuelles — constantes d'une année à l'autre ; seuls les
  // tarifs bougent.
  const coveredKwh = input.demandKwh * coverage;
  const remainderKwh = input.demandKwh - coveredKwh;

  const currentEnergyKwh = current.sharesCoverage
    ? coveredKwh / efficiency + remainderKwh
    : input.demandKwh / efficiency;
  const currentUnitsPerYear = currentEnergyKwh / fuel.kwhPerUnit;

  let heatPumpKwhPerYear = coveredKwh / cop;
  let backupUnitsPerYear = 0;
  if (input.backup === "electric") {
    heatPumpKwhPerYear += remainderKwh; // plinthes / appoint électrique
  } else {
    backupUnitsPerYear = remainderKwh / efficiency / fuel.kwhPerUnit;
  }

  const rows: ProjectionYear[] = [];
  let cumulativeSavings = 0;
  let cumulativeCurrent = 0;
  let cumulativeHeatPumpCost = 0;

  const netInvestment =
    input.investment === null
      ? null
      : Math.max(0, input.investment - Math.max(0, input.subsidy));

  for (let year = 1; year <= years; year += 1) {
    const fuelPrice = escalated(input.fuelPrice, input.fuelEscalation, year);
    const elecPrice = escalated(
      input.electricPrice,
      input.electricEscalation,
      year
    );

    const currentCost = currentUnitsPerYear * fuelPrice;
    const heatPumpCost =
      heatPumpKwhPerYear * elecPrice + backupUnitsPerYear * fuelPrice;
    const savings = currentCost - heatPumpCost;

    cumulativeSavings += savings;
    cumulativeCurrent += currentCost;
    cumulativeHeatPumpCost += heatPumpCost;

    rows.push({
      year,
      currentCost,
      heatPumpCost,
      savings,
      cumulativeSavings,
      cumulativeCurrent,
      cumulativeHeatPump: cumulativeHeatPumpCost + (netInvestment ?? 0),
    });
  }

  // Retour sur investissement : l'année (fractionnaire) où les économies
  // cumulées rattrapent l'investissement net.
  let paybackYears: number | null = null;
  if (netInvestment !== null && netInvestment > 0) {
    let previous = 0;
    for (const row of rows) {
      if (row.cumulativeSavings >= netInvestment) {
        const withinYear =
          row.savings > 0 ? (netInvestment - previous) / row.savings : 0;
        paybackYears = row.year - 1 + Math.min(1, Math.max(0, withinYear));
        break;
      }
      previous = row.cumulativeSavings;
    }
  } else if (netInvestment !== null) {
    paybackYears = 0; // entièrement couvert par la subvention
  }

  const co2Before = currentUnitsPerYear * fuel.co2PerUnit;
  const co2After =
    heatPumpKwhPerYear * FUELS.electric.co2PerUnit +
    backupUnitsPerYear * fuel.co2PerUnit;
  const co2SavedPerYear = co2Before - co2After;

  const last = rows[rows.length - 1];

  return {
    rows,
    firstYearCurrent: rows[0].currentCost,
    firstYearHeatPump: rows[0].heatPumpCost,
    firstYearSavings: rows[0].savings,
    totalCurrent: last.cumulativeCurrent,
    totalHeatPump: last.cumulativeHeatPump,
    totalSavings: last.cumulativeSavings,
    netInvestment,
    netPosition:
      netInvestment === null ? null : last.cumulativeSavings - netInvestment,
    paybackYears,
    currentUnitsPerYear,
    heatPumpKwhPerYear,
    backupUnitsPerYear,
    co2SavedPerYear,
    co2SavedTotal: co2SavedPerYear * years,
    effectiveCop: cop,
    heatingBillReduction:
      rows[0].currentCost > 0 ? rows[0].savings / rows[0].currentCost : 0,
  };
}
