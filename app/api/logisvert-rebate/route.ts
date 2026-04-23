type Category = "Wall Mount" | "Multi-Zone" | "Central";
type Series = "CHARMO" | "CLIVIA" | "AIRY" | "MULTI" | "FLEXX";
type CentralConfig = "Air Handler" | "Cased Coil";

type SystemItem = {
  id: string;
  series: Series;
  category: Category;
  label: string;
  btu: string;
  outdoorUnit?: string;
  indoorUnit?: string;
  ahri: string;
  rebate: number;
  centralConfig?: CentralConfig;
};

const systems: SystemItem[] = [
  // WALL MOUNT
  {
    id: "charmo-12",
    series: "CHARMO",
    category: "Wall Mount",
    label: "CHARMO 12k",
    btu: "12000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "charmo-18",
    series: "CHARMO",
    category: "Wall Mount",
    label: "CHARMO 18k",
    btu: "18000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "charmo-24",
    series: "CHARMO",
    category: "Wall Mount",
    label: "CHARMO 24k",
    btu: "24000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "charmo-36",
    series: "CHARMO",
    category: "Wall Mount",
    label: "CHARMO 36k",
    btu: "36000",
    ahri: "",
    rebate: 0,
  },

  {
    id: "clivia-12",
    series: "CLIVIA",
    category: "Wall Mount",
    label: "CLIVIA 12k",
    btu: "12000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "clivia-18",
    series: "CLIVIA",
    category: "Wall Mount",
    label: "CLIVIA 18k",
    btu: "18000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "clivia-24",
    series: "CLIVIA",
    category: "Wall Mount",
    label: "CLIVIA 24k",
    btu: "24000",
    ahri: "",
    rebate: 0,
  },

  {
    id: "airy-12",
    series: "AIRY",
    category: "Wall Mount",
    label: "AIRY 12k",
    btu: "12000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "airy-18",
    series: "AIRY",
    category: "Wall Mount",
    label: "AIRY 18k",
    btu: "18000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "airy-24",
    series: "AIRY",
    category: "Wall Mount",
    label: "AIRY 24k",
    btu: "24000",
    ahri: "",
    rebate: 0,
  },

  // MULTI-ZONE
  {
    id: "multi-18-ductless",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 18k Sans conduits",
    btu: "18000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-18-ducted",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 18k Avec conduits",
    btu: "18000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-18-mix",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 18k Mix",
    btu: "18000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-24-ductless",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 24k Sans conduits",
    btu: "24000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-24-ducted",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 24k Avec conduits",
    btu: "24000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-24-mix",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 24k Mix",
    btu: "24000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-30-ductless",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 30k Sans conduits",
    btu: "30000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-30-ducted",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 30k Avec conduits",
    btu: "30000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-30-mix",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 30k Mix",
    btu: "30000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-36-ductless",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 36k Sans conduits",
    btu: "36000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-36-ducted",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 36k Avec conduits",
    btu: "36000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-36-mix",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 36k Mix",
    btu: "36000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-42-ductless",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 42k Sans conduits",
    btu: "42000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-42-ducted",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 42k Avec conduits",
    btu: "42000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "multi-42-mix",
    series: "MULTI",
    category: "Multi-Zone",
    label: "MULTI 42k Mix",
    btu: "42000",
    ahri: "",
    rebate: 0,
  },

  // CENTRAL - AIR HANDLER
  {
    id: "flexx-ah-24",
    series: "FLEXX",
    category: "Central",
    centralConfig: "Air Handler",
    label: "FLEXX 24k",
    btu: "24000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "flexx-ah-36",
    series: "FLEXX",
    category: "Central",
    centralConfig: "Air Handler",
    label: "FLEXX 36k",
    btu: "36000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "flexx-ah-48",
    series: "FLEXX",
    category: "Central",
    centralConfig: "Air Handler",
    label: "FLEXX 48k",
    btu: "48000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "flexx-ah-60",
    series: "FLEXX",
    category: "Central",
    centralConfig: "Air Handler",
    label: "FLEXX 60k",
    btu: "60000",
    ahri: "",
    rebate: 0,
  },

  // CENTRAL - CASED COIL
  {
    id: "flexx-cc-24",
    series: "FLEXX",
    category: "Central",
    centralConfig: "Cased Coil",
    label: "FLEXX 24k",
    btu: "24000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "flexx-cc-36",
    series: "FLEXX",
    category: "Central",
    centralConfig: "Cased Coil",
    label: "FLEXX 36k",
    btu: "36000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "flexx-cc-48",
    series: "FLEXX",
    category: "Central",
    centralConfig: "Cased Coil",
    label: "FLEXX 48k",
    btu: "48000",
    ahri: "",
    rebate: 0,
  },
  {
    id: "flexx-cc-60",
    series: "FLEXX",
    category: "Central",
    centralConfig: "Cased Coil",
    label: "FLEXX 60k",
    btu: "60000",
    ahri: "",
    rebate: 0,
  },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const id = searchParams.get("id");
  const series = searchParams.get("series");
  const category = searchParams.get("category");
  const centralConfig = searchParams.get("centralConfig");

  let filtered = systems;

  if (id) {
    const match = systems.find((item) => item.id === id);

    if (!match) {
      return Response.json(
        { error: "System not found" },
        { status: 404 }
      );
    }

    return Response.json({
      updated: new Date().toISOString().slice(0, 10),
      count: 1,
      system: match,
    });
  }

  if (series) {
    filtered = filtered.filter((item) => item.series === series);
  }

  if (category) {
    filtered = filtered.filter((item) => item.category === category);
  }

  if (centralConfig) {
    filtered = filtered.filter(
      (item) => item.centralConfig === centralConfig
    );
  }

  return Response.json({
    updated: new Date().toISOString().slice(0, 10),
    count: filtered.length,
    systems: filtered,
  });
}
