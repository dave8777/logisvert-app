'use client'

import { useEffect, useMemo, useState } from "react"

type ModelRow = {
  series: string
  type: string
  size: string
  outdoor: string
  indoor: string
  ahri: string
  rebate: number | null
}

const GREE_MODELS: ModelRow[] = [
  // AIRY
  { series: "Airy", type: "Murale", size: "9k", outdoor: "GREGWH09AVDXED6DNA1O", indoor: "GREGWH09AVDXED6DNA1I", ahri: "215385452", rebate: null },
  { series: "Airy", type: "Murale", size: "12k", outdoor: "GREGWH12AVDXED6DNA1O", indoor: "GREGWH12AVDXED6DNA1I", ahri: "215386290", rebate: 1236 },
  { series: "Airy", type: "Murale", size: "18k", outdoor: "GREGWH18AVEXFD6DNA1O", indoor: "GREGWH18AVEXFD6DNA1I", ahri: "215386340", rebate: 1860 },
  { series: "Airy", type: "Murale", size: "24k", outdoor: "GREGWH24AVEXHD6DNA1O", indoor: "GREGWH24AVEXHD6DNA1I", ahri: "215278609", rebate: null },

  { series: "Airy", type: "Cassette", size: "12k", outdoor: "GREGWH12AVDXED6DNA1O", indoor: "GREGKH12EBD6DNA1AI", ahri: "215415524", rebate: 1236 },
  { series: "Airy", type: "Cassette", size: "18k", outdoor: "GREGWH18AVEXFD6DNA1O", indoor: "GREGKH18EBD6DNA1AI", ahri: "216618236", rebate: null },
  { series: "Airy", type: "Cassette", size: "24k", outdoor: "GREGWH24AVEXHD6DNA1O", indoor: "GREGKH24ECD6DNA1AI", ahri: "216618243", rebate: null },

  { series: "Airy", type: "Console", size: "9k", outdoor: "GREGWH09AVDXED6DNA1O", indoor: "GREGEH09AAD6DNA1AI", ahri: "216618230", rebate: null },
  { series: "Airy", type: "Console", size: "12k", outdoor: "GREGWH12AVDXED6DNA1O", indoor: "GREGEH12AAD6DNA1AI", ahri: "216618225", rebate: 1236 },
  { series: "Airy", type: "Console", size: "18k", outdoor: "GREGWH18AVEXFD6DNA1O", indoor: "GREGEH18AAD6DNA1AI", ahri: "217549987", rebate: null },

  { series: "Airy", type: "Gainable", size: "9k", outdoor: "GREGWH09AVDXED6DNA1O", indoor: "GREGFH09DAD6DNA1AI", ahri: "216618226", rebate: null },
  { series: "Airy", type: "Gainable", size: "12k", outdoor: "GREGWH12AVDXED6DNA1O", indoor: "GREGFH12DAD6DNA1AI", ahri: "216618221", rebate: 1236 },
  { series: "Airy", type: "Gainable", size: "18k", outdoor: "GREGWH18AVEXFD6DNA1O", indoor: "GREGFH18DBD6DNA1AI", ahri: "216618234", rebate: null },
  { series: "Airy", type: "Gainable", size: "24k", outdoor: "GREGWH24AVEXHD6DNA1O", indoor: "GREGFH24DBD6DNA1AI", ahri: "", rebate: null },

  // CLIVIA
  { series: "Clivia", type: "Murale", size: "9k", outdoor: "GREGWH09AGCXDD6DNA4O", indoor: "GREGWH09AUCXDD6DNA2I", ahri: "216032435", rebate: null },
  { series: "Clivia", type: "Murale", size: "12k", outdoor: "GREGWH12AGCXDD6DNA4O", indoor: "GREGWH12AUCXDD6DNA2I", ahri: "216032436", rebate: 924 },
  { series: "Clivia", type: "Murale", size: "18k", outdoor: "GREGWH18AGDXFD6DNA4O", indoor: "GREGWH18AUDXFD6DNA2I", ahri: "216052270", rebate: 1764 },
  { series: "Clivia", type: "Murale", size: "24k", outdoor: "GREGWH24AGEXFD6DNA4O", indoor: "GREGWH24AUDXFD6DNA2I", ahri: "216623541", rebate: 2280 },

  { series: "Clivia", type: "Murale Anthracite", size: "12k", outdoor: "GREGWH12AGCXDD6DNA4O", indoor: "GREGWH12AUCXDD6DNA2DIB", ahri: "", rebate: null },
  { series: "Clivia", type: "Murale Anthracite", size: "18k", outdoor: "GREGWH18AGDXFD6DNA4O", indoor: "GREGWH18AUDXFD6DNA2CIB", ahri: "", rebate: null },

  { series: "Clivia", type: "Cassette", size: "12k", outdoor: "GREGWH12AGCXDD6DNA4O", indoor: "GREGKH12EBD6DNA1AI", ahri: "216618222", rebate: 1236 },
  { series: "Clivia", type: "Cassette", size: "18k", outdoor: "GREGWH18AGDXFD6DNA4O", indoor: "GREGKH18EBD6DNA1AI", ahri: "216618235", rebate: null },
  { series: "Clivia", type: "Cassette", size: "24k", outdoor: "GREGWH24AGEXFD6DNA4O", indoor: "GREGKH24ECD6DNA1AI", ahri: "216618217", rebate: 2328 },

  { series: "Clivia", type: "Console", size: "9k", outdoor: "GREGWH09AGCXDD6DNA4O", indoor: "GREGEH09AAD6DNA1AI", ahri: "216618209", rebate: null },
  { series: "Clivia", type: "Console", size: "12k", outdoor: "GREGWH12AGCXDD6DNA4O", indoor: "GREGEH12AAD6DNA1AI", ahri: "216618215", rebate: null },
  { series: "Clivia", type: "Console", size: "18k", outdoor: "GREGWH18AGDXFD6DNA4O", indoor: "GREGEH18AAD6DNA1AI", ahri: "216618233", rebate: null },

  { series: "Clivia", type: "Gainable", size: "9k", outdoor: "GREGWH09AGCXDD6DNA4O", indoor: "GREGFH09DAD6DNA1AI", ahri: "216618210", rebate: null },
  { series: "Clivia", type: "Gainable", size: "12k", outdoor: "GREGWH12AGCXDD6DNA4O", indoor: "GREGFH12DAD6DNA1AI", ahri: "216618221", rebate: 1236 },
  { series: "Clivia", type: "Gainable", size: "18k", outdoor: "GREGWH18AGDXFD6DNA4O", indoor: "GREGFH18DBD6DNA1AI", ahri: "211497195", rebate: 730 },
  { series: "Clivia", type: "Gainable", size: "24k", outdoor: "GREGWH24AGEXFD6DNA4O", indoor: "GREGFH24DBD6DNA1AI", ahri: "216618216", rebate: 2376 },

  // CHARMO
  { series: "Charmo", type: "Murale", size: "9k", outdoor: "GREGWH09ATCXBD6DNA4O", indoor: "GREGWH09ATCXBD6DNA4I", ahri: "215386291", rebate: null },
  { series: "Charmo", type: "Murale", size: "12k", outdoor: "GREGWH12ATCXBD6DNA4O", indoor: "GREGWH12ATCXBD6DNA4I", ahri: "215402236", rebate: 1164 },
  { series: "Charmo", type: "Murale", size: "18k", outdoor: "GREGWH18ATDXDD6DNA4O", indoor: "GREGWH18ATDXDD6DNA4I", ahri: "215224737", rebate: 1836 },
  { series: "Charmo", type: "Murale", size: "24k", outdoor: "GREGWH24ATEXFD6DNA4O", indoor: "GREGWH24ATEXFD6DNA4I", ahri: "215390442", rebate: 2304 },
  { series: "Charmo", type: "Murale", size: "30k", outdoor: "GREGWH30ATEXHD6DNA1O", indoor: "GREGWH30ATEXHD6DNA1I", ahri: "214797816", rebate: null },
  { series: "Charmo", type: "Murale", size: "36k", outdoor: "GREGWH36ATEXHD6DNA1O", indoor: "GREGWH36ATEXHD6DNA1I", ahri: "214568849", rebate: 3288 },

  // MULTIZONE
  { series: "Multizone", type: "Sans conduits", size: "18k", outdoor: "GREGWHD18ND6MO", indoor: "Appareils sans conduits", ahri: "214931586", rebate: 2112 },
  { series: "Multizone", type: "Avec conduits", size: "18k", outdoor: "GREGWHD18ND6MO", indoor: "Appareils avec conduits", ahri: "214931591", rebate: 2112 },
  { series: "Multizone", type: "Mix", size: "18k", outdoor: "GREGWHD18ND6MO", indoor: "Appareils mix", ahri: "214931592", rebate: 2112 },

  { series: "Multizone", type: "Sans conduits", size: "24k", outdoor: "GREGWHD24ND6MO", indoor: "Appareils sans conduits", ahri: "214931587", rebate: 2832 },
  { series: "Multizone", type: "Avec conduits", size: "24k", outdoor: "
