"use client";

import { useMemo, useState } from "react";

type ProductLine =
  | "Airy"
  | "Clivia"
  | "Charmo"
  | "Multizone"
  | "Flexx Central"
  | "Flexx Add-On";

type EquipmentType =
  | "Murale"
  | "Cassette"
  | "Console"
  | "Gainable"
  | "Sans conduits"
  | "Avec conduits"
  | "Mix"
  | "Air Handler"
  | "Cased Coil";

type RebateOption = {
  id: string;
  line: ProductLine;
  equipmentType: EquipmentType;
  sizeLabel: string;
  btu35C: number;
  btuNeg8C: number;
  outdoorUnit: string;
  indoorUnit: string;
  ahri: string;
  rebate: number;
  energyStar?: string;
  coldClimate?: boolean;
};

const CURRENCY = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const DATA: RebateOption[] = [
  // AIRY
  {
    id: "airy-murale-12",
    line: "Airy",
    equipmentType: "Murale",
    sizeLabel: "12k",
    btu35C: 12000,
    btuNeg8C: 10300,
    outdoorUnit: "GREGWH12AVDXED6DNA1O",
    indoorUnit: "GREGWH12AVDXED6DNA1I",
    ahri: "215386290",
    rebate: 1236,
    energyStar: "3,621,214",
    coldClimate: true,
  },
  {
    id: "airy-murale-18",
    line: "Airy",
    equipmentType: "Murale",
    sizeLabel: "18k",
    btu35C: 18000,
    btuNeg8C: 15500,
    outdoorUnit: "GREGWH18AVEXFD6DNA1O",
    indoorUnit: "GREGWH18AVEXFD6DNA1I",
    ahri: "215386340",
    rebate: 1860,
    energyStar: "3,621,215",
    coldClimate: true,
  },
  {
    id: "airy-cassette-12",
    line: "Airy",
    equipmentType: "Cassette",
    sizeLabel: "12k",
    btu35C: 12000,
    btuNeg8C: 10300,
    outdoorUnit: "GREGWH12AVDXED6DNA1O",
    indoorUnit: "GREGKH12EBD6DNA1AI",
    ahri: "215415524",
    rebate: 1236,
    energyStar: "4,439,239",
    coldClimate: true,
  },
  {
    id: "airy-console-12",
    line: "Airy",
    equipmentType: "Console",
    sizeLabel: "12k",
    btu35C: 12000,
    btuNeg8C: 10300,
    outdoorUnit: "GREGWH12AVDXED6DNA1O",
    indoorUnit: "GREGEH12AAD6DNA1AI",
    ahri: "216618225",
    rebate: 1236,
    energyStar: "4,511,760",
    coldClimate: true,
  },
  {
    id: "airy-gainable-12",
    line: "Airy",
    equipmentType: "Gainable",
    sizeLabel: "12k",
    btu35C: 12000,
    btuNeg8C: 10300,
    outdoorUnit: "GREGWH12AVDXED6DNA1O",
    indoorUnit: "GREGFH12DAD6DNA1AI",
    ahri: "216618221",
    rebate: 1236,
    energyStar: "4,511,756",
    coldClimate: true,
  },

  // CLIVIA
  {
    id: "clivia-murale-12",
    line: "Clivia",
    equipmentType: "Murale",
    sizeLabel: "12k",
    btu35C: 12000,
    btuNeg8C: 7700,
    outdoorUnit: "GREGWH12AGCXDD6DNA4O",
    indoorUnit: "GREGWH12AUCXDD6DNA2I",
    ahri: "216032436",
    rebate: 924,
    energyStar: "3,723,379",
    coldClimate: true,
  },
  {
    id: "clivia-murale-18",
    line: "Clivia",
    equipmentType: "Murale",
    sizeLabel: "18k",
    btu35C: 18000,
    btuNeg8C: 14700,
    outdoorUnit: "GREGWH18AGDXFD6DNA4O",
    indoorUnit: "GREGWH18AUDXFD6DNA2I",
    ahri: "216052270",
    rebate: 1764,
    energyStar: "3,799,051",
    coldClimate: true,
  },
  {
    id: "clivia-murale-24",
    line: "Clivia",
    equipmentType: "Murale",
    sizeLabel: "24k",
    btu35C: 22000,
    btuNeg8C: 19000,
    outdoorUnit: "GREGWH24AGEXFD6DNA4O",
    indoorUnit: "GREGWH24AUDXFD6DNA2I",
    ahri: "216623541",
    rebate: 2280,
    energyStar: "3,893,642",
    coldClimate: true,
  },
  {
    id: "clivia-cassette-12",
    line: "Clivia",
    equipmentType: "Cassette",
    sizeLabel: "12k",
    btu35C: 12000,
    btuNeg8C: 10300,
    outdoorUnit: "GREGWH12AGCXDD6DNA4O",
    indoorUnit: "GREGKH12EBD6DNA1AI",
    ahri: "216618222",
    rebate: 1236,
    energyStar: "4,511,757",
    coldClimate: true,
  },
  {
    id: "clivia-cassette-24",
    line: "Clivia",
    equipmentType: "Cassette",
    sizeLabel: "24k",
    btu35C: 22000,
    btuNeg8C: 19400,
    outdoorUnit: "GREGWH24AGEXFD6DNA4O",
    indoorUnit: "GREGKH24ECD6DNA1AI",
    ahri: "216618217",
    rebate: 2328,
    energyStar: "4,511,738",
    coldClimate: true,
  },
  {
    id: "clivia-gainable-12",
    line: "Clivia",
    equipmentType: "Gainable",
    sizeLabel: "12k",
    btu35C: 12000,
    btuNeg8C: 10300,
    outdoorUnit: "GREGWH12AGCXDD6DNA4O",
    indoorUnit: "GREGFH12DAD6DNA1AI",
    ahri: "216618221",
    rebate: 1236,
    energyStar: "4,511,756",
    coldClimate: true,
  },
  {
    id: "clivia-gainable-18",
    line: "Clivia",
    equipmentType: "Gainable",
    sizeLabel: "18k",
    btu35C: 18000,
    btuNeg8C: 14600,
    outdoorUnit: "GREGWH18AGDXFD6DNA4O",
    indoorUnit: "GREGFH18DBD6DNA1AI",
    ahri: "211497195",
    rebate: 730,
    energyStar: "4,511,817",
    coldClimate: true,
  },
  {
    id: "clivia-gainable-24",
    line: "Clivia",
    equipmentType: "Gainable",
    sizeLabel: "24k",
    btu35C: 22000,
    btuNeg8C: 19800,
    outdoorUnit: "GREGWH24AGEXFD6DNA4O",
    indoorUnit: "GREGFH24DBD6DNA1AI",
    ahri: "216618216",
    rebate: 2376,
    energyStar: "4,511,737",
    coldClimate: true,
  },

  // CHARMO
  {
    id: "charmo-murale-12",
    line: "Charmo",
    equipmentType: "Murale",
    sizeLabel: "12k",
    btu35C: 12000,
    btuNeg8C: 9700,
    outdoorUnit: "GREGWH12ATCXBD6DNA4O",
    indoorUnit: "GREGWH12ATCXBD6DNA4I",
    ahri: "215402236",
    rebate: 1164,
    energyStar: "4,428,974",
    coldClimate: true,
  },
  {
    id: "charmo-murale-18",
    line: "Charmo",
    equipmentType: "Murale",
    sizeLabel: "18k",
    btu35C: 18000,
    btuNeg8C: 15300,
    outdoorUnit: "GREGWH18ATDXDD6DNA4O",
    indoorUnit: "GREGWH18ATDXDD6DNA4I",
    ahri: "215224737",
    rebate: 1836,
    energyStar: "4,511,818",
    coldClimate: true,
  },
  {
    id: "charmo-murale-24",
    line: "Charmo",
    equipmentType: "Murale",
    sizeLabel: "24k",
    btu35C: 24000,
    btuNeg8C: 19200,
    outdoorUnit: "GREGWH24ATEXFD6DNA4O",
    indoorUnit: "GREGWH24ATEXFD6DNA4I",
    ahri: "215390442",
    rebate: 2304,
    energyStar: "4,511,761",
    coldClimate: true,
  },
  {
    id: "charmo-murale-36",
    line: "Charmo",
    equipmentType: "Murale",
    sizeLabel: "36k",
    btu35C: 33600,
    btuNeg8C: 27400,
    outdoorUnit: "GREGWH36ATEXHD6DNA1O",
    indoorUnit: "GREGWH36ATEXHD6DNA1I",
    ahri: "214568849",
    rebate: 3288,
    energyStar: "3,995,598",
    coldClimate: true,
  },

  // MULTIZONE
  {
    id: "multizone-18-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "18k",
    btu35C: 18000,
    btuNeg8C: 17600,
    outdoorUnit: "GREGWHD18ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931586",
    rebate: 2112,
    energyStar: "3,554,366",
    coldClimate: true,
  },
  {
    id: "multizone-18-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "18k",
    btu35C: 18000,
    btuNeg8C: 17600,
    outdoorUnit: "GREGWHD18ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931591",
    rebate: 2112,
    energyStar: "3,554,371",
    coldClimate: true,
  },
  {
    id: "multizone-18-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "18k",
    btu35C: 18000,
    btuNeg8C: 17600,
    outdoorUnit: "GREGWHD18ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931592",
    rebate: 2112,
    energyStar: "3,554,372",
    coldClimate: true,
  },
  {
    id: "multizone-24-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "24k",
    btu35C: 24000,
    btuNeg8C: 23600,
    outdoorUnit: "GREGWHD24ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931587",
    rebate: 2832,
    energyStar: "3,554,368",
    coldClimate: true,
  },
  {
    id: "multizone-24-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "24k",
    btu35C: 24000,
    btuNeg8C: 22000,
    outdoorUnit: "GREGWHD24ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931593",
    rebate: 2640,
    energyStar: "3,554,373",
    coldClimate: true,
  },
  {
    id: "multizone-24-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "24k",
    btu35C: 24000,
    btuNeg8C: 23000,
    outdoorUnit: "GREGWHD24ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931597",
    rebate: 2760,
    energyStar: "3,554,376",
    coldClimate: true,
  },
  {
    id: "multizone-30-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "30k",
    btu35C: 28400,
    btuNeg8C: 28000,
    outdoorUnit: "GREGWHD30ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931588",
    rebate: 3360,
    energyStar: "3,554,369",
    coldClimate: true,
  },
  {
    id: "multizone-30-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "30k",
    btu35C: 28400,
    btuNeg8C: 27200,
    outdoorUnit: "GREGWHD30ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931594",
    rebate: 3264,
    energyStar: "3,554,374",
    coldClimate: true,
  },
  {
    id: "multizone-30-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "30k",
    btu35C: 28400,
    btuNeg8C: 27600,
    outdoorUnit: "GREGWHD30ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931598",
    rebate: 3312,
    energyStar: "3,554,379",
    coldClimate: true,
  },
  {
    id: "multizone-36-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "36k",
    btu35C: 36000,
    btuNeg8C: 36000,
    outdoorUnit: "GREGWHD36ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931589",
    rebate: 4320,
    energyStar: "3,554,367",
    coldClimate: true,
  },
  {
    id: "multizone-36-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "36k",
    btu35C: 36000,
    btuNeg8C: 36000,
    outdoorUnit: "GREGWHD36ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931595",
    rebate: 4320,
    energyStar: "3,554,375",
    coldClimate: true,
  },
  {
    id: "multizone-36-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "36k",
    btu35C: 36000,
    btuNeg8C: 36000,
    outdoorUnit: "GREGWHD36ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931599",
    rebate: 4320,
    energyStar: "3,554,377",
    coldClimate: true,
  },
  {
    id: "multizone-42-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "42k",
    btu35C: 42000,
    btuNeg8C: 44500,
    outdoorUnit: "GREGWHD42ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931590",
    rebate: 5340,
    energyStar: "3,554,370",
    coldClimate: true,
  },
  {
    id: "multizone-42-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "42k",
    btu35C: 42000,
    btuNeg8C: 44500,
    outdoorUnit: "GREGWHD42ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931596",
    rebate: 5340,
    energyStar: "3,554,378",
    coldClimate: true,
  },
  {
    id: "multizone-42-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "42k",
    btu35C: 42000,
    btuNeg8C: 44500,
    outdoorUnit: "GREGWHD42ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931600",
    rebate: 5340,
    energyStar: "3,554,380",
    coldClimate: true,
  },

  // FLEXX CENTRAL
  {
    id: "flexx-central-24",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "24k / 2 ton",
    btu35C: 24000,
    btuNeg8C: 20600,
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGUD24AH2EDU",
    ahri: "216621482",
    rebate: 2472,
    energyStar: "3,942,677",
    coldClimate: true,
  },
  {
    id: "flexx-central-36-edu",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "36k / 3 ton",
    btu35C: 34000,
    btuNeg8C: 28200,
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGUD36AH2EDU",
    ahri: "214568826",
    rebate: 3384,
    energyStar: "3,436,596",
    coldClimate: true,
  },
  {
    id: "flexx-central-36-gdu",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "36k / 3 ton",
    btu35C: 34000,
    btuNeg8C: 28200,
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGUD36AH2GDU",
    ahri: "217120760",
    rebate: 3384,
    energyStar: "4,006,778",
    coldClimate: true,
  },
  {
    id: "flexx-central-48",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "48k / 4 ton",
    btu35C: 48000,
    btuNeg8C: 39500,
    outdoorUnit: "GREGUD60W2NHEDU",
    indoorUnit: "GREGUD48AH2EDU",
    ahri: "216621484",
    rebate: 4740,
    energyStar: "3,942,618",
    coldClimate: true,
  },
  {
    id: "flexx-central-60",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "60k / 5 ton",
    btu35C: 53000,
    btuNeg8C: 45000,
    outdoorUnit: "GREGUD60W2NHEDU",
    indoorUnit: "GREGUD60AH2GDU",
    ahri: "214568857",
    rebate: 5400,
    energyStar: "3,436,893",
    coldClimate: true,
  },

  // FLEXX ADD-ON
  {
    id: "flexx-addon-24",
    line: "Flexx Add-On",
    equipmentType: "Cased Coil",
    sizeLabel: "24k / 2 ton",
    btu35C: 23000,
    btuNeg8C: 15000,
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGCAC24FNHA",
    ahri: "216768109",
    rebate: 1800,
    energyStar: "4,437,974",
    coldClimate: true,
  },
  {
    id: "flexx-addon-36",
    line: "Flexx Add-On",
    equipmentType: "Cased Coil",
    sizeLabel: "36k / 3 ton",
    btu35C: 32000,
    btuNeg8C: 22000,
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGCAC36FNHA",
    ahri: "216765692",
    rebate: 2640,
    energyStar: "4,437,972",
    coldClimate: true,
  },
  {
    id: "flexx-addon-48",
    line: "Flexx Add-On",
    equipmentType: "Cased Coil",
    sizeLabel: "48k / 4 ton",
    btu35C: 47000,
    btuNeg8C: 35200,
    outdoorUnit: "GREGUD60W2NHEDU",
    indoorUnit: "GREGCAC48HNHA",
    ahri: "216768110",
    rebate: 4224,
    energyStar: "4,498,346",
    coldClimate: true,
  },
  {
    id: "flexx-addon-60",
    line: "Flexx Add-On",
    equipmentType: "Cased Coil",
    sizeLabel: "60k / 5 ton",
    btu35C: 52000,
    btuNeg8C: 40000,
    outdoorUnit: "GREGUD60W2NHEDU",
    indoorUnit: "GREGCAC60HNHA",
    ahri: "216765694",
    rebate: 4800,
    energyStar: "4,498,347",
    coldClimate: true,
  },
];

