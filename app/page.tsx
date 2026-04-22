"use client";

import { useMemo, useState } from "react";

type Brand = "Gree" | "Flexx";

type UnitOption = {
  label: string;
  btu: string;
  rebate: number;
  brand: Brand;
  notes?: string;
};

const greeOptions: UnitOption[] = [
  { label: "LIVO+ 9k", btu: "9000", rebate: 1728, brand: "Gree" },
  { label: "LIVO+ 12k", btu: "12000", rebate: 1728, brand: "Gree" },
  { label: "LIVO+ 18k", btu: "18000", rebate: 1836, brand: "Gree" },
  { label: "LIVO+ 24k", btu: "24000", rebate: 1836, brand: "Gree" },

  { label: "CLIVIA 9k", btu: "9000", rebate: 1728, brand: "Gree" },
  { label: "CLIVIA 12k", btu: "12000", rebate: 1728, brand: "Gree" },
  { label: "CLIVIA 18k", btu: "18000", rebate: 1836, brand: "Gree" },
  { label: "CLIVIA 24k", btu: "24000", rebate: 1836, brand: "Gree" },

  { label: "MULTI 18k", btu: "18000", rebate: 1836, brand: "Gree" },
  { label: "MULTI 24k", btu: "24000", rebate: 1836, brand: "Gree" },
  { label: "MULTI 30k", btu: "30000", rebate: 2144, brand: "Gree" },
  { label: "MULTI 36k", btu: "36000", rebate: 2144, brand: "Gree" },
];

const flexxOptions: UnitOption[] = [
  {
    label: "FLEXX 24k Central",
    btu: "24000",
    rebate: 1836,
    brand: "Flexx",
    notes: "Central system",
  },
  {
    label: "FLEXX 30k Central",
    btu: "30000",
    rebate: 2144,
    brand: "Flexx",
    notes: "Central system",
  },
  {
    label: "FLEXX 36k Central",
    btu: "36000",
    rebate: 2144,
    brand: "Flexx",
    notes: "Central system",
  },
  {
    label: "FLEXX 48k Central",
    btu: "48000",
    rebate: 2632,
    brand: "Flexx",
    notes: "Central system",
  },
  {
    label: "FLEXX 60k Central",
    btu: "60000",
    rebate: 2872,
    brand: "Flexx",
    notes: "Central system",
  },
];

const allOptions = [...greeOptions, ...flexxOptions];

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function Home() {
  const [brand, setBrand] = useState<Brand>("Gree");
  const [selectedLabel, setSelectedLabel] = useState<string>(greeOptions[0].label);
  const [salePrice, setSalePrice] = useState<string>("");
  const [includeTax, setIncludeTax] = useState(true);
  const [taxRate, setTaxRate] = useState("14.975");

  const visibleOptions = useMemo(() => {
    return brand === "Gree" ? greeOptions : flexxOptions;
  }, [brand]);

  const selectedUnit =
    visibleOptions.find((item) => item.label === selectedLabel) ?? visibleOptions[0];

  const numericSalePrice = Number(salePrice) || 0;
  const numericTaxRate = Number(taxRate) || 0;
  const rebate = selectedUnit?.rebate ?? 0;

  const taxMultiplier = 1 + numericTaxRate / 100;
  const totalBeforeRebate = includeTax
    ? numericSalePrice * taxMultiplier
    : numericSalePrice;
  const clientNet = Math.max(totalBeforeRebate - rebate, 0);

  const quickSummary =
    numericSalePrice > 0
      ? `${selectedUnit.label} • Rebate ${formatMoney(rebate)} • Client pays ${formatMoney(clientNet)}`
      : `${selectedUnit.label} • Rebate ${formatMoney(rebate)}`;

  return (
    <main style={styles.page}>
      <div style={styles.card}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>Gree Rebate Tool</h1>
            <p style={styles.subtitle}>
              Fast LogisVert-style price and rebate calculator
            </p>
          </div>
          <div style={styles.badge}>Live</div>
        </div>

        <div style={styles.grid}>
          <div style={styles.field}>
            <label style={styles.label}>Brand</label>
            <select
              value={brand}
              onChange={(e) => {
                const nextBrand = e.target.value as Brand;
                setBrand(nextBrand);
                const nextOptions = nextBrand === "Gree" ? greeOptions : flexxOptions;
                setSelectedLabel(nextOptions[0].label);
              }}
              style={styles.select}
            >
              <option value="Gree">Gree</option>
              <option value="Flexx">Flexx</option>
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              {brand === "Flexx" ? "Flexx model" : "Model"}
            </label>
            <select
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              style={styles.select}
            >
              {visibleOptions.map((option) => (
                <option key={option.label} value={option.label}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Sale price before rebate</label>
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
        </div>

        <div style={styles.switchRow}>
          <label style={styles.checkWrap}>
            <input
              type="checkbox"
              checked={includeTax}
              onChange={(e) => setIncludeTax(e.target.checked)}
            />
            <span>Include tax in client total</span>
          </label>
        </div>

        <div style={styles.resultsGrid}>
          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>Selected unit</div>
            <div style={styles.resultValue}>{selectedUnit.label}</div>
            <div style={styles.resultSub}>
              {selectedUnit.btu} BTU
              {selectedUnit.notes ? ` • ${selectedUnit.notes}` : ""}
            </div>
          </div>

          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>Eligible rebate</div>
            <div style={styles.resultValue}>{formatMoney(rebate)}</div>
            <div style={styles.resultSub}>Applied after sale price</div>
          </div>

          <div style={styles.resultCard}>
            <div style={styles.resultLabel}>Client total after rebate</div>
            <div style={styles.resultValue}>{formatMoney(clientNet)}</div>
            <div style={styles.resultSub}>
              {includeTax ? "Tax included" : "Tax not included"}
            </div>
          </div>
        </div>

        <div style={styles.summaryBox}>
          <div style={styles.summaryTitle}>Quick summary</div>
          <div style={styles.summaryText}>{quickSummary}</div>
        </div>

        <div style={styles.tableWrap}>
          <div style={styles.tableTitle}>Available systems</div>
          <div style={styles.table}>
            {allOptions.map((item) => (
              <div key={item.label} style={styles.tableRow}>
                <div>
                  <div style={styles.tableMain}>{item.label}</div>
                  <div style={styles.tableSub}>
                    {item.brand} • {item.btu} BTU
                    {item.notes ? ` • ${item.notes}` : ""}
                  </div>
                </div>
                <div style={styles.tableAmount}>{formatMoney(item.rebate)}</div>
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
    marginBottom: 20,
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
