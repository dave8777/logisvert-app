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
  // COP saisonnier de chauffage en climat de Montréal (inverter froid
  // extrême ; l'appoint des heures les plus froides est compté à part).
  cop: number;
  // Part du besoin annuel portée par la thermopompe. Une murale chauffe
  // surtout l'aire ouverte ; un système central distribué par conduits
  // couvre presque tout.
  coverage: number;
};

export const HEAT_PUMPS: Record<HeatPumpKey, HeatPumpModel> = {
  charmo: { key: "charmo", systemType: "murale", cop: 2.7, coverage: 0.65 },
  clivia: { key: "clivia", systemType: "murale", cop: 2.8, coverage: 0.65 },
  airy: { key: "airy", systemType: "murale", cop: 3.0, coverage: 0.65 },
  handler: { key: "handler", systemType: "centrale", cop: 2.6, coverage: 0.9 },
  coil: { key: "coil", systemType: "centrale", cop: 2.6, coverage: 0.85 },
};

// Intensité de chauffage — kWh de chaleur utile par pi² par an, climat du
// Grand Montréal (~4 200 degrés-jours). Ordres de grandeur usuels pour une
// maison unifamiliale selon l'époque de construction et l'isolation.
export type Vintage = "recent" | "average" | "older";

export const HEAT_INTENSITY: Record<Vintage, number> = {
  recent: 8, // 2000 et après / rénovée
  average: 11, // 1980-2000
  older: 15, // avant 1980
};

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
};

function escalated(price: number, rate: number, year: number): number {
  return price * Math.pow(1 + rate, year - 1);
}

export function project(input: ProjectionInput): Projection {
  const current = CURRENT_SYSTEMS[input.currentKey];
  const fuel = FUELS[current.fuel];
  const efficiency = Math.max(0.1, input.currentEfficiency);
  const cop = Math.max(1, input.cop);
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
  };
}