const LINE_ORDER: ProductLine[] = [
  "Airy",
  "Clivia",
  "Charmo",
  "Multizone",
  "Flexx Central",
  "Flexx Add-On",
];

export default function Page() {
  const [selectedLine, setSelectedLine] = useState<ProductLine>("Charmo");
  const [selectedType, setSelectedType] = useState<EquipmentType | "">("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  const lineOptions = useMemo(
    () => DATA.filter((item) => item.line === selectedLine),
    [selectedLine]
  );

  const equipmentTypes = useMemo(() => {
    return [...new Set(lineOptions.map((item) => item.equipmentType))];
  }, [lineOptions]);

  const sizeOptions = useMemo(() => {
    return [
      ...new Set(
        lineOptions
          .filter((item) => !selectedType || item.equipmentType === selectedType)
          .map((item) => item.sizeLabel)
      ),
    ];
  }, [lineOptions, selectedType]);

  const matchingOptions = useMemo(() => {
    return lineOptions.filter((item) => {
      const typeMatch = !selectedType || item.equipmentType === selectedType;
      const sizeMatch = !selectedSize || item.sizeLabel === selectedSize;
      return typeMatch && sizeMatch;
    });
  }, [lineOptions, selectedType, selectedSize]);

  const selectedOption = matchingOptions.length === 1 ? matchingOptions[0] : null;

  const handleLineChange = (line: ProductLine) => {
    setSelectedLine(line);
    setSelectedType("");
    setSelectedSize("");
  };

  const showTypeDropdown = !["Flexx Central", "Flexx Add-On"].includes(selectedLine);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold md:text-3xl">
            Calculateur Subvention Gree
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Sélectionne la gamme, le type d’équipement et la capacité. Le numéro
            AHRI est trouvé automatiquement.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Gamme de produit
              </label>
              <select
                value={selectedLine}
                onChange={(e) => handleLineChange(e.target.value as ProductLine)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
              >
                {LINE_ORDER.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            </div>

            {showTypeDropdown && (
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Type d’équipement
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value as EquipmentType);
                    setSelectedSize("");
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
                >
                  <option value="">Choisir</option>
                  {equipmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Capacité
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
              >
                <option value="">Choisir</option>
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            {!selectedSize ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Fais une sélection complète pour afficher la subvention exacte.
              </div>
            ) : matchingOptions.length === 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-700">
                  Aucun modèle admissible trouvé
                </p>
                <p className="mt-1 text-sm text-red-600">
                  Cette combinaison ne semble pas être admissible selon la liste.
                </p>
              </div>
            ) : matchingOptions.length > 1 && !selectedOption ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-800">
                  Plusieurs options trouvées
                </p>
                <p className="mt-1 text-sm text-amber-700">
                  Choisis un type ou une capacité plus précise.
                </p>

                <div className="mt-4 space-y-3">
                  {matchingOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedType(item.equipmentType);
                        setSelectedSize(item.sizeLabel);
                      }}
                      className="w-full rounded-xl border border-amber-200 bg-white p-4 text-left transition hover:border-amber-400"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="font-semibold">
                            {item.line} · {item.equipmentType} · {item.sizeLabel}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            AHRI: {item.ahri}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-slate-900">
                          {CURRENCY.format(item.rebate)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : selectedOption ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                      Subvention possible
                    </p>
                    <h2 className="mt-1 text-3xl font-bold text-emerald-900">
                      {CURRENCY.format(selectedOption.rebate)}
                    </h2>
                    <p className="mt-2 text-sm text-emerald-800">
                      {selectedOption.line} · {selectedOption.equipmentType} ·{" "}
                      {selectedOption.sizeLabel}
                    </p>
                  </div>

                  <div className="rounded-xl bg-white px-4 py-3 shadow-sm">
                    <div className="text-xs font-semibold uppercase text-slate-500">
                      AHRI
                    </div>
                    <div className="text-lg font-bold">{selectedOption.ahri}</div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <InfoCard
                    label="Unité extérieure"
                    value={selectedOption.outdoorUnit}
                  />
                  <InfoCard
                    label="Unité intérieure"
                    value={selectedOption.indoorUnit}
                  />
                  <InfoCard
                    label="Capacité à 35°C"
                    value={`${selectedOption.btu35C.toLocaleString()} BTU`}
                  />
                  <InfoCard
                    label="Capacité à -8°C"
                    value={`${selectedOption.btuNeg8C.toLocaleString()} BTU`}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">Résumé des règles</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Gree seulement</li>
            <li>• AHRI trouvé automatiquement</li>
            <li>• Flexx Central et Flexx Add-On sont séparés</li>
            <li>• Pas besoin d’entrer le numéro AHRI manuellement</li>
            <li>• Si une combinaison n’est pas dans la liste, on ne l’affiche pas</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 break-all text-sm font-medium text-slate-900">
        {value}
      </div>
    </div>
  );
  }
