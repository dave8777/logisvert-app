"use client";

import { useEffect, useState } from "react";

type SubmissionRecord = {
  id: string;
  submittedAt: string;
  lang: string;
  contact: {
    name: string;
    phone: string;
    email: string | null;
    address?: string | null;
    city?: string | null;
    postal?: string | null;
  };
  notes?: string | null;
  inArea?: boolean | null;
  detected?: { description: string; replaceConfirmed: string | null } | null;
  selection: {
    label?: string;
    line?: string;
    equipmentType?: string;
    sizeLabel?: string;
    ahri?: string;
    installationType: string;
    quantity: number;
  };
  options?: {
    key: string;
    name: string;
    available: boolean;
    estimate: { min: number; max: number; subsidy: number | null } | null;
  }[];
  estimate?: { min: number; max: number } | null;
  subsidy?: number | null;
  photos: Record<string, string>;
};

const CURRENCY = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [records, setRecords] = useState<SubmissionRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("dpsd-admin-key");
    if (stored) {
      setSavedKey(stored);
      void load(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load(adminKey: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/list?key=${encodeURIComponent(adminKey)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Erreur de chargement.");
      }
      window.localStorage.setItem("dpsd-admin-key", adminKey);
      setSavedKey(adminKey);
      setRecords(data.records as SubmissionRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
      setRecords(null);
    } finally {
      setLoading(false);
    }
  }

  function fileUrl(path: string) {
    return `/api/admin/file?key=${encodeURIComponent(savedKey ?? "")}&path=${encodeURIComponent(path)}`;
  }

  async function deleteRecord(r: SubmissionRecord) {
    const sure = window.confirm(
      `Supprimer définitivement la demande de ${r.contact.name} (photos incluses)?`
    );
    if (!sure) return;
    try {
      const res = await fetch(
        `/api/admin/delete?key=${encodeURIComponent(savedKey ?? "")}&id=${encodeURIComponent(r.id)}&date=${encodeURIComponent(r.submittedAt.slice(0, 10))}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Échec de la suppression.");
      }
      setRecords((prev) => (prev ?? []).filter((x) => x.id !== r.id));
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Échec de la suppression.");
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <span className="brand">
            <img src="/logo-mark.png" alt="Groupe DPSD" />
            <span>
              Groupe DPSD Inc
              <small>Demandes d&rsquo;estimation</small>
            </span>
          </span>
        </div>
      </header>

      <main>
        <section className="page-body">
          <div className="container">
            {!savedKey || error ? (
              <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
                <div className="field">
                  <label>Clé d&rsquo;accès administrateur</label>
                  <input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="Entrez la clé"
                  />
                </div>
                {error ? <div className="status error">{error}</div> : null}
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!key || loading}
                  onClick={() => void load(key)}
                >
                  {loading ? "Chargement…" : "Voir les demandes"}
                </button>
              </div>
            ) : records === null ? (
              <div className="status loading">Chargement…</div>
            ) : records.length === 0 ? (
              <div className="status hint">Aucune demande pour le moment.</div>
            ) : (
              <>
                <p style={{ marginBottom: "1rem", color: "var(--muted)" }}>
                  {records.length} demande{records.length > 1 ? "s" : ""} —
                  la plus récente en premier.
                </p>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {records.map((r) => (
                    <div className="card" key={r.id}>
                      <div className="summary-grid">
                        <div className="info-card">
                          <div className="label">Client</div>
                          <div className="value">
                            {r.contact.name} —{" "}
                            <a href={`tel:${r.contact.phone}`}>{r.contact.phone}</a>
                            {r.contact.email ? (
                              <>
                                {" · "}
                                <a href={`mailto:${r.contact.email}`}>
                                  {r.contact.email}
                                </a>
                              </>
                            ) : null}
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="label">Reçue le</div>
                          <div className="value">
                            {new Date(r.submittedAt).toLocaleString("fr-CA")}
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="label">
                            Adresse{r.inArea === false ? " — HORS ZONE" : ""}
                          </div>
                          <div className="value">
                            {[r.contact.address, r.contact.city, r.contact.postal]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="label">Demande</div>
                          <div className="value">
                            {r.selection.label ??
                              `${r.selection.line ?? ""} · ${r.selection.equipmentType ?? ""} · ${r.selection.sizeLabel ?? ""} × ${r.selection.quantity}`}
                            {" — "}
                            {r.selection.installationType}
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="label">Estimations transmises</div>
                          <div className="value">
                            {r.options
                              ? r.options
                                  .filter((o) => o.available && o.estimate)
                                  .map(
                                    (o) =>
                                      `${o.name}: ${CURRENCY.format(o.estimate!.min)} – ${CURRENCY.format(o.estimate!.max)}` +
                                      (o.estimate!.subsidy
                                        ? ` (LogisVert ${CURRENCY.format(o.estimate!.subsidy)})`
                                        : "")
                                  )
                                  .join(" · ")
                              : r.estimate
                                ? `${CURRENCY.format(r.estimate.min)} – ${CURRENCY.format(r.estimate.max)}` +
                                  (r.subsidy
                                    ? ` · LogisVert ${CURRENCY.format(r.subsidy)}`
                                    : "")
                                : "À confirmer"}
                          </div>
                        </div>
                        {r.detected ? (
                          <div className="info-card">
                            <div className="label">Unité existante (OCR)</div>
                            <div className="value">
                              {r.detected.description}
                              {r.detected.replaceConfirmed === "yes"
                                ? " — remplacement confirmé"
                                : r.detected.replaceConfirmed === "no"
                                  ? " — pas un remplacement"
                                  : ""}
                            </div>
                          </div>
                        ) : null}
                        {r.notes ? (
                          <div className="info-card">
                            <div className="label">Notes du client</div>
                            <div className="value">{r.notes}</div>
                          </div>
                        ) : null}
                      </div>
                      <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.8rem", flexWrap: "wrap", alignItems: "center" }}>
                        {Object.entries(r.photos).map(([field, path]) => (
                          <a
                            key={field}
                            href={fileUrl(path)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src={fileUrl(path)}
                              alt={field}
                              style={{
                                width: 140,
                                height: 105,
                                objectFit: "cover",
                                borderRadius: 8,
                                border: "1px solid var(--line)",
                              }}
                            />
                          </a>
                        ))}
                        <button
                          type="button"
                          onClick={() => void deleteRecord(r)}
                          style={{
                            marginLeft: "auto",
                            border: "1px solid #f3c4c4",
                            background: "#fdf1f1",
                            color: "#a33a3a",
                            borderRadius: 999,
                            padding: "0.45rem 1.1rem",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            fontFamily: "inherit",
                            cursor: "pointer",
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
