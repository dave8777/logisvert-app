// Lecture de plaque signalétique — porté de app/sales/capacity.py de
// l'application de vente DPSD. La capacité se décode surtout dans le NUMÉRO
// DE MODÈLE (036 = 3 tonnes = 36 000 BTU, GWH12 = 12 000 BTU), avec les
// mentions explicites « X TONS » / « 36,000 BTU » quand elles existent.
// Le texte OCR n'est qu'une donnée : le client confirme toujours avant
// qu'on ne s'en serve.

export type NameplateReading = {
  sizeBtu: number | null; // classe de refroidissement, en milliers
  kind: string; // minisplit | central_ac | air_handler | furnace | coil | ""
  tons: number | null;
  brand: string;
  modelGuess: string;
};

const BRANDS = [
  "GREE", "LG", "FUJITSU", "MITSUBISHI", "DAIKIN", "SAMSUNG", "SENVILLE",
  "TOSOT", "MIDEA", "BOSCH", "PANASONIC", "TOSHIBA", "CARRIER", "YORK",
  "HAIER", "TCL", "MOOVAIR", "KEEPRITE", "NAPOLEON", "SHARP", "HISENSE",
  "GOODMAN", "AMANA", "TRANE", "LENNOX", "CONTINENTAL", "DIRECT AIR",
  "KINGHOME", "ZEPHYR", "AIRTON", "CONVECTAIR", "RHEEM", "RUUD", "PAYNE",
  "BRYANT", "COLEMAN", "DUCANE", "ARMSTRONG", "COMFORTMAKER", "TEMPSTAR",
  "GRANBY", "OLSEN", "FIRST CO",
];

const KIND_HINTS: [string, string[]][] = [
  ["furnace", ["FURNACE", "FOURNAISE", "AFUE", "NATURAL GAS", "GAZ NATUREL",
    "PROPANE", "HEATING INPUT", "INPUT BTU", "MBH", "OIL FIRED", "MAZOUT"]],
  ["coil", ["CASED COIL", "EVAPORATOR COIL", "SERPENTIN"]],
  ["air_handler", ["AIR HANDLER", "FAN COIL", "VENTILO-CONVECTEUR",
    "AIR HANDLING"]],
  ["central_ac", ["CONDENSING UNIT", "CONDENSER", "UNITE DE CONDENSATION",
    "SPLIT SYSTEM AIR", "CENTRAL AIR", "HEAT PUMP OUTDOOR",
    "THERMOPOMPE CENTRALE"]],
  ["minisplit", ["MINISPLIT", "MINI-SPLIT", "ROOM AIR CONDITIONER",
    "MURALE", "WALL MOUNTED"]],
];

const KIND_MODEL_PREFIXES: [string, string[]][] = [
  ["furnace", ["GMS", "GMSS", "GMES", "GMEC", "GMVC", "GCSS", "GCES",
    "GDS8", "ML180", "ML193", "ML196", "EL280", "EL296", "SL280", "59SC",
    "59TP", "58SB", "S9X", "S8X", "TM9V", "TM8X", "TG9S", "TG8S", "G95V",
    "G96V", "P9MP", "GDH8"]],
  ["coil", ["CAPF", "CAPT", "CHPF", "CHPT", "CSCF", "CNPV", "GCAC",
    "EAM4", "EEV4", "END4"]],
  ["air_handler", ["ARUF", "AMST", "ASPT", "AVPTC", "AWUF", "FV4C",
    "TEM4", "TEM6", "FX4D", "GC1P"]],
  ["central_ac", ["GSX", "GSZ", "GSXH", "ASX", "ASZ", "DSX", "DSZ",
    "4TTR", "4TWR", "2TTR", "24ABB", "24ABC", "24ACB", "24ACC", "25HBC",
    "25HCB", "25HPB", "RA13", "RA14", "RA16", "RP14", "RP15", "XR13",
    "XR14", "XR16", "14AJM", "13AJN", "WCA3", "NXA4"]],
  ["minisplit", ["GWH", "MSZ", "MUZ", "MXZ", "ASU", "AOU", "AGU",
    "LSN", "LSU", "DLF", "DLC", "AR09", "AR12", "AR18", "AR24", "KSIV",
    "SEZ"]],
];

const BTU_EXPLICIT = /\b(9|12|18|24|30|36|42|48|54|60)[,.\s]?000\s*BTU/gi;
const BTU_BARE = /\b(9000|12000|18000|24000|30000|36000|42000|48000|54000|60000)\b/g;
const TONS = /\b([1-5](?:[.,]5)?)[\s-]*TONS?\b/gi;
const MODEL_CODE3 = /0(18|24|30|36|42|48|60)(?=[A-Z0-9-])/g;
// Le caractère après ne doit pas être V/H — sinon « 230V » se lit comme une taille.
const MODEL_EMBED = /[A-Z](0?9|12|18|24|30|36|42|48|60)(?=[A-Z0-9-])/g;
const MODEL_EMBED2 = /\d(18|24|30|36|42|48|60)(?=[A-GI-UW-Z])/g;
const MODEL_TOKEN = /\b[A-Z]{2,}[A-Z0-9/-]{4,}\b|\b\d{2}[A-Z]{2,3}[A-Z0-9/-]{3,}\b/g;

