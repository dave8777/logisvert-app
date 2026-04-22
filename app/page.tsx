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
  { series: "Airy", type: "Gainable", size: "24k", outdoor: "GREGWH24AVEXHD6DNA1O", indoor: "GREGFH24DBD6DNA1AI", ahri: "0", rebate: null },

  // CLIVIA
  { series: "Clivia", type: "Murale", size: "9k", outdoor: "GREGWH09AGCXDD6DNA4O", indoor: "GREGWH09AUCXDD6DNA2I", ahri: "216032435", rebate: null },
  { series: "Clivia", type: "Murale", size: "12k", outdoor: "GREGWH12AGCXDD6DNA4O", indoor: "GREGWH12AUCXDD6DNA2I", ahri: "216032436", rebate: 924 },
  { series: "Clivia", type: "Murale", size: "18k", outdoor: "GREGWH18AGDXFD6DNA4O", indoor: "GREGWH18AUDXFD6DNA2I", ahri: "216052270", rebate: 1764 },
  { series: "Clivia", type: "Murale", size: "24k", outdoor: "GREGWH24AGEXFD6DNA4O", indoor: "GREGWH24AUDXFD6DNA2I", ahri: "216623541", rebate: 2280 },

  { series: "Clivia", type: "Murale Anthracite", size: "12k", outdoor: "GREGWH12AGCXDD6DNA4O", indoor: "GREGWH12AUCXDD6DNA2DIB", ahri: "0", rebate: null },
  { series: "Clivia", type: "Murale Anthracite", size: "18k", outdoor: "GREGWH18AGDXFD6DNA4O", indoor: "GREGWH18AUDXFD6DNA2CIB", ahri: "0", rebate: null },

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
  { series: "Multizone", type: "Avec conduits", size: "24k", outdoor: "GREGWHD24ND6MO", indoor: "Appareils avec conduits", ahri: "214931593", rebate: 2640 },
  { series: "Multizone", type: "Mix", size: "24k", outdoor: "GREGWHD24ND6MO", indoor: "Appareils mix", ahri: "214931597", rebate: 2760 },

  { series: "Multizone", type: "Sans conduits", size: "30k", outdoor: "GREGWHD30ND6MO", indoor: "Appareils sans conduits", ahri: "214931588", rebate: 3360 },
  { series: "Multizone", type: "Avec conduits", size: "30k", outdoor: "GREGWHD30ND6MO", indoor: "Appareils avec conduits", ahri: "214931594", rebate: 3264 },
  { series: "Multizone", type: "Mix", size: "30k", outdoor: "GREGWHD30ND6MO", indoor: "Appareils mix", ahri: "214931598", rebate: 3312 },

  { series: "Multizone", type: "Sans conduits", size: "36k", outdoor: "GREGWHD36ND6MO", indoor: "Appareils sans conduits", ahri: "214931589", rebate: 4320 },
  { series: "Multizone", type: "Avec conduits", size: "36k", outdoor: "GREGWHD36ND6MO", indoor: "Appareils avec conduits", ahri: "214931595", rebate: 4320 },
  { series: "Multizone", type: "Mix", size: "36k", outdoor: "GREGWHD36ND6MO", indoor: "Appareils mix", ahri: "214931599", rebate: 4320 },

  { series: "Multizone", type: "Sans conduits", size: "42k", outdoor: "GREGWHD42ND6MO", indoor: "Appareils sans conduits", ahri: "214931590", rebate: 5340 },
  { series: "Multizone", type: "Avec conduits", size: "42k", outdoor: "GREGWHD42ND6MO", indoor: "Appareils avec conduits", ahri: "214931596", rebate: 5340 },
  { series: "Multizone", type: "Mix", size: "42k", outdoor: "GREGWHD42ND6MO", indoor: "Appareils mix", ahri: "214931600", rebate: 5340 },

  // FLEEX - AIR HANDLER
  { series: "FLEEX", type: "Air Handler", size: "24k", outdoor: "GREGUD36W2NHEDU", indoor: "GREGUD24AH2EDU", ahri: "216621482", rebate: 2472 },
  { series: "FLEEX", type: "Air Handler", size: "36k", outdoor: "GREGUD36W2NHEDU", indoor: "GREGUD36AH2EDU", ahri: "214568826", rebate: 3384 },
  { series: "FLEEX", type: "Air Handler", size: "36k GDU", outdoor: "GREGUD36W2NHEDU", indoor: "GREGUD36AH2GDU", ahri: "217120760", rebate: 3384 },
  { series: "FLEEX", type: "Air Handler", size: "48k", outdoor: "GREGUD60W2NHEDU", indoor: "GREGUD48AH2EDU", ahri: "216621484", rebate: 4740 },
  { series: "FLEEX", type: "Air Handler", size: "60k", outdoor: "GREGUD60W2NHEDU", indoor: "GREGUD60AH2GDU", ahri: "214568857", rebate: 5400 },

  // FLEEX - CASED COIL
  { series: "FLEEX", type: "Cased Coil", size: "24k", outdoor: "GREGUD36W2NHEDU", indoor: "GREGCAC24FNHA", ahri: "216768109", rebate: 1800 },
  { series: "FLEEX", type: "Cased Coil", size: "36k", outdoor: "GREGUD36W2NHEDU", indoor: "GREGCAC36FNHA", ahri: "216765692", rebate: 2640 },
  { series: "FLEEX", type: "Cased Coil", size: "48k", outdoor: "GREGUD60W2NHEDU", indoor: "GREGCAC48HNHA", ahri: "216768110", rebate: 4224 },
  { series: "FLEEX", type: "Cased Coil", size: "60k", outdoor: "GREGUD60W2NHEDU", indoor: "GREGCAC60HNHA", ahri: "216765694", rebate: 4800 },
]

