"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CURRENT_SYSTEMS,
  FUELS,
  HEAT_PUMPS,
  REALISM_FACTOR,
  areaFromCapacity,
  backupModeFor,
  POOL_KWH,
  SPA_KWH,
  breakdownFromBill,
  demandFromArea,
  demandFromConsumption,
  project,
  type AcType,
  type BillBreakdown,
  type PoolType,
  type SpaType,
  type CurrentSystemKey,
  type HeatPumpKey,
  type Projection,
  type Vintage,
} from "../../lib/savings";
import { normalDegreeDays, type DegreeDays } from "../../lib/climate";

type Lang = "fr" | "en";
type SystemType = "murale" | "centrale";
type InputMode = "area" | "bill" | "consumption";

const SITE_URL = "https://dpsdair.ca";
const PHONE_DISPLAY = "(514) 969-8786";
const PHONE_TEL = "+15149698786";
const EMAIL = "info@dpsdair.ca";

// Deux séries seulement : le coût de ne rien changer (orange chaud de la
// marque) et le coût avec la thermopompe (bleu). Paire validée pour la
// vision des couleurs ; les deux courbes portent en plus une étiquette
// directe, jamais la couleur seule.
const COLOR_CURRENT = "#e8762d";
const COLOR_HEATPUMP = "#1d6fb8";

const HP_BY_TYPE: Record<SystemType, HeatPumpKey[]> = {
  murale: ["charmo", "clivia", "airy"],
  centrale: ["handler", "coil"],
};

const HORIZONS = [5, 10, 15, 20, 25];

// Années de facturation proposées : l'an dernier d'abord, c'est la facture
// que le client a sous la main.
const BILL_YEARS = (() => {
  const current = new Date().getFullYear();
  return [current - 1, current - 2, current - 3, current];
})();

