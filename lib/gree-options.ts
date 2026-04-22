export type ProductLine =
  | "Airy"
  | "Clivia"
  | "Charmo"
  | "Multizone"
  | "Flexx Central"
  | "Flexx Add-On";

export type EquipmentType =
  | "Murale"
  | "Cassette"
  | "Console"
  | "Gainable"
  | "Sans conduits"
  | "Avec conduits"
  | "Mix"
  | "Air Handler"
  | "Cased Coil";

export type GreeOption = {
  id: string;
  line: ProductLine;
  equipmentType: EquipmentType;
  sizeLabel: string;
  outdoorUnit: string;
  indoorUnit: string;
  ahri: string;
};

export const GREE_OPTIONS: GreeOption[] = [
  // AIRY
  {
    id: "airy-murale-12",
    line: "Airy",
    equipmentType: "Murale",
    sizeLabel: "12k",
    outdoorUnit: "GREGWH12AVDXED6DNA1O",
    indoorUnit: "GREGWH12AVDXED6DNA1I",
    ahri: "215386290",
  },
  {
    id: "airy-murale-18",
    line: "Airy",
    equipmentType: "Murale",
    sizeLabel: "18k",
    outdoorUnit: "GREGWH18AVEXFD6DNA1O",
    indoorUnit: "GREGWH18AVEXFD6DNA1I",
    ahri: "215386340",
  },
  {
    id: "airy-cassette-12",
    line: "Airy",
    equipmentType: "Cassette",
    sizeLabel: "12k",
    outdoorUnit: "GREGWH12AVDXED6DNA1O",
    indoorUnit: "GREGKH12EBD6DNA1AI",
    ahri: "215415524",
  },
  {
    id: "airy-console-12",
    line: "Airy",
    equipmentType: "Console",
    sizeLabel: "12k",
    outdoorUnit: "GREGWH12AVDXED6DNA1O",
    indoorUnit: "GREGEH12AAD6DNA1AI",
    ahri: "216618225",
  },
  {
    id: "airy-gainable-12",
    line: "Airy",
    equipmentType: "Gainable",
    sizeLabel: "12k",
    outdoorUnit: "GREGWH12AVDXED6DNA1O",
    indoorUnit: "GREGFH12DAD6DNA1AI",
    ahri: "216618221",
  },

  // CLIVIA
  {
    id: "clivia-murale-12",
    line: "Clivia",
    equipmentType: "Murale",
    sizeLabel: "12k",
    outdoorUnit: "GREGWH12AGCXDD6DNA4O",
    indoorUnit: "GREGWH12AUCXDD6DNA2I",
    ahri: "216032436",
  },
  {
    id: "clivia-murale-18",
    line: "Clivia",
    equipmentType: "Murale",
    sizeLabel: "18k",
    outdoorUnit: "GREGWH18AGDXFD6DNA4O",
    indoorUnit: "GREGWH18AUDXFD6DNA2I",
    ahri: "216052270",
  },
  {
    id: "clivia-murale-24",
    line: "Clivia",
    equipmentType: "Murale",
    sizeLabel: "24k",
    outdoorUnit: "GREGWH24AGEXFD6DNA4O",
    indoorUnit: "GREGWH24AUDXFD6DNA2I",
    ahri: "216623541",
  },
  {
    id: "clivia-cassette-12",
    line: "Clivia",
    equipmentType: "Cassette",
    sizeLabel: "12k",
    outdoorUnit: "GREGWH12AGCXDD6DNA4O",
    indoorUnit: "GREGKH12EBD6DNA1AI",
    ahri: "216618222",
  },
  {
    id: "clivia-cassette-24",
    line: "Clivia",
    equipmentType: "Cassette",
    sizeLabel: "24k",
    outdoorUnit: "GREGWH24AGEXFD6DNA4O",
    indoorUnit: "GREGKH24ECD6DNA1AI",
    ahri: "216618217",
  },
  {
    id: "clivia-gainable-12",
    line: "Clivia",
    equipmentType: "Gainable",
    sizeLabel: "12k",
    outdoorUnit: "GREGWH12AGCXDD6DNA4O",
    indoorUnit: "GREGFH12DAD6DNA1AI",
    ahri: "216618221",
  },
  {
    id: "clivia-gainable-18",
    line: "Clivia",
    equipmentType: "Gainable",
    sizeLabel: "18k",
    outdoorUnit: "GREGWH18AGDXFD6DNA4O",
    indoorUnit: "GREGFH18DBD6DNA1AI",
    ahri: "211497195",
  },
  {
    id: "clivia-gainable-24",
    line: "Clivia",
    equipmentType: "Gainable",
    sizeLabel: "24k",
    outdoorUnit: "GREGWH24AGEXFD6DNA4O",
    indoorUnit: "GREGFH24DBD6DNA1AI",
    ahri: "216618216",
  },

  // CHARMO
  {
    id: "charmo-murale-12",
    line: "Charmo",
    equipmentType: "Murale",
    sizeLabel: "12k",
    outdoorUnit: "GREGWH12ATCXBD6DNA4O",
    indoorUnit: "GREGWH12ATCXBD6DNA4I",
    ahri: "215402236",
  },
  {
    id: "charmo-murale-18",
    line: "Charmo",
    equipmentType: "Murale",
    sizeLabel: "18k",
    outdoorUnit: "GREGWH18ATDXDD6DNA4O",
    indoorUnit: "GREGWH18ATDXDD6DNA4I",
    ahri: "215224737",
  },
  {
    id: "charmo-murale-24",
    line: "Charmo",
    equipmentType: "Murale",
    sizeLabel: "24k",
    outdoorUnit: "GREGWH24ATEXFD6DNA4O",
    indoorUnit: "GREGWH24ATEXFD6DNA4I",
    ahri: "215390442",
  },
  {
    id: "charmo-murale-36",
    line: "Charmo",
    equipmentType: "Murale",
    sizeLabel: "36k",
    outdoorUnit: "GREGWH36ATEXHD6DNA1O",
    indoorUnit: "GREGWH36ATEXHD6DNA1I",
    ahri: "214568849",
  },

  // MULTIZONE
  {
    id: "multizone-18-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "18k",
    outdoorUnit: "GREGWHD18ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931586",
  },
  {
    id: "multizone-18-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "18k",
    outdoorUnit: "GREGWHD18ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931591",
  },
  {
    id: "multizone-18-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "18k",
    outdoorUnit: "GREGWHD18ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931592",
  },
  {
    id: "multizone-24-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "24k",
    outdoorUnit: "GREGWHD24ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931587",
  },
  {
    id: "multizone-24-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "24k",
    outdoorUnit: "GREGWHD24ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931593",
  },
  {
    id: "multizone-24-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "24k",
    outdoorUnit: "GREGWHD24ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931597",
  },
  {
    id: "multizone-30-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "30k",
    outdoorUnit: "GREGWHD30ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931588",
  },
  {
    id: "multizone-30-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "30k",
    outdoorUnit: "GREGWHD30ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931594",
  },
  {
    id: "multizone-30-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "30k",
    outdoorUnit: "GREGWHD30ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931598",
  },
  {
    id: "multizone-36-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "36k",
    outdoorUnit: "GREGWHD36ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931589",
  },
  {
    id: "multizone-36-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "36k",
    outdoorUnit: "GREGWHD36ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931595",
  },
  {
    id: "multizone-36-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "36k",
    outdoorUnit: "GREGWHD36ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931599",
  },
  {
    id: "multizone-42-sans",
    line: "Multizone",
    equipmentType: "Sans conduits",
    sizeLabel: "42k",
    outdoorUnit: "GREGWHD42ND6MO",
    indoorUnit: "Appareils sans conduits",
    ahri: "214931590",
  },
  {
    id: "multizone-42-avec",
    line: "Multizone",
    equipmentType: "Avec conduits",
    sizeLabel: "42k",
    outdoorUnit: "GREGWHD42ND6MO",
    indoorUnit: "Appareils avec conduits",
    ahri: "214931596",
  },
  {
    id: "multizone-42-mix",
    line: "Multizone",
    equipmentType: "Mix",
    sizeLabel: "42k",
    outdoorUnit: "GREGWHD42ND6MO",
    indoorUnit: "Appareils mix",
    ahri: "214931600",
  },

  // FLEXX CENTRAL
  {
    id: "flexx-central-24",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "24k / 2 ton",
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGUD24AH2EDU",
    ahri: "216621482",
  },
  {
    id: "flexx-central-36-edu",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "36k / 3 ton",
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGUD36AH2EDU",
    ahri: "214568826",
  },
  {
    id: "flexx-central-36-gdu",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "36k / 3 ton",
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGUD36AH2GDU",
    ahri: "217120760",
  },
  {
    id: "flexx-central-48",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "48k / 4 ton",
    outdoorUnit: "GREGUD60W2NHEDU",
    indoorUnit: "GREGUD48AH2EDU",
    ahri: "216621484",
  },
  {
    id: "flexx-central-60",
    line: "Flexx Central",
    equipmentType: "Air Handler",
    sizeLabel: "60k / 5 ton",
    outdoorUnit: "GREGUD60W2NHEDU",
    indoorUnit: "GREGUD60AH2GDU",
    ahri: "214568857",
  },

  // FLEXX ADD-ON
  {
    id: "flexx-addon-24",
    line: "Flexx Add-On",
    equipmentType: "Cased Coil",
    sizeLabel: "24k / 2 ton",
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGCAC24FNHA",
    ahri: "216768109",
  },
  {
    id: "flexx-addon-36",
    line: "Flexx Add-On",
    equipmentType: "Cased Coil",
    sizeLabel: "36k / 3 ton",
    outdoorUnit: "GREGUD36W2NHEDU",
    indoorUnit: "GREGCAC36FNHA",
    ahri: "216765692",
  },
  {
    id: "flexx-addon-48",
    line: "Flexx Add-On",
    equipmentType: "Cased Coil",
    sizeLabel: "48k / 4 ton",
    outdoorUnit: "GREGUD60W2NHEDU",
    indoorUnit: "GREGCAC48HNHA",
    ahri: "216768110",
  },
  {
    id: "flexx-addon-60",
    line: "Flexx Add-On",
    equipmentType: "Cased Coil",
    sizeLabel: "60k / 5 ton",
    outdoorUnit: "GREGUD60W2NHEDU",
    indoorUnit: "GREGCAC60HNHA",
    ahri: "216765694",
  },
];

export const LINE_ORDER: ProductLine[] = [
  "Airy",
  "Clivia",
  "Charmo",
  "Multizone",
  "Flexx Central",
  "Flexx Add-On",
];