function formatMoney(value: number | null) {
  if (value == null) return "n/a"
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value)
}

export default function Home() {
  const [series, setSeries] = useState("")
  const [type, setType] = useState("")
  const [size, setSize] = useState("")
  const [liveRebate, setLiveRebate] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const seriesOptions = useMemo(
    () => [...new Set(GREE_MODELS.map((m) => m.series))],
    []
  )

  const typeOptions = useMemo(
    () =>
      [...new Set(
        GREE_MODELS
          .filter((m) => !series || m.series === series)
          .map((m) => m.type)
      )],
    [series]
  )

  const sizeOptions = useMemo(
    () =>
      [...new Set(
        GREE_MODELS
          .filter((m) =>
            (!series || m.series === series) &&
            (!type || m.type === type)
          )
          .map((m) => m.size)
      )],
    [series, type]
  )

  const selected = useMemo(
    () =>
      GREE_MODELS.find(
        (m) => m.series === series && m.type === type && m.size === size
      ) || null,
    [series, type, size]
  )

  useEffect(() => {
    if (!selected?.ahri || selected.ahri === "0") {
      setLiveRebate(null)
      return
    }

    const run = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/logisvert-rebate?ahri=${selected.ahri}`)
        const data = await res.json()
        setLiveRebate(data.subsidy_amount || "Not found")
      } catch {
        setLiveRebate("Error fetching rebate")
      } finally {
        setLoading(false)
      }
    }

    run()
  }, [selected])

  return (
    <div style={{ padding: 20, maxWidth: 760, margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ fontSize: 42, marginBottom: 24 }}>Gree Rebate Tool</h1>

      <div style={{ display: "grid", gap: 14 }}>
        <select
          value={series}
          onChange={(e) => {
            setSeries(e.target.value)
            setType("")
            setSize("")
            setLiveRebate(null)
          }}
          style={{ padding: 14, fontSize: 18, borderRadius: 8 }}
        >
          <option value="">Select series</option>
          {seriesOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value)
            setSize("")
            setLiveRebate(null)
          }}
          style={{ padding: 14, fontSize: 18, borderRadius: 8 }}
          disabled={!series}
        >
          <option value="">Select type</option>
          {typeOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <select
          value={size}
          onChange={(e) => {
            setSize(e.target.value)
            setLiveRebate(null)
          }}
          style={{ padding: 14, fontSize: 18, borderRadius: 8 }}
          disabled={!type}
        >
          <option value="">Select size</option>
          {sizeOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {selected && (
        <div style={{ marginTop: 28, padding: 20, border: "1px solid #ccc", borderRadius: 12, background: "#f8f8f8" }}>
          <h2 style={{ marginTop: 0 }}>
            {selected.series} — {selected.type} — {selected.size}
          </h2>

          <p><strong>AHRI:</strong> {selected.ahri === "0" ? "n/a" : selected.ahri}</p>
          <p><strong>Subvention:</strong> {loading ? "Checking..." : (liveRebate || formatMoney(selected.rebate))}</p>
          <p><strong>Outdoor:</strong> {selected.outdoor}</p>
          <p><strong>Indoor:</strong> {selected.indoor}</p>
        </div>
      )}
    </div>
  )
}