const STRINGS = {
  fr: {
    brandTag: "Airclimatisé, Chauffage, Ventilation",
    backToSite: "← Retour au site",
    langToggle: "EN",
    title: "Calculateur d'économies",
    subtitle:
      "Comparez ce que vous coûte votre chauffage actuel à ce qu'il vous coûterait avec une thermopompe Gree — année par année, jusqu'à 25 ans.",
    currentSection: "Votre chauffage actuel",
    nameplateLabel: "Photo de la plaque signalétique (optionnel)",
    nameplateHint:
      "Photographiez l'étiquette de votre unité extérieure, de votre fournaise ou de votre ventilo-convecteur : on remplit le formulaire à partir de ce qu'elle dit. La plaque est l'étiquette (souvent métallique) portant le numéro de modèle.",
    nameplateReading: "Lecture de votre plaque…",
    nameplateUnreadable:
      "On n'a pas pu lire cette plaque — remplissez les champs à la main, le calcul fonctionne pareil.",
    detectedTitle: "Unité détectée sur votre photo :",
    appliedCurrent: (name: string) => `Chauffage actuel réglé sur : ${name}.`,
    appliedCurrentUnsure: (name: string) =>
      `Chauffage actuel proposé : ${name} — confirmez-le ci-dessous.`,
    appliedUnknown:
      "Cette plaque est celle d'un appareil de climatisation : elle ne dit pas ce qui chauffe la maison. Choisissez votre chauffage actuel ci-dessous.",
    appliedSystem: (name: string) =>
      `Nouvelle thermopompe préréglée sur : ${name}.`,
    appliedCapacity: (size: string) => `Capacité équivalente : ${size}.`,
    appliedArea: (area: string) =>
      `Superficie estimée à partir de la capacité : ${area} pi² — ajustez-la si vous la connaissez.`,
    currentLabel: "Système actuel",
    systems: {
      baseboard: "Plinthes électriques",
      electricFurnace: "Fournaise électrique (à air chaud)",
      oldHeatPump: "Thermopompe de 10 ans et plus",
      oil: "Fournaise au mazout",
      propane: "Fournaise au propane",
      gas: "Fournaise au gaz naturel",
    } as Record<CurrentSystemKey, string>,
    modeLabel: "Comment estimer votre consommation?",
    modeArea: "À partir de ma maison",
    modeBill: "À partir de ma facture",
    modeConsumption: "Je connais ma consommation",
    billLabel: "Montant total payé à Hydro-Québec ($)",
    billLabelFuel: (unit: string) => `Montant dépensé en combustible ($)`,
    billYearLabel: "Pour l'année",
    billHint:
      "Le total de vos 12 factures. On en retire l'eau chaude, l'éclairage et les électros pour isoler ce que le chauffage vous coûte vraiment.",
    billHintFuel:
      "Ce que vous avez payé en combustible sur une saison complète.",
    occupantsLabel: "Personnes dans la maison",
    occupantsHint:
      "Surtout pour l'eau chaude, le plus gros poste après le chauffage.",
    acLabel: "Climatisation actuelle",
    acTypes: {
      none: "Aucune",
      window: "Appareils de fenêtre",
      central: "Climatisation centrale",
    } as Record<AcType, string>,
    poolLabel: "Piscine",
    poolTypes: {
      none: "Aucune",
      pump: "Piscine non chauffée (filtration)",
      heatPump: "Piscine chauffée — thermopompe",
      electric: "Piscine chauffée — élément électrique",
    } as Record<PoolType, string>,
    spaLabel: "Spa",
    spaTypes: {
      none: "Aucun",
      summer: "Spa, l'été seulement",
      yearRound: "Spa, à l'année",
    } as Record<SpaType, string>,
    poolSpaHint:
      "Une piscine chauffée ou un spa ouvert l'hiver pèsent lourd sur la facture. On les sort du calcul : sans ça, on prendrait leur consommation pour du chauffage et on vous promettrait des économies qui n'arriveraient jamais.",
    poolSpaKnownLabel: "Consommation piscine et spa, si vous la connaissez (kWh/an)",
    breakdownPoolSpa: "Piscine et spa",
    breakdownTitle: "Ce que votre facture contient",
    breakdownTotal: (kwh: string, rate: string) =>
      `Environ ${kwh} kWh sur l'année, à ${rate} $/kWh tout compris.`,
    breakdownHeating: "Chauffage",
    breakdownCooling: "Climatisation",
    breakdownBase: "Eau chaude, éclairage, électros",
    breakdownWeatherCold: (pct: string, year: number) =>
      `${year} a été ${pct} % plus froide que la normale : on ramène votre chauffage à une année ordinaire avant de projeter.`,
    breakdownWeatherMild: (pct: string, year: number) =>
      `${year} a été ${pct} % plus douce que la normale : on ramène votre chauffage à une année ordinaire avant de projeter.`,
    breakdownWeatherNormal: (year: number) =>
      `${year} a été proche des normales du secteur.`,
    breakdownNormalsOnly:
      "Calculé sur les normales climatiques du secteur (météo de l'année non disponible).",
    breakdownBelowBase:
      "Cette facture n'excède pas ce que consomment déjà l'eau chaude et les électros — vérifiez le montant et le nombre de personnes, ou passez par la superficie.",
    areaLabel: "Superficie chauffée (pi²)",
    vintageLabel: "Âge et isolation",
    vintages: {
      recent: "2000 et après, ou bien rénovée",
      average: "Entre 1980 et 2000",
      older: "Avant 1980, peu isolée",
    } as Record<Vintage, string>,
    consumptionLabel: (unit: string) => `Consommation annuelle (${unit})`,
    consumptionHint: {
      electric:
        "Les kWh servant au chauffage — environ 55 à 65 % de votre consommation annuelle totale sur votre relevé Hydro-Québec.",
      oil: "Les litres livrés par saison de chauffage (additionnez vos livraisons).",
      propane: "Les litres livrés par saison de chauffage.",
      gas: "Les mètres cubes de votre facture annuelle Énergir, chauffage seulement.",
    } as Record<string, string>,
    newSection: "Votre nouvelle thermopompe",
    systemTypeLabel: "Type de système",
    systemWall: "Thermopompe murale",
    systemCentral: "Thermopompe centrale (conduits d'air)",
    modelLabel: "Modèle",
    models: {
      charmo: "Gree Charmo — jusqu'à −25 °C",
      clivia: "Gree Clivia — jusqu'à −30 °C",
      airy: "Gree Airy — −30 °C, haute efficacité",
      handler: "Système complet — ventilo-convecteur neuf",
      coil: "Serpentin sur fournaise existante",
    } as Record<HeatPumpKey, string>,
    wallSize: (s: string) => `${s.replace("k", " 000")} BTU`,
    centralSize: (t: string) => `${t} tonnes`,
    horizonLabel: "Projection sur",
    years: (n: number) => `${n} ans`,
    investSection: "Votre investissement (optionnel)",
    investLabel: "Prix installé, taxes incluses ($)",
    investHint:
      "Laissez vide pour ne voir que les économies d'énergie. Remplissez-le avec le prix de votre estimation pour obtenir le retour sur investissement.",
    subsidyLabel: "Subvention LogisVert ($)",
    prefilled:
      "Prérempli à partir de votre estimation — c'est le haut de votre fourchette, donc le scénario prudent.",
    assumptionsTitle: "Hypothèses de calcul (modifiables)",
    assumptionsIntro:
      "Valeurs par défaut pour le Grand Montréal, été 2026. Ajustez-les avec vos vrais chiffres : tout le calcul suit.",
    elecPrice: "Tarif électricité ($/kWh)",
    elecPriceHint: "Hydro-Québec tarif D, 2ᵉ tranche.",
    fuelPrice: (unit: string) => `Prix du combustible ($/${unit})`,
    efficiency: "Rendement du système actuel",
    efficiencyHintHp: "COP saisonnier de votre thermopompe actuelle.",
    efficiencyHintFuel: "Rendement saisonnier de la fournaise (0,78 = 78 %).",
    efficiencyHintElec: "1,00 = toute l'électricité devient de la chaleur.",
    cop: "COP saisonnier de la thermopompe",
    copHint: "Chaleur produite par kWh consommé, sur la saison complète.",
    coverage: "Part du chauffage couverte (%)",
    coverageHintWall:
      "Une murale chauffe surtout l'aire ouverte ; le reste passe à l'appoint.",
    coverageHintCentral:
      "Distribué par les conduits, un système central couvre presque toute la maison.",
    realism: "Facteur de réalisme",
    realismHint:
      "On rabote le COP pour les dégivrages, les cycles courts et le confort qu'on prend en plus une fois que chauffer coûte moins cher. 1,00 = conditions de laboratoire.",
    effectiveCop: (value: string) => `COP effectif utilisé : ${value}.`,
    elecEsc: "Hausse annuelle de l'électricité (%)",
    fuelEsc: "Hausse annuelle du combustible (%)",
    resetAssumptions: "Rétablir les valeurs par défaut",
    resultsTitle: "Vos économies projetées",
    needInput:
      "Indiquez la superficie chauffée ou votre consommation annuelle pour voir la projection.",
    statYear1: "Économies la 1ʳᵉ année",
    statShare: "Part de votre chauffage effacée",
    statShareNote: "de ce que le chauffage vous coûte aujourd'hui",
    statTotal: (n: number) => `Économies sur ${n} ans`,
    statPayback: "Retour sur investissement",
    statCo2: (n: number) => `CO₂ évité sur ${n} ans`,
    statNet: (n: number, value: string) =>
      `Position nette après ${n} ans : ${value}`,
    paybackNever: "Au-delà de l'horizon",
    paybackNeverNote:
      "Les économies d'énergie seules ne couvrent pas l'investissement sur cette période.",
    paybackFmt: (y: number, m: number) =>
      m === 0 ? `${y} ans` : `${y} ans ${m} mois`,
    paybackNow: "Immédiat",
    perYear: "par année",
    tonnes: "tonnes",
    chartTitle: "Coût cumulé du chauffage",
    chartSubWith: "Investissement net inclus dans la courbe bleue.",
    chartSubWithout: "Coût d'énergie seulement — aucun investissement saisi.",
    seriesCurrent: "Sans changement",
    seriesHeatPump: "Avec la thermopompe",
    crossover: "Point de rentabilité",
    yearAxis: "Année",
    yearsSuffix: "ans",
    tableToggle: "Voir le détail année par année",
    thYear: "Année",
    thCurrent: "Sans changement",
    thHeatPump: "Avec la thermopompe",
    thSavings: "Économies",
    thCumulative: "Cumulé",
    summaryTitle: "Ce que ça veut dire",
    summaryUse: (before: string, after: string) =>
      `Vous achetez aujourd'hui environ ${before} par année pour vous chauffer. Avec la thermopompe : ${after}.`,
    summaryBackupElec:
      "Les heures les plus froides sont couvertes par votre chauffage électrique d'appoint.",
    summaryBackupFuel:
      "Votre fournaise actuelle reste en place et prend le relais lors des grands froids (biénergie).",
    summaryCooling:
      "La climatisation de l'été est incluse dans l'appareil — elle n'est pas comptée dans ces économies.",
    disclaimer:
      "Projection indicative basée sur des moyennes du Grand Montréal, pas une garantie. Vos économies réelles varient selon l'isolation, la température que vous maintenez, l'occupation et l'évolution des tarifs. Le prix final est confirmé lors d'une visite sur place.",
    ctaTitle: "Prêt à voir vos vrais chiffres?",
    ctaText:
      "Obtenez votre estimation en ligne en quelques minutes, ou parlez-nous directement.",
    ctaEstimate: "Obtenir mon estimation",
    ctaCall: "Nous appeler",
    footerNote: "Un service de Groupe DPSD Inc",
  },
  en: {
    brandTag: "Air Conditioning, Heating, Ventilation",
    backToSite: "← Back to site",
    langToggle: "FR",
    title: "Savings Calculator",
    subtitle:
      "Compare what your current heating costs you with what it would cost with a Gree heat pump — year by year, up to 25 years.",
    currentSection: "Your current heating",
    nameplateLabel: "Nameplate photo (optional)",
    nameplateHint:
      "Photograph the label on your outdoor unit, furnace or air handler and we'll fill the form from what it says. The nameplate is the label (often metal) carrying the model number.",
    nameplateReading: "Reading your nameplate…",
    nameplateUnreadable:
      "We couldn't read that nameplate — fill the fields in by hand, the calculation works just the same.",
    detectedTitle: "Unit detected on your photo:",
    appliedCurrent: (name: string) => `Current heating set to: ${name}.`,
    appliedCurrentUnsure: (name: string) =>
      `Current heating suggested: ${name} — please confirm below.`,
    appliedUnknown:
      "That nameplate belongs to a cooling unit: it doesn't say what heats the house. Pick your current heating below.",
    appliedSystem: (name: string) => `New heat pump preset to: ${name}.`,
    appliedCapacity: (size: string) => `Equivalent capacity: ${size}.`,
    appliedArea: (area: string) =>
      `Area estimated from the capacity: ${area} sq ft — adjust it if you know it.`,
    currentLabel: "Current system",
    systems: {
      baseboard: "Electric baseboards",
      electricFurnace: "Electric furnace (forced air)",
      oldHeatPump: "Heat pump 10 years or older",
      oil: "Oil furnace",
      propane: "Propane furnace",
      gas: "Natural gas furnace",
    } as Record<CurrentSystemKey, string>,
    modeLabel: "How should we estimate your usage?",
    modeArea: "From my home",
    modeBill: "From my bill",
    modeConsumption: "I know my usage",
    billLabel: "Total paid to Hydro-Québec ($)",
    billLabelFuel: (unit: string) => `Amount spent on fuel ($)`,
    billYearLabel: "For the year",
    billHint:
      "The total of your 12 bills. We take out hot water, lighting and appliances to isolate what heating actually costs you.",
    billHintFuel: "What you paid for fuel over a full season.",
    occupantsLabel: "People in the home",
    occupantsHint:
      "Mostly for hot water, the largest item after heating.",
    acLabel: "Current cooling",
    acTypes: {
      none: "None",
      window: "Window units",
      central: "Central air conditioning",
    } as Record<AcType, string>,
    poolLabel: "Pool",
    poolTypes: {
      none: "None",
      pump: "Unheated pool (filtration)",
      heatPump: "Heated pool — heat pump",
      electric: "Heated pool — electric element",
    } as Record<PoolType, string>,
    spaLabel: "Hot tub",
    spaTypes: {
      none: "None",
      summer: "Hot tub, summer only",
      yearRound: "Hot tub, year-round",
    } as Record<SpaType, string>,
    poolSpaHint:
      "A heated pool or a hot tub kept running through winter weighs heavily on the bill. We take them out of the calculation: otherwise we'd read their usage as heating and promise you savings that would never arrive.",
    poolSpaKnownLabel: "Pool and hot tub usage, if you know it (kWh/yr)",
    breakdownPoolSpa: "Pool and hot tub",
    breakdownTitle: "What your bill is made of",
    breakdownTotal: (kwh: string, rate: string) =>
      `About ${kwh} kWh over the year, at ${rate} $/kWh all in.`,
    breakdownHeating: "Heating",
    breakdownCooling: "Cooling",
    breakdownBase: "Hot water, lighting, appliances",
    breakdownWeatherCold: (pct: string, year: number) =>
      `${year} was ${pct} % colder than normal, so we bring your heating back to an ordinary year before projecting.`,
    breakdownWeatherMild: (pct: string, year: number) =>
      `${year} was ${pct} % milder than normal, so we bring your heating back to an ordinary year before projecting.`,
    breakdownWeatherNormal: (year: number) =>
      `${year} came in close to the local normals.`,
    breakdownNormalsOnly:
      "Calculated on the area's climate normals (that year's weather wasn't available).",
    breakdownBelowBase:
      "This bill doesn't exceed what hot water and appliances already use — check the amount and the number of people, or switch to the area method.",
    areaLabel: "Heated area (sq ft)",
    vintageLabel: "Age and insulation",
    vintages: {
      recent: "2000 or newer, or well renovated",
      average: "Between 1980 and 2000",
      older: "Before 1980, lightly insulated",
    } as Record<Vintage, string>,
    consumptionLabel: (unit: string) => `Annual usage (${unit})`,
    consumptionHint: {
      electric:
        "The kWh used for heating — roughly 55 to 65 % of the annual total on your Hydro-Québec statement.",
      oil: "Litres delivered per heating season (add up your deliveries).",
      propane: "Litres delivered per heating season.",
      gas: "Cubic metres on your annual Énergir bill, heating only.",
    } as Record<string, string>,
    newSection: "Your new heat pump",
    systemTypeLabel: "System type",
    systemWall: "Wall-mounted heat pump",
    systemCentral: "Central heat pump (ductwork)",
    modelLabel: "Model",
    models: {
      charmo: "Gree Charmo — down to −25 °C",
      clivia: "Gree Clivia — down to −30 °C",
      airy: "Gree Airy — −30 °C, high efficiency",
      handler: "Complete system — new air handler",
      coil: "Cased coil on existing furnace",
    } as Record<HeatPumpKey, string>,
    wallSize: (s: string) => `${s.replace("k", ",000")} BTU`,
    centralSize: (t: string) => `${t} tons`,
    horizonLabel: "Project over",
    years: (n: number) => `${n} years`,
    investSection: "Your investment (optional)",
    investLabel: "Installed price, taxes included ($)",
    investHint:
      "Leave blank to see energy savings only. Enter the price from your estimate to get the payback period.",
    subsidyLabel: "LogisVert rebate ($)",
    prefilled:
      "Prefilled from your estimate — the top of your range, so the conservative case.",
    assumptionsTitle: "Calculation assumptions (editable)",
    assumptionsIntro:
      "Defaults for Greater Montreal, summer 2026. Replace them with your real numbers and the whole projection follows.",
    elecPrice: "Electricity rate ($/kWh)",
    elecPriceHint: "Hydro-Québec Rate D, second tier.",
    fuelPrice: (unit: string) => `Fuel price ($/${unit})`,
    efficiency: "Current system efficiency",
    efficiencyHintHp: "Seasonal COP of your existing heat pump.",
    efficiencyHintFuel: "Seasonal furnace efficiency (0.78 = 78 %).",
    efficiencyHintElec: "1.00 = all electricity becomes heat.",
    cop: "Heat pump seasonal COP",
    copHint: "Heat delivered per kWh drawn, across the whole season.",
    coverage: "Share of heating covered (%)",
    coverageHintWall:
      "A wall unit heats mostly the open area; the rest falls to backup heat.",
    coverageHintCentral:
      "Distributed through the ducts, a central system covers nearly the whole house.",
    realism: "Realism factor",
    realismHint:
      "We shave the COP for defrost cycles, short-cycling and the extra comfort people take once heating costs less. 1.00 = laboratory conditions.",
    effectiveCop: (value: string) => `Effective COP used: ${value}.`,
    elecEsc: "Annual electricity increase (%)",
    fuelEsc: "Annual fuel increase (%)",
    resetAssumptions: "Reset to defaults",
    resultsTitle: "Your projected savings",
    needInput:
      "Enter your heated area or your annual usage to see the projection.",
    statYear1: "First-year savings",
    statShare: "Share of your heating removed",
    statShareNote: "of what heating costs you today",
    statTotal: (n: number) => `Savings over ${n} years`,
    statPayback: "Payback period",
    statCo2: (n: number) => `CO₂ avoided over ${n} years`,
    statNet: (n: number, value: string) =>
      `Net position after ${n} years: ${value}`,
    paybackNever: "Beyond this horizon",
    paybackNeverNote:
      "Energy savings alone don't cover the investment over this period.",
    paybackFmt: (y: number, m: number) =>
      m === 0 ? `${y} years` : `${y} yr ${m} mo`,
    paybackNow: "Immediate",
    perYear: "per year",
    tonnes: "tonnes",
    chartTitle: "Cumulative heating cost",
    chartSubWith: "Net investment is included in the blue line.",
    chartSubWithout: "Energy cost only — no investment entered.",
    seriesCurrent: "No change",
    seriesHeatPump: "With the heat pump",
    crossover: "Break-even point",
    yearAxis: "Year",
    yearsSuffix: "years",
    tableToggle: "See the year-by-year detail",
    thYear: "Year",
    thCurrent: "No change",
    thHeatPump: "With the heat pump",
    thSavings: "Savings",
    thCumulative: "Cumulative",
    summaryTitle: "What this means",
    summaryUse: (before: string, after: string) =>
      `Today you buy about ${before} a year to heat your home. With the heat pump: ${after}.`,
    summaryBackupElec:
      "The coldest hours are covered by your electric backup heating.",
    summaryBackupFuel:
      "Your existing furnace stays in place and takes over in deep cold (dual energy).",
    summaryCooling:
      "Summer cooling comes built into the unit — it isn't counted in these savings.",
    disclaimer:
      "Indicative projection based on Greater Montreal averages, not a guarantee. Your real savings vary with insulation, the temperature you keep, occupancy and how rates evolve. The final price is confirmed with an on-site visit.",
    ctaTitle: "Ready to see your real numbers?",
    ctaText:
      "Get your online estimate in a few minutes, or talk to us directly.",
    ctaEstimate: "Get my estimate",
    ctaCall: "Call us",
    footerNote: "A service of Groupe DPSD Inc",
  },
} as const;

