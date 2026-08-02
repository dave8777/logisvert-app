"use client";

import { useEffect, useState } from "react";

type SubmissionRecord = {
  id: string;
  submittedAt: string;
  lang: string;
  contact: { name: string; phone: string; email: string | null };
  selection: {
    line: string;
    equipmentType: string;
    sizeLabel: string;
    ahri: string;
    installationType: string;
    quantity: number;
  };
  estimate: { min: number; max: number } | null;
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
                          <div className="label">Système</div>
                          <div className="value">
                            {r.selection.line} · {r.selection.equipmentType} ·{" "}
                            {r.selection.sizeLabel} × {r.selection.quantity}
                            {" — AHRI "}
                            {r.selection.ahri}
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="label">Estimation transmise</div>
                          <div className="value">
                            {r.estimate
                              ? `${CURRENCY.format(r.estimate.min)} – ${CURRENCY.format(r.estimate.max)}`
                              : "À confirmer (aucun barème)"}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
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
