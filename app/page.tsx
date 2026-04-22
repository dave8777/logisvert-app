"use client";

import { useEffect, useMemo, useState } from "react";

type UnitOption = {
  label: string;
  btu: string;
  category: "Wall Mount" | "Multi-Zone" | "Central";
  notes?: string;
};

type RebateMap = {
  [key: string]: number | string;
  updated?: string;
};

const unitOptions: UnitOption[] = [
  { label: "CHARMO 9k", btu: "9000", category: "Wall Mount" },
  { label: "CHARMO 12k", btu: "12000", category: "Wall Mount" },
  { label: "CHARMO 18k", btu: "18000", category: "Wall Mount" },
  { label: "CHARMO 24k", btu: "24000", category: "Wall Mount" },

  { label: "CLIVIA 9k", btu: "9000", category: "Wall Mount" },
  { label: "CLIVIA 12k", btu: "12000", category: "Wall Mount" },
  { label: "CLIVIA 18k", btu: "18000", category: "Wall Mount" },
  { label: "CLIVIA 24k", btu: "24000", category: "Wall Mount" },

  { label: "AIRY 9k", btu: "9000", category: "Wall Mount" },
  { label: "AIRY 12k", btu: "12000", category: "Wall Mount" },
  { label: "AIRY 18k", btu: "18000", category: "Wall Mount" },
  { label: "AIRY 24k", btu: "24000", category: "Wall Mount" },

  { label: "MULTI 18k", btu: "18000", category: "Multi-Zone" },
  { label: "MULTI 24k", btu: "24000", category: "Multi-Zone" },
  { label: "MULTI 30k", btu: "30000", category: "Multi-Zone" },
  { label: "MULTI 36k", btu: "36000", category: "Multi-Zone" },

  { label: "FLEXX 24k Central", btu: "24000", category: "Central", notes: "Central" },
  { label: "FLEXX 30k Central", btu: "30000", category: "Central", notes: "Central" },
  { label: "FLEXX 36k Central", btu: "36000", category: "Central", notes: "Central" },
  { label: "FLEXX 48k Central", btu: "48000", category: "Central", notes: "Central" },
  { label: "FLEXX 60k Central", btu: "60000", category: "Central", notes: "Central" },
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [selectedLabel, setSelectedLabel] = useState(unitOptions[0].label);
  const [salePrice, setSalePrice] = useState("");
  const [includeTax, setIncludeTax] = useState(true);
  const [taxRate, setTaxRate] = useState("14.975");
  const [addCasedCoil, setAddCasedCoil] = useState(false);
  const [casedCoilPrice, setCasedCoilPrice] = useState("800");
  const [rebates, setRebates] = useState<RebateMap | null>(null);
  const [loadingRebates, setLoadingRebates] = useState(true);

  useEffect(() => {
    async function loadRebates() {
      try {
        const res = await fetch("/api/logisvert-rebate", { cache: "no-store" });
        const data = await res.json();
        setRebates(data);
      } catch (error) {
        console.error("Failed to load rebate data", error);
        setRebates(null);
      } finally {
        setLoadingRebates(false);
      }
    }

    loadRebates();
  }, []);

  const selectedUnit = useMemo(() => {
    return unitOptions.find((item) => item.label === selectedLabel) ?? unitOptions[0];
  }, [selectedLabel]);

  const rebate = Number(rebates?.[selectedUnit.btu] ?? 0);
  const numericSalePrice = Number(salePrice) || 0;
  const numericTaxRate = Number(taxRate) || 0;
  const numericCasedCoil = addCasedCoil ? Number(casedCoilPrice) || 0 : 0;

  const subtotal = numericSalePrice + numericCasedCoil;
  const taxMultiplier = 1 + numericTaxRate / 100;
  const totalBeforeRebate = includeTax ? subtotal * taxMultiplier : subtotal;
  const clientTotalAfterRebate = Math.max(totalBeforeRebate - rebate, 0);

  const quickSummary =
    numericSalePrice > 0
      ? `${selectedUnit.label} • Rebate ${formatMoney(rebate)} • Client pays ${formatMoney(
          clientTotalAfterRebate
        )}`
      : `${selectedUnit.label} • Rebate ${formatMoney(rebate)}`;

  const isFlexx = selectedUnit.label.includes("FLEXX");

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Gree Rebate Tool</h1>
            <p style={styles.subtitle}>Live rebate lookup with customer total calculator</p>
          </div>
          <div style={styles.badge}>Live</div>
        </div>

        <div style={styles.infoBar}>
          <div>
            <strong>Rebate data:</strong>{" "}
            {loadingRebates ? "Loading..." : rebates ? "Connected" : "Unavailable"}
          </div>
          <div>
            <strong>Updated:</strong> {String(rebates?.updated ?? "Not available")}
          </div>
        </div>

        <div style={styles.grid}>
          <div style={styles.field}>
            <label style={styles.label}>Model</label>
            <select
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              style={styles.select}
            >
              {unitOptions.map((option) => (
                <option key={option.label} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>System price before rebate</label>
            <input
              type="number"
              inputMode="decimal"
              placeholder="Example: 3500"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Tax rate %</label>
            <input
              type="number"
              inputMode="decimal"
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Category</label>
            <div style={styles.readOnlyBox}>{selectedUnit.category}</div>
          </div>
        </div>

        {isFlexx && (
          <div style={styles.addOnBox}>
            <div style={styles.addOnTitle}>FLEXX add-ons</div>
            <label style={styles.checkWrap}>
              <input
                type="checkbox"
                checked={addCasedCoil}
                onChange={(e) => setAddCasedCoil(e.target.checked)}
              />
              <span>Add cased coil</span>
            </label>

            {addCasedCoil && (
              <div style={{ ...styles.field, marginTop: 12 }}>
                <label style={styles.label}>Cased coil price</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={casedCoilPrice}
                  onChange={(e) => setCasedCoilPrice(e.target.value)}
                  style={styles.input}
                />
              </div>
            )}
          </div>
        )}

        <div style={styles.switchRow}>
          <label style={styles.checkWrap}>
            <input
              type="checkbox"
              checked={includeTax}
              onChange={(e) => setIncludeTax(e.target.checked)}
            />
            <span>Include tax in customer total</span>
          </label>
        </div>

        <div style={styles.resultsGrid}>
          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>Selected system</div>
            <div style={styles.resultValue}>{selectedUnit.label}</div>
            <div style={styles.resultSub}>
              {selectedUnit.btu} BTU
              {selectedUnit.notes ? ` • ${selectedUnit.notes}` : ""}
            </div>
          </div>

          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>Live rebate amount</div>
            <div style={styles.resultValue}>{formatMoney(rebate)}</div>
            <div style={styles.resultSub}>Pulled from your rebate endpoint</div>
          </div>

          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>Customer total after rebate</div>
            <div style={styles.resultValue}>{formatMoney(clientTotalAfterRebate)}</div>
            <div style={styles.resultSub}>
              {includeTax ? "Tax included" : "Tax not included"}
            </div>
          </div>
        </div>

        <div style={styles.breakdownBox}>
          <div style={styles.breakdownRow}>
            <span>System price</span>
            <strong>{formatMoney(numericSalePrice)}</strong>
          </div>
          {addCasedCoil && (
            <div style={styles.breakdownRow}>
              <span>Cased coil</span>
              <strong>{formatMoney(numericCasedCoil)}</strong>
            </div>
          )}
          <div style={styles.breakdownRow}>
            <span>Subtotal</span>
            <strong>{formatMoney(subtotal)}</strong>
          </div>
          <div style={styles.breakdownRow}>
            <span>{includeTax ? `Total with ${taxRate}% tax` : "Total before tax"}</span>
            <strong>{formatMoney(totalBeforeRebate)}</strong>
          </div>
          <div style={{ ...styles.breakdownRow, ...styles.breakdownFinal }}>
            <span>After rebate</span>
            <strong>{formatMoney(clientTotalAfterRebate)}</strong>
          </div>
        </div>

        <div style={styles.summaryBox}>
          <div style={styles.summaryTitle}>Quick summary</div>
          <div style={styles.summaryText}>{quickSummary}</div>
        </div>

        <div style={styles.tableWrap}>
          <div style={styles.tableTitle}>Available systems</div>
          <div style={styles.table}>
            {unitOptions.map((item) => (
              <div key={item.label} style={styles.tableRow}>
                <div>
                  <div style={styles.tableMain}>{item.label}</div>
                  <div style={styles.tableSub}>
                    {item.category} • {item.btu} BTU
                    {item.notes ? ` • ${item.notes}` : ""}
                  </div>
                </div>
                <div style={styles.tableAmount}>{formatMoney(Number(rebates?.[item.btu] ?? 0))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f4f6f8",
    padding: "24px 16px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    maxWidth: 980,
    margin: "0 auto",
    background: "#ffffff",
    borderRadius: 18,
    padding: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  title: {
    fontSize: 34,
    lineHeight: 1.1,
    margin: 0,
    color: "#111827",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#6b7280",
    fontSize: 15,
  },
  badge: {
    background: "#dcfce7",
    color: "#166534",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14,
  },
  infoBar: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    padding: "12px 14px",
    borderRadius: 14,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    marginBottom: 16,
    color: "#1e3a8a",
    fontSize: 14,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 14,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: "#374151",
  },
  select: {
    height: 46,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    padding: "0 12px",
    fontSize: 15,
    background: "#fff",
  },
  input: {
    height: 46,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    padding: "0 12px",
    fontSize: 15,
    background: "#fff",
  },
  readOnlyBox: {
    height: 46,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    padding: "0 12px",
    fontSize: 15,
    background: "#f9fafb",
    display: "flex",
    alignItems: "center",
    color: "#111827",
    fontWeight: 600,
  },
  addOnBox: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    background: "#fafafa",
    marginBottom: 14,
  },
  addOnTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#111827",
    marginBottom: 10,
  },
  switchRow: {
    margin: "8px 0 18px 0",
  },
  checkWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    color: "#374151",
    fontSize: 14,
    fontWeight: 600,
  },
  resultsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },
  resultCard: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
  },
  resultLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
    lineHeight: 1.1,
  },
  resultSub: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 14,
  },
  breakdownBox: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  breakdownRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "8px 0",
    color: "#374151",
  },
  breakdownFinal: {
    borderTop: "1px solid #e5e7eb",
    marginTop: 6,
    paddingTop: 12,
    fontSize: 16,
    color: "#111827",
  },
  summaryBox: {
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#4338ca",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 16,
    color: "#1f2937",
    fontWeight: 600,
  },
  tableWrap: {
    marginTop: 6,
  },
  tableTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
    marginBottom: 12,
  },
  table: {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
  },
  tableRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    padding: 14,
    borderBottom: "1px solid #e5e7eb",
    background: "#fff",
  },
  tableMain: {
    fontWeight: 700,
    color: "#111827",
    fontSize: 15,
  },
  tableSub: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 3,
  },
  tableAmount: {
    fontWeight: 800,
    color: "#111827",
    whiteSpace: "nowrap",
  },
};