// Réponse de /api/nameplate (déjà en place pour l'estimation en ligne).
type NameplateResponse = {
  ok?: boolean;
  reading?: {
    sizeBtu: number | null;
    kind: string;
    fuel: string;
    isHeatPump: boolean;
  } | null;
  description?: string;
  suggestion?: { systemType: SystemType; sizeKey: string } | null;
  currentSystem?: {
    key: CurrentSystemKey;
    confidence: "high" | "low";
  } | null;
};

type NameplateState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unreadable" }
  | { status: "done"; description: string; notes: string[] };

// Les plaques qui viennent avec des conduits : la maison est déjà
// distribuée, donc c'est une centrale qu'on lui propose.
const DUCTED_KINDS = ["furnace", "coil", "air_handler", "central_ac"];

type Overrides = {
  elecPrice: string;
  fuelPrice: string;
  efficiency: string;
  cop: string;
  coverage: string;
  realism: string;
  elecEsc: string;
  fuelEsc: string;
};

function num(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function defaultsFor(currentKey: CurrentSystemKey, hpKey: HeatPumpKey): Overrides {
  const system = CURRENT_SYSTEMS[currentKey];
  const fuel = FUELS[system.fuel];
  const hp = HEAT_PUMPS[hpKey];
  return {
    elecPrice: String(FUELS.electric.defaultPrice),
    fuelPrice: String(fuel.defaultPrice),
    efficiency: String(system.efficiency),
    cop: String(hp.cop),
    coverage: String(Math.round(hp.coverage * 100)),
    realism: String(REALISM_FACTOR),
    elecEsc: String(FUELS.electric.defaultEscalation * 100),
    fuelEsc: String(fuel.defaultEscalation * 100),
  };
}

export default function Page() {
  const [lang, setLang] = useState<Lang>("fr");
  const [currentKey, setCurrentKey] = useState<CurrentSystemKey>("baseboard");
  const [inputMode, setInputMode] = useState<InputMode>("area");
  const [areaSqft, setAreaSqft] = useState("1500");
  const [vintage, setVintage] = useState<Vintage>("average");
  const [consumption, setConsumption] = useState("");
  const [billAmount, setBillAmount] = useState("");
  const [billYear, setBillYear] = useState(BILL_YEARS[0]);
  const [occupants, setOccupants] = useState("3");
  const [acType, setAcType] = useState<AcType>("none");
  const [poolType, setPoolType] = useState<PoolType>("none");
  const [spaType, setSpaType] = useState<SpaType>("none");
  const [poolSpaKnown, setPoolSpaKnown] = useState("");
  const [degreeDays, setDegreeDays] = useState<DegreeDays>(() =>
    normalDegreeDays()
  );
  const [systemType, setSystemType] = useState<SystemType>("murale");
  const [hpKey, setHpKey] = useState<HeatPumpKey>("clivia");
  const [years, setYears] = useState(15);
  const [investment, setInvestment] = useState("");
  const [subsidy, setSubsidy] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [newSizeKey, setNewSizeKey] = useState("");
  const [nameplate, setNameplate] = useState<NameplateState>({ status: "idle" });
  const [nameplatePhoto, setNameplatePhoto] = useState<File | null>(null);
  const [areaTouched, setAreaTouched] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>(() =>
    defaultsFor("baseboard", "clivia")
  );

  // Préremplissage depuis l'estimation en ligne : type de système, option
  // retenue, haut de la fourchette et subvention.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lang") === "en") setLang("en");

    const type = params.get("systemType");
    const option = params.get("option") as HeatPumpKey | null;
    const nextType: SystemType | null =
      type === "murale" || type === "centrale" ? type : null;
    if (nextType) setSystemType(nextType);
    if (option && HEAT_PUMPS[option]) {
      setHpKey(option);
      setSystemType(HEAT_PUMPS[option].systemType);
      setOverrides(defaultsFor("baseboard", option));
    }

    const price = params.get("price");
    if (price && Number.isFinite(Number(price))) {
      setInvestment(String(Math.round(Number(price))));
      setPrefilled(true);
    }
    const size = params.get("sizeKey");
    if (size) setNewSizeKey(size);

    const rebate = params.get("subsidy");
    if (rebate && Number.isFinite(Number(rebate))) {
      setSubsidy(String(Math.round(Number(rebate))));
    }
  }, []);

  const [nameplatePreview, setNameplatePreview] = useState<string | null>(null);
  useEffect(() => {
    if (!nameplatePhoto) {
      setNameplatePreview(null);
      return;
    }
    const url = URL.createObjectURL(nameplatePhoto);
    setNameplatePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [nameplatePhoto]);

  // Météo réellement observée l'année facturée : sans elle, un hiver froid
  // gonflerait les économies qu'on annonce. Indisponible = normales.
  useEffect(() => {
    if (inputMode !== "bill") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/degree-days?year=${billYear}`);
        const data = (await res.json()) as { degreeDays?: DegreeDays };
        if (!cancelled && data?.degreeDays) setDegreeDays(data.degreeDays);
      } catch {
        if (!cancelled) setDegreeDays(normalDegreeDays());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [inputMode, billYear]);

  const t = STRINGS[lang];
  const system = CURRENT_SYSTEMS[currentKey];
  const fuel = FUELS[system.fuel];
  const hp = HEAT_PUMPS[hpKey];

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      }),
    [lang]
  );
  const rateFmt = useMemo(
    () =>
      new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      }),
    [lang]
  );
  const numberFmt = useMemo(
    () =>
      new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", {
        maximumFractionDigits: 0,
      }),
    [lang]
  );

  function toggleLang() {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    const url = new URL(window.location.href);
    if (next === "en") url.searchParams.set("lang", "en");
    else url.searchParams.delete("lang");
    window.history.replaceState(null, "", url.toString());
  }

  // Lecture de la plaque par Workers AI — même route que l'estimation en
  // ligne. Échec silencieux : le formulaire manuel reste la voie normale.
  async function analyzeNameplate(file: File) {
    setNameplate({ status: "loading" });
    try {
      const form = new FormData();
      form.set("photo", file);
      form.set("lang", lang);
      const res = await fetch("/api/nameplate", { method: "POST", body: form });
      const data = (await res.json()) as NameplateResponse;
      if (data?.ok && data.reading && data.description) {
        applyDetection(data, data.description);
        return;
      }
    } catch {
      // silencieux
    }
    setNameplate({ status: "unreadable" });
  }

  /**
   * La plaque décide de trois choses : ce qui chauffe aujourd'hui, le type
   * de système neuf (des conduits appellent une centrale) et, faute de
   * mieux, la superficie déduite de la capacité. Tout reste modifiable.
   */
  function applyDetection(data: NameplateResponse, description: string) {
    const reading = data.reading!;
    const notes: string[] = [];

    let nextCurrent = currentKey;
    if (data.currentSystem?.key && CURRENT_SYSTEMS[data.currentSystem.key]) {
      nextCurrent = data.currentSystem.key;
      const name = STRINGS[lang].systems[nextCurrent];
      notes.push(
        data.currentSystem.confidence === "high"
          ? t.appliedCurrent(name)
          : t.appliedCurrentUnsure(name)
      );
    } else {
      notes.push(t.appliedUnknown);
    }

    const ducted = DUCTED_KINDS.includes(reading.kind);
    const nextType: SystemType = data.suggestion
      ? data.suggestion.systemType
      : ducted
        ? "centrale"
        : systemType;

    let nextHp: HeatPumpKey;
    if (nextType === "centrale") {
      // Fournaise à combustible : le serpentin la garde en appoint plutôt
      // que de la jeter — c'est la biénergie qu'on installe le plus.
      const fossil = CURRENT_SYSTEMS[nextCurrent].fuel !== "electric";
      nextHp = fossil && reading.kind === "furnace" ? "coil" : "handler";
    } else {
      nextHp = HP_BY_TYPE.murale.includes(hpKey) ? hpKey : "clivia";
    }
    notes.push(t.appliedSystem(STRINGS[lang].models[nextHp]));

    const sizeKey = data.suggestion?.sizeKey ?? "";
    if (sizeKey) {
      notes.push(
        t.appliedCapacity(
          nextType === "murale" ? t.wallSize(sizeKey) : t.centralSize(sizeKey)
        )
      );
    }

    if (!areaTouched && reading.sizeBtu) {
      const area = areaFromCapacity(reading.sizeBtu);
      setAreaSqft(String(area));
      setInputMode("area");
      notes.push(t.appliedArea(numberFmt.format(area)));
    }

    setCurrentKey(nextCurrent);
    setSystemType(nextType);
    setHpKey(nextHp);
    setNewSizeKey(sizeKey);
    setConsumption(""); // l'unité du combustible vient peut-être de changer
    setOverrides(defaultsFor(nextCurrent, nextHp));
    setNameplate({ status: "done", description, notes });
  }

  function changeCurrent(next: CurrentSystemKey) {
    setCurrentKey(next);
    setConsumption("");
    setOverrides(defaultsFor(next, hpKey));
  }

  function changeHeatPump(next: HeatPumpKey) {
    setHpKey(next);
    setOverrides(defaultsFor(currentKey, next));
  }

  function changeSystemType(next: SystemType) {
    setSystemType(next);
    changeHeatPump(HP_BY_TYPE[next][0]);
  }

  const defaults = defaultsFor(currentKey, hpKey);
  const efficiency = num(overrides.efficiency, system.efficiency);
  const coverage = Math.min(1, Math.max(0, num(overrides.coverage, hp.coverage * 100) / 100));

  const poolSpaDefault = POOL_KWH[poolType] + SPA_KWH[spaType];
  const poolSpaScale =
    num(poolSpaKnown, 0) > 0 && poolSpaDefault > 0
      ? num(poolSpaKnown, 0) / poolSpaDefault
      : null;

  // Facture ($) → chaleur utile. Pour une maison électrique on passe par la
  // désagrégation tarif D ; pour un combustible, le montant se convertit en
  // litres ou en m³ au prix courant.
  const breakdown: BillBreakdown | null =
    inputMode === "bill" && system.fuel === "electric" && num(billAmount, 0) > 0
      ? breakdownFromBill({
          billAmount: num(billAmount, 0),
          occupants: Math.round(num(occupants, 3)),
          acType,
          degreeDays,
          poolType,
          spaType,
          // Chiffre connu du client : on garde la forme saisonnière des
          // valeurs par défaut et on l'ajuste au total qu'il nous donne.
          ...(poolSpaScale === null
            ? {}
            : {
                poolKwh: POOL_KWH[poolType] * poolSpaScale,
                spaKwh: SPA_KWH[spaType] * poolSpaScale,
              }),
        })
      : null;

  const consumptionUnits =
    inputMode === "consumption"
      ? num(consumption, 0)
      : inputMode === "bill" && system.fuel !== "electric"
        ? num(billAmount, 0) / Math.max(0.01, num(overrides.fuelPrice, fuel.defaultPrice))
        : breakdown
          ? breakdown.heatingKwhNormalized
          : 0;

  const demandKwh =
    inputMode === "area"
      ? demandFromArea(num(areaSqft, 0), vintage)
      : demandFromConsumption(consumptionUnits, fuel, efficiency, {
          sharesCoverage: system.sharesCoverage,
          coverage,
        });

  const backup = backupModeFor(currentKey, hpKey);

  const projection: Projection | null = useMemo(() => {
    if (!(demandKwh > 0)) return null;
    return project({
      demandKwh,
      currentKey,
      currentEfficiency: efficiency,
      fuelPrice: num(overrides.fuelPrice, fuel.defaultPrice),
      fuelEscalation: num(overrides.fuelEsc, fuel.defaultEscalation * 100) / 100,
      electricPrice: num(overrides.elecPrice, FUELS.electric.defaultPrice),
      electricEscalation:
        num(overrides.elecEsc, FUELS.electric.defaultEscalation * 100) / 100,
      cop: num(overrides.cop, hp.cop),
      coverage,
      realism: num(overrides.realism, REALISM_FACTOR),
      backup,
      years,
      investment: investment.trim() === "" ? null : num(investment, 0),
      subsidy: subsidy.trim() === "" ? 0 : num(subsidy, 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    demandKwh,
    currentKey,
    efficiency,
    coverage,
    backup,
    years,
    investment,
    subsidy,
    overrides,
    hpKey,
  ]);

  const unitLabel =
    fuel.unit === "kWh" ? "kWh" : fuel.unit === "L" ? "L" : "m³";

  /** Retour vers l'estimation, avec ce que la plaque nous a appris. */
  function estimateHref(): string {
    const params = new URLSearchParams({ systemType });
    if (newSizeKey) params.set("sizeKey", newSizeKey);
    if (lang === "en") params.set("lang", "en");
    return `/?${params.toString()}`;
  }

  function formatPayback(value: number | null): string {
    if (value === null) return t.paybackNever;
    if (value <= 0) return t.paybackNow;
    const wholeYears = Math.floor(value);
    const months = Math.round((value - wholeYears) * 12);
    if (months === 12) return t.paybackFmt(wholeYears + 1, 0);
    return t.paybackFmt(wholeYears, months);
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href={lang === "en" ? `${SITE_URL}/en/` : SITE_URL}>
            <img src="/logo-mark.png" alt="Groupe DPSD" />
            <span>
              Groupe DPSD Inc
              <small>{t.brandTag}</small>
            </span>
          </a>
          <div className="header-actions">
            <a
              className="back-link"
              href={lang === "en" ? `${SITE_URL}/en/` : SITE_URL}
            >
              {t.backToSite}
            </a>
            <button type="button" className="lang-switch" onClick={toggleLang}>
              {t.langToggle}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="intro">
          <div className="container">
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
        </section>

        <section className="page-body">
          <div className="container">
            <div className="card">
              <h3
                className="section-title"
                style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}
              >
                {t.currentSection}
              </h3>

              <div className="form-grid">
                <div className="field full photo-field">
                  <label>{t.nameplateLabel}</label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      setNameplatePhoto(file);
                      if (file) void analyzeNameplate(file);
                      else setNameplate({ status: "idle" });
                    }}
                  />
                  <p className="field-hint">{t.nameplateHint}</p>
                  {nameplatePreview ? (
                    <img className="photo-preview" src={nameplatePreview} alt="" />
                  ) : null}
                </div>

                {nameplate.status === "loading" ? (
                  <div className="full">
                    <div className="status loading">{t.nameplateReading}</div>
                  </div>
                ) : null}
                {nameplate.status === "unreadable" ? (
                  <div className="full">
                    <div className="status hint">{t.nameplateUnreadable}</div>
                  </div>
                ) : null}
                {nameplate.status === "done" ? (
                  <div className="full">
                    <div className="detect-card">
                      <div className="detect-title">{t.detectedTitle}</div>
                      <div className="detect-desc">{nameplate.description}</div>
                      <ul className="detect-notes">
                        {nameplate.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                <div className="field full">
                  <label>{t.currentLabel}</label>
                  <select
                    value={currentKey}
                    onChange={(e) =>
                      changeCurrent(e.target.value as CurrentSystemKey)
                    }
                  >
                    {(Object.keys(CURRENT_SYSTEMS) as CurrentSystemKey[]).map(
                      (key) => (
                        <option key={key} value={key}>
                          {t.systems[key]}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="field full">
                  <label>{t.modeLabel}</label>
                  <div className="toggle-row">
                    <button
                      type="button"
                      className={`toggle-btn${inputMode === "area" ? " active" : ""}`}
                      onClick={() => setInputMode("area")}
                    >
                      {t.modeArea}
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn${inputMode === "bill" ? " active" : ""}`}
                      onClick={() => setInputMode("bill")}
                    >
                      {t.modeBill}
                    </button>
                    <button
                      type="button"
                      className={`toggle-btn${inputMode === "consumption" ? " active" : ""}`}
                      onClick={() => setInputMode("consumption")}
                    >
                      {t.modeConsumption}
                    </button>
                  </div>
                </div>

                {inputMode === "area" ? (
                  <>
                    <div className="field">
                      <label>{t.areaLabel}</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={200}
                        step={50}
                        value={areaSqft}
                        onChange={(e) => {
                          setAreaSqft(e.target.value);
                          setAreaTouched(true);
                        }}
                      />
                    </div>
                    <div className="field">
                      <label>{t.vintageLabel}</label>
                      <select
                        value={vintage}
                        onChange={(e) => setVintage(e.target.value as Vintage)}
                      >
                        {(["recent", "average", "older"] as Vintage[]).map((v) => (
                          <option key={v} value={v}>
                            {t.vintages[v]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : inputMode === "bill" ? (
                  <>
                    <div className="field">
                      <label>
                        {system.fuel === "electric"
                          ? t.billLabel
                          : t.billLabelFuel(unitLabel)}
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={50}
                        value={billAmount}
                        onChange={(e) => setBillAmount(e.target.value)}
                      />
                      <p className="field-hint">
                        {system.fuel === "electric" ? t.billHint : t.billHintFuel}
                      </p>
                    </div>
                    {system.fuel === "electric" ? (
                      <>
                        <div className="field">
                          <label>{t.billYearLabel}</label>
                          <select
                            value={billYear}
                            onChange={(e) => setBillYear(Number(e.target.value))}
                          >
                            {BILL_YEARS.map((y) => (
                              <option key={y} value={y}>
                                {y}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label>{t.occupantsLabel}</label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={12}
                            step={1}
                            value={occupants}
                            onChange={(e) => setOccupants(e.target.value)}
                          />
                          <p className="field-hint">{t.occupantsHint}</p>
                        </div>
                        <div className="field">
                          <label>{t.acLabel}</label>
                          <select
                            value={acType}
                            onChange={(e) => setAcType(e.target.value as AcType)}
                          >
                            {(["none", "window", "central"] as AcType[]).map(
                              (key) => (
                                <option key={key} value={key}>
                                  {t.acTypes[key]}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                        <div className="field">
                          <label>{t.poolLabel}</label>
                          <select
                            value={poolType}
                            onChange={(e) =>
                              setPoolType(e.target.value as PoolType)
                            }
                          >
                            {(
                              ["none", "pump", "heatPump", "electric"] as PoolType[]
                            ).map((key) => (
                              <option key={key} value={key}>
                                {t.poolTypes[key]}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label>{t.spaLabel}</label>
                          <select
                            value={spaType}
                            onChange={(e) =>
                              setSpaType(e.target.value as SpaType)
                            }
                          >
                            {(["none", "summer", "yearRound"] as SpaType[]).map(
                              (key) => (
                                <option key={key} value={key}>
                                  {t.spaTypes[key]}
                                </option>
                              )
                            )}
                          </select>
                        </div>
                        {poolType !== "none" || spaType !== "none" ? (
                          <div className="field full">
                            <label>{t.poolSpaKnownLabel}</label>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={0}
                              step={100}
                              placeholder={numberFmt.format(poolSpaDefault)}
                              value={poolSpaKnown}
                              onChange={(e) => setPoolSpaKnown(e.target.value)}
                            />
                            <p className="field-hint">{t.poolSpaHint}</p>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    {breakdown ? (
                      <div className="full">
                        <div className="breakdown-card">
                          <div className="breakdown-title">
                            {t.breakdownTitle}
                          </div>
                          {breakdown.belowBaseLoad ? (
                            <p className="breakdown-warn">
                              {t.breakdownBelowBase}
                            </p>
                          ) : (
                            <>
                              <p className="breakdown-total">
                                {t.breakdownTotal(
                                  numberFmt.format(
                                    Math.round(breakdown.totalKwh)
                                  ),
                                  rateFmt.format(breakdown.effectiveRate)
                                )}
                              </p>
                              <div className="breakdown-bar">
                                {(
                                  [
                                    ["heating", breakdown.heatingKwh],
                                    ["cooling", breakdown.coolingKwh],
                                    ["poolspa", breakdown.poolSpaKwh],
                                    ["base", breakdown.baseKwh],
                                  ] as [string, number][]
                                ).map(([key, value]) =>
                                  value > 0 ? (
                                    <span
                                      key={key}
                                      className={`breakdown-seg ${key}`}
                                      style={{
                                        width: `${(value / breakdown.totalKwh) * 100}%`,
                                      }}
                                    />
                                  ) : null
                                )}
                              </div>
                              <ul className="breakdown-list">
                                <li>
                                  <span className="breakdown-dot heating" />
                                  {t.breakdownHeating} —{" "}
                                  {numberFmt.format(
                                    Math.round(breakdown.heatingKwh)
                                  )}{" "}
                                  kWh
                                </li>
                                {breakdown.coolingKwh > 0 ? (
                                  <li>
                                    <span className="breakdown-dot cooling" />
                                    {t.breakdownCooling} —{" "}
                                    {numberFmt.format(
                                      Math.round(breakdown.coolingKwh)
                                    )}{" "}
                                    kWh
                                  </li>
                                ) : null}
                                {breakdown.poolSpaKwh > 0 ? (
                                  <li>
                                    <span className="breakdown-dot poolspa" />
                                    {t.breakdownPoolSpa} —{" "}
                                    {numberFmt.format(
                                      Math.round(breakdown.poolSpaKwh)
                                    )}{" "}
                                    kWh
                                  </li>
                                ) : null}
                                <li>
                                  <span className="breakdown-dot base" />
                                  {t.breakdownBase} —{" "}
                                  {numberFmt.format(
                                    Math.round(breakdown.baseKwh)
                                  )}{" "}
                                  kWh
                                </li>
                              </ul>
                              <p className="breakdown-weather">
                                {degreeDays.source === "normals"
                                  ? t.breakdownNormalsOnly
                                  : Math.abs(breakdown.weatherRatio - 1) < 0.02
                                    ? t.breakdownWeatherNormal(billYear)
                                    : breakdown.weatherRatio < 1
                                      ? t.breakdownWeatherCold(
                                          (
                                            (1 / breakdown.weatherRatio - 1) *
                                            100
                                          ).toFixed(0),
                                          billYear
                                        )
                                      : t.breakdownWeatherMild(
                                          (
                                            (breakdown.weatherRatio - 1) *
                                            100
                                          ).toFixed(0),
                                          billYear
                                        )}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="field full">
                    <label>{t.consumptionLabel(unitLabel)}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={fuel.unit === "kWh" ? 100 : 10}
                      value={consumption}
                      onChange={(e) => setConsumption(e.target.value)}
                    />
                    <p className="field-hint">
                      {t.consumptionHint[system.fuel]}
                    </p>
                  </div>
                )}
              </div>

              <h3 className="section-title">{t.newSection}</h3>
              <div className="form-grid">
                <div className="field">
                  <label>{t.systemTypeLabel}</label>
                  <select
                    value={systemType}
                    onChange={(e) =>
                      changeSystemType(e.target.value as SystemType)
                    }
                  >
                    <option value="murale">{t.systemWall}</option>
                    <option value="centrale">{t.systemCentral}</option>
                  </select>
                </div>
                <div className="field">
                  <label>{t.modelLabel}</label>
                  <select
                    value={hpKey}
                    onChange={(e) => changeHeatPump(e.target.value as HeatPumpKey)}
                  >
                    {HP_BY_TYPE[systemType].map((key) => (
                      <option key={key} value={key}>
                        {t.models[key]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>{t.horizonLabel}</label>
                  <select
                    value={years}
                    onChange={(e) => setYears(Number(e.target.value))}
                  >
                    {HORIZONS.map((n) => (
                      <option key={n} value={n}>
                        {t.years(n)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h3 className="section-title">{t.investSection}</h3>
              <div className="form-grid">
                <div className="field">
                  <label>{t.investLabel}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={100}
                    value={investment}
                    onChange={(e) => {
                      setInvestment(e.target.value);
                      setPrefilled(false);
                    }}
                  />
                </div>
                <div className="field">
                  <label>{t.subsidyLabel}</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={100}
                    value={subsidy}
                    onChange={(e) => setSubsidy(e.target.value)}
                  />
                </div>
                <p className="field-hint full">
                  {prefilled ? t.prefilled : t.investHint}
                </p>
              </div>

              <details className="assumptions">
                <summary>{t.assumptionsTitle}</summary>
                <p className="field-hint">{t.assumptionsIntro}</p>
                <div className="form-grid">
                  <div className="field">
                    <label>{t.elecPrice}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.001}
                      min={0}
                      value={overrides.elecPrice}
                      onChange={(e) =>
                        setOverrides({ ...overrides, elecPrice: e.target.value })
                      }
                    />
                    <p className="field-hint">{t.elecPriceHint}</p>
                  </div>
                  {system.fuel === "electric" ? null : (
                    <div className="field">
                      <label>{t.fuelPrice(unitLabel)}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={0.01}
                        min={0}
                        value={overrides.fuelPrice}
                        onChange={(e) =>
                          setOverrides({ ...overrides, fuelPrice: e.target.value })
                        }
                      />
                    </div>
                  )}
                  <div className="field">
                    <label>{t.efficiency}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.01}
                      min={0.1}
                      value={overrides.efficiency}
                      onChange={(e) =>
                        setOverrides({ ...overrides, efficiency: e.target.value })
                      }
                    />
                    <p className="field-hint">
                      {system.sharesCoverage
                        ? t.efficiencyHintHp
                        : system.fuel === "electric"
                          ? t.efficiencyHintElec
                          : t.efficiencyHintFuel}
                    </p>
                  </div>
                  <div className="field">
                    <label>{t.cop}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.1}
                      min={1}
                      value={overrides.cop}
                      onChange={(e) =>
                        setOverrides({ ...overrides, cop: e.target.value })
                      }
                    />
                    <p className="field-hint">{t.copHint}</p>
                  </div>
                  <div className="field">
                    <label>{t.coverage}</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      step={5}
                      min={10}
                      max={100}
                      value={overrides.coverage}
                      onChange={(e) =>
                        setOverrides({ ...overrides, coverage: e.target.value })
                      }
                    />
                    <p className="field-hint">
                      {hp.systemType === "murale"
                        ? t.coverageHintWall
                        : t.coverageHintCentral}
                    </p>
                  </div>
                  <div className="field">
                    <label>{t.realism}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.01}
                      min={0.5}
                      max={1}
                      value={overrides.realism}
                      onChange={(e) =>
                        setOverrides({ ...overrides, realism: e.target.value })
                      }
                    />
                    <p className="field-hint">
                      {t.realismHint}
                      {projection
                        ? ` ${t.effectiveCop(
                            projection.effectiveCop.toFixed(2).replace(".", lang === "fr" ? "," : ".")
                          )}`
                        : ""}
                    </p>
                  </div>
                  <div className="field">
                    <label>{t.elecEsc}</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={0.5}
                      min={0}
                      value={overrides.elecEsc}
                      onChange={(e) =>
                        setOverrides({ ...overrides, elecEsc: e.target.value })
                      }
                    />
                  </div>
                  {system.fuel === "electric" ? null : (
                    <div className="field">
                      <label>{t.fuelEsc}</label>
                      <input
                        type="number"
                        inputMode="decimal"
                        step={0.5}
                        min={0}
                        value={overrides.fuelEsc}
                        onChange={(e) =>
                          setOverrides({ ...overrides, fuelEsc: e.target.value })
                        }
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className="link-button"
                  onClick={() => setOverrides(defaults)}
                >
                  {t.resetAssumptions}
                </button>
              </details>
            </div>

            {projection ? (
              <div className="card results-card">
                <h3
                  className="section-title"
                  style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}
                >
                  {t.resultsTitle}
                </h3>

                <div className="stat-row">
                  <div className="stat-tile">
                    <div className="stat-label">{t.statYear1}</div>
                    <div className="stat-value">
                      {currency.format(Math.round(projection.firstYearSavings))}
                    </div>
                    <div className="stat-note">{t.perYear}</div>
                  </div>
                  <div className="stat-tile">
                    <div className="stat-label">{t.statShare}</div>
                    <div className="stat-value">
                      {Math.round(projection.heatingBillReduction * 100)} %
                    </div>
                    <div className="stat-note">{t.statShareNote}</div>
                  </div>
                  <div className="stat-tile">
                    <div className="stat-label">{t.statTotal(years)}</div>
                    <div className="stat-value">
                      {currency.format(Math.round(projection.totalSavings))}
                    </div>
                    <div className="stat-note">
                      {currency.format(Math.round(projection.totalCurrent))} →{" "}
                      {currency.format(
                        Math.round(
                          projection.totalCurrent - projection.totalSavings
                        )
                      )}
                    </div>
                  </div>
                  {projection.netInvestment !== null ? (
                    <div className="stat-tile">
                      <div className="stat-label">{t.statPayback}</div>
                      <div className="stat-value">
                        {formatPayback(projection.paybackYears)}
                      </div>
                      <div className="stat-note">
                        {projection.paybackYears === null
                          ? t.paybackNeverNote
                          : t.statNet(
                              years,
                              currency.format(
                                Math.round(projection.netPosition ?? 0)
                              )
                            )}
                      </div>
                    </div>
                  ) : null}
                  {projection.co2SavedTotal >= 1000 ? (
                    <div className="stat-tile">
                      <div className="stat-label">{t.statCo2(years)}</div>
                      <div className="stat-value">
                        {numberFmt.format(
                          Math.round(projection.co2SavedTotal / 100) / 10
                        )}{" "}
                        <span className="stat-unit">{t.tonnes}</span>
                      </div>
                      <div className="stat-note">
                        {numberFmt.format(Math.round(projection.co2SavedPerYear))} kg{" "}
                        {t.perYear}
                      </div>
                    </div>
                  ) : null}
                </div>

                <SavingsChart
                  projection={projection}
                  lang={lang}
                  title={t.chartTitle}
                  subtitle={
                    projection.netInvestment !== null
                      ? t.chartSubWith
                      : t.chartSubWithout
                  }
                  seriesCurrent={t.seriesCurrent}
                  seriesHeatPump={t.seriesHeatPump}
                  crossoverLabel={t.crossover}
                  yearAxis={t.yearAxis}
                  yearsSuffix={t.yearsSuffix}
                  currency={currency}
                />

                <details className="year-table">
                  <summary>{t.tableToggle}</summary>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>{t.thYear}</th>
                          <th>{t.thCurrent}</th>
                          <th>{t.thHeatPump}</th>
                          <th>{t.thSavings}</th>
                          <th>{t.thCumulative}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projection.rows.map((row) => (
                          <tr key={row.year}>
                            <td>{row.year}</td>
                            <td>{currency.format(Math.round(row.currentCost))}</td>
                            <td>{currency.format(Math.round(row.heatPumpCost))}</td>
                            <td>{currency.format(Math.round(row.savings))}</td>
                            <td>
                              {currency.format(Math.round(row.cumulativeSavings))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>

                <h3 className="section-title">{t.summaryTitle}</h3>
                <ul className="summary-list">
                  <li>
                    {t.summaryUse(
                      `${numberFmt.format(
                        Math.round(projection.currentUnitsPerYear)
                      )} ${unitLabel}`,
                      `${numberFmt.format(
                        Math.round(projection.heatPumpKwhPerYear)
                      )} kWh${
                        projection.backupUnitsPerYear > 0
                          ? ` + ${numberFmt.format(
                              Math.round(projection.backupUnitsPerYear)
                            )} ${unitLabel}`
                          : ""
                      }`
                    )}
                  </li>
                  <li>
                    {backup === "electric"
                      ? t.summaryBackupElec
                      : t.summaryBackupFuel}
                  </li>
                  <li>{t.summaryCooling}</li>
                </ul>
                <p className="results-note">{t.disclaimer}</p>

                <div className="savings-cta">
                  <div>
                    <strong>{t.ctaTitle}</strong>
                    <p>{t.ctaText}</p>
                  </div>
                  <div className="savings-cta-actions">
                    <a className="btn-primary" href={estimateHref()}>
                      {t.ctaEstimate}
                    </a>
                    <a className="back-link" href={`tel:${PHONE_TEL}`}>
                      {t.ctaCall} — {PHONE_DISPLAY}
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card results-card">
                <div className="status hint">{t.needInput}</div>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>{t.footerNote}</span>
          <span>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> · {PHONE_DISPLAY}
          </span>
        </div>
      </footer>
    </>
  );
}

/**
 * Coût cumulé, deux séries : ne rien changer vs thermopompe (investissement
 * net inclus). Le croisement des deux courbes EST le retour sur
 * investissement — c'est le point que le client cherche.
 */
function SavingsChart({
  projection,
  lang,
  title,
  subtitle,
  seriesCurrent,
  seriesHeatPump,
  crossoverLabel,
  yearAxis,
  yearsSuffix,
  currency,
}: {
  projection: Projection;
  lang: Lang;
  title: string;
  subtitle: string;
  seriesCurrent: string;
  seriesHeatPump: string;
  crossoverLabel: string;
  yearAxis: string;
  yearsSuffix: string;
  currency: Intl.NumberFormat;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node) return;
    const update = () => setWidth(node.clientWidth || 720);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const compact = width < 520;
  const height = compact ? 260 : 320;
  const pad = {
    left: compact ? 52 : 64,
    right: compact ? 14 : 18,
    top: 26,
    bottom: 34,
  };
  const plotW = Math.max(40, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;

  // L'année 0 ancre les deux courbes : rien de dépensé d'un côté,
  // l'investissement net de l'autre.
  const netInvestment = projection.netInvestment ?? 0;
  const points = [
    { year: 0, current: 0, heatPump: netInvestment },
    ...projection.rows.map((row) => ({
      year: row.year,
      current: row.cumulativeCurrent,
      heatPump: row.cumulativeHeatPump,
    })),
  ];
  const lastYear = points[points.length - 1].year;
  const maxValue = Math.max(
    ...points.map((p) => Math.max(p.current, p.heatPump)),
    1
  );
  const niceMax = niceCeil(maxValue);

  const x = (year: number) => pad.left + (year / lastYear) * plotW;
  const y = (value: number) => pad.top + plotH - (value / niceMax) * plotH;

  const line = (key: "current" | "heatPump") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year)},${y(p[key])}`).join(" ");

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * niceMax);
  const yearStep = lastYear <= 10 ? (compact ? 2 : 1) : 5;
  const yearTicks: number[] = [];
  for (let n = 0; n <= lastYear; n += yearStep) yearTicks.push(n);
  if (yearTicks[yearTicks.length - 1] !== lastYear) yearTicks.push(lastYear);

  const payback = projection.paybackYears;
  const crossover =
    payback !== null && payback > 0 && payback <= lastYear
      ? {
          x: x(payback),
          y: y(interpolate(points, payback, "current")),
        }
      : null;

  const active = hover === null ? null : points[hover];

  function handleMove(event: React.MouseEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * lastYear);
    setHover(Math.min(points.length - 1, Math.max(0, index)));
  }

  const axisFmt = new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", {
    notation: "compact",
    maximumFractionDigits: 0,
  });

  return (
    <div className="chart-block">
      <div className="chart-head">
        <h4>{title}</h4>
        <p>{subtitle}</p>
      </div>
      <div className="chart-legend">
        <span>
          <i className="legend-dot" style={{ background: COLOR_CURRENT }} />
          {seriesCurrent}
        </span>
        <span>
          <i className="legend-dot" style={{ background: COLOR_HEATPUMP }} />
          {seriesHeatPump}
        </span>
      </div>
      <div className="chart-wrap" ref={wrapRef}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${title} — ${seriesCurrent}, ${seriesHeatPump}`}
        >
          {ticks.map((value) => (
            <g key={value}>
              <line
                x1={pad.left}
                x2={pad.left + plotW}
                y1={y(value)}
                y2={y(value)}
                stroke="#e6edf3"
                strokeWidth={1}
              />
              <text
                x={pad.left - 8}
                y={y(value) + 4}
                textAnchor="end"
                fontSize={11}
                fill="#5a6b7b"
              >
                {axisFmt.format(value)} $
              </text>
            </g>
          ))}

          {yearTicks.map((year) => (
            <text
              key={year}
              x={x(year)}
              y={height - 12}
              textAnchor={
                year === 0 ? "start" : year === lastYear ? "end" : "middle"
              }
              fontSize={11}
              fill="#5a6b7b"
            >
              {year === lastYear ? `${year} ${yearsSuffix}` : year}
            </text>
          ))}

          <path d={line("current")} fill="none" stroke={COLOR_CURRENT} strokeWidth={2} />
          <path
            d={line("heatPump")}
            fill="none"
            stroke={COLOR_HEATPUMP}
            strokeWidth={2}
          />

          {crossover ? (
            <>
              <line
                x1={crossover.x}
                x2={crossover.x}
                y1={pad.top}
                y2={pad.top + plotH}
                stroke="#0e2a43"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.45}
              />
              <circle
                cx={crossover.x}
                cy={crossover.y}
                r={5}
                fill="#0e2a43"
                stroke="#fff"
                strokeWidth={2}
              />
              {compact ? null : (
                <text
                  x={
                    crossover.x > pad.left + plotW - 120
                      ? crossover.x - 8
                      : crossover.x + 8
                  }
                  textAnchor={
                    crossover.x > pad.left + plotW - 120 ? "end" : "start"
                  }
                  y={pad.top + 12}
                  fontSize={11}
                  fill="#0e2a43"
                  fontWeight={600}
                  stroke="#fff"
                  strokeWidth={4}
                  paintOrder="stroke"
                >
                  {crossoverLabel}
                </text>
              )}
            </>
          ) : null}

          {/* Étiquettes directes : l'identité ne dépend jamais de la couleur
              seule. Trop serré sur mobile — la légende et le tableau prennent
              alors le relais. */}
          {compact ? null : (
            <>
              <text
                x={pad.left + plotW}
                y={y(points[points.length - 1].current) - 10}
                textAnchor="end"
                fontSize={12}
                fontWeight={600}
                fill="#1c2733"
                stroke="#fff"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {seriesCurrent} ·{" "}
                {currency.format(Math.round(projection.totalCurrent))}
              </text>
              <text
                x={pad.left + plotW}
                y={
                  y(points[points.length - 1].heatPump) -
                  y(points[points.length - 1].current) >
                  44
                    ? y(points[points.length - 1].heatPump) - 10
                    : y(points[points.length - 1].heatPump) + 20
                }
                textAnchor="end"
                fontSize={12}
                fontWeight={600}
                fill="#1c2733"
                stroke="#fff"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {seriesHeatPump} ·{" "}
                {currency.format(Math.round(points[points.length - 1].heatPump))}
              </text>
            </>
          )}

          {active ? (
            <>
              <line
                x1={x(active.year)}
                x2={x(active.year)}
                y1={pad.top}
                y2={pad.top + plotH}
                stroke="#9db0c0"
                strokeWidth={1}
              />
              <circle
                cx={x(active.year)}
                cy={y(active.current)}
                r={5}
                fill={COLOR_CURRENT}
                stroke="#fff"
                strokeWidth={2}
              />
              <circle
                cx={x(active.year)}
                cy={y(active.heatPump)}
                r={5}
                fill={COLOR_HEATPUMP}
                stroke="#fff"
                strokeWidth={2}
              />
            </>
          ) : null}

          <rect
            x={pad.left}
            y={pad.top}
            width={plotW}
            height={plotH}
            fill="transparent"
            onMouseMove={handleMove}
            onMouseLeave={() => setHover(null)}
          />
        </svg>

        {active ? (
          <div
            className="chart-tip"
            style={{
              left: `${Math.min(
                Math.max(x(active.year), pad.left + 60),
                pad.left + plotW - 60
              )}px`,
            }}
          >
            <strong>
              {yearAxis} {active.year}
            </strong>
            <span>
              <i className="legend-dot" style={{ background: COLOR_CURRENT }} />
              {currency.format(Math.round(active.current))}
            </span>
            <span>
              <i className="legend-dot" style={{ background: COLOR_HEATPUMP }} />
              {currency.format(Math.round(active.heatPump))}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function niceCeil(value: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  return Math.ceil(value / (magnitude / 2)) * (magnitude / 2);
}

function interpolate(
  points: { year: number; current: number; heatPump: number }[],
  year: number,
  key: "current" | "heatPump"
): number {
  const lower = Math.floor(year);
  const upper = Math.min(points.length - 1, lower + 1);
  const fraction = year - lower;
  return points[lower][key] + (points[upper][key] - points[lower][key]) * fraction;
}