function kindFromModels(text: string): string {
  for (const [kind, prefixes] of KIND_MODEL_PREFIXES) {
    for (const p of prefixes) {
      if (new RegExp("\\b" + p).test(text)) return kind;
    }
  }
  const m = text.match(/\bGUD\w*/);
  if (m) return m[0].includes("AH") ? "air_handler" : "central_ac";
  return "";
}

export function detectCapacity(ocrText: string): NameplateReading {
  const reading: NameplateReading = {
    sizeBtu: null,
    kind: "",
    tons: null,
    brand: "",
    modelGuess: "",
  };
  if (!ocrText) return reading;
  const text = ocrText.toUpperCase();

  for (const [kind, hints] of KIND_HINTS) {
    if (hints.some((h) => text.includes(h))) {
      reading.kind = kind;
      break;
    }
  }
  if (!reading.kind) reading.kind = kindFromModels(text);

  const votes = new Map<number, number>();
  const vote = (size: number, weight: number) =>
    votes.set(size, (votes.get(size) ?? 0) + weight);

  for (const m of text.matchAll(BTU_EXPLICIT)) vote(Number(m[1]), 5);
  for (const m of text.matchAll(BTU_BARE)) vote(Number(m[1]) / 1000, 3);
  for (const m of text.matchAll(TONS)) {
    const t = Number(m[1].replace(",", "."));
    reading.tons = t;
    vote(Math.round(t * 12), 6);
  }
  for (const m of text.matchAll(MODEL_CODE3)) vote(Number(m[1]), 4);
  for (const m of text.matchAll(MODEL_EMBED)) vote(Number(m[1]), 1);
  for (const m of text.matchAll(MODEL_EMBED2)) vote(Number(m[1]), 1);

  if (reading.kind !== "furnace" && votes.size > 0) {
    let best: number | null = null;
    let bestScore = -1;
    for (const [size, score] of votes) {
      if (score > bestScore || (score === bestScore && size > (best ?? 0))) {
        best = size;
        bestScore = score;
      }
    }
    reading.sizeBtu = best;
    if (!reading.kind && reading.sizeBtu && reading.sizeBtu >= 42) {
      reading.kind = "central_ac";
    }
  }

  for (const brand of BRANDS) {
    if (new RegExp("\\b" + brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(text)) {
      reading.brand =
        brand.charAt(0) + brand.slice(1).toLowerCase();
      break;
    }
  }

  const tokens: string[] = text.match(MODEL_TOKEN) ?? [];
  if (tokens.length > 0) {
    if (reading.sizeBtu) {
      const s2 = String(reading.sizeBtu).padStart(2, "0");
      const s3 = String(reading.sizeBtu).padStart(3, "0");
      const sized = tokens.filter((t) => t.includes(s3) || t.includes(s2));
      reading.modelGuess =
        sized[0] ?? tokens.reduce((a, b) => (b.length > a.length ? b : a));
    } else {
      reading.modelGuess = tokens.reduce((a, b) => (b.length > a.length ? b : a));
    }
  }
  return reading;
}

const KIND_LABELS: Record<string, { fr: string; en: string }> = {
  minisplit: { fr: "thermopompe murale", en: "wall-mounted heat pump" },
  central_ac: { fr: "thermopompe/climatiseur central", en: "central AC / heat pump" },
  air_handler: { fr: "ventilo-convecteur", en: "air handler" },
  furnace: { fr: "fournaise", en: "furnace" },
  coil: { fr: "serpentin", en: "evaporator coil" },
};

export function describeReading(r: NameplateReading, lang: string): string {
  const fr = lang === "fr";
  const bits: string[] = [];
  if (r.kind && KIND_LABELS[r.kind]) {
    bits.push(fr ? KIND_LABELS[r.kind].fr : KIND_LABELS[r.kind].en);
  }
  if (r.brand) bits.push(r.brand);
  if (r.modelGuess) bits.push(r.modelGuess);
  if (r.sizeBtu) {
    bits.push(
      fr ? `~${r.sizeBtu} 000 BTU` : `~${r.sizeBtu},000 BTU`
    );
  }
  return bits.join(" — ");
}

/** Pré-sélection du formulaire à partir de la lecture. */
export function suggestSelection(
  r: NameplateReading
): { systemType: "murale" | "centrale"; sizeKey: string } | null {
  if (!r.sizeBtu) return null;
  const central =
    r.kind === "central_ac" ||
    r.kind === "air_handler" ||
    r.kind === "furnace" ||
    r.kind === "coil" ||
    r.sizeBtu >= 42;
  if (central) {
    const tons =
      r.sizeBtu <= 27 ? "2" : r.sizeBtu <= 39 ? "3" : r.sizeBtu <= 51 ? "4" : "5";
    return { systemType: "centrale", sizeKey: tons };
  }
  const wall = [12, 18, 24, 36].reduce((a, b) =>
    Math.abs(b - r.sizeBtu!) < Math.abs(a - r.sizeBtu!) ? b : a
  );
  return { systemType: "murale", sizeKey: `${wall}k` };
}
