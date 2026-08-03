"use client";

import { useEffect, useState } from "react";

// Espace des estimations virtuelles : chaque demande avec son créneau de
// rencontre, ses photos et ses coordonnées — prête à préparer la soumission.
type VirtualRecord = {
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
  unitType: string;
  slot: { date: string; time: string };
  photos: Record<string, string>;
};

const PHOTO_LABELS: Record<string, string> = {
  intNameplate: "Plaque int.",
  intSpace: "Unité int.",
  extNameplate: "Plaque ext.",
  extSpace: "Unité ext.",
  panel: "Panneau",
};

function photoLabel(field: string): string {
  return PHOTO_LABELS[field] ?? field.replace(/^extra(\d+)$/, "Extra $1");
}

function slotDisplay(slot: { date: string; time: string }): string {
  const d = new Date(`${slot.date}T12:00:00Z`);
  return `${d.toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  })} à ${slot.time.replace(":", " h ")}`;
}

function isPast(slot: { date: string; time: string }): boolean {
  const now = new Date().toLocaleString("sv-SE", { timeZone: "America/Toronto" });
  return `${slot.date} ${slot.time}` < `${now.slice(0, 10)} ${now.slice(11, 16)}`;
}

export default function VirtualAdminPage() {
  const [key, setKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [records, setRecords] = useState<VirtualRecord[] | null>(null);
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
        `/api/admin/virtual-list?key=${encodeURIComponent(adminKey)}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "Erreur de chargement.");
      }
      window.localStorage.setItem("dpsd-admin-key", adminKey);
      setSavedKey(adminKey);
      setRecords(data.records as VirtualRecord[]);
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

  async function deleteRecord(r: VirtualRecord) {
    const sure = window.confirm(
      `Supprimer définitivement la demande virtuelle de ${r.contact.name} (photos incluses)? Son créneau sera libéré.`
    );
    if (!sure) return;
    try {
      const res = await fetch(
        `/api/admin/virtual-delete?key=${encodeURIComponent(savedKey ?? "")}&id=${encodeURIComponent(r.id)}&date=${encodeURIComponent(r.submittedAt.slice(0, 10))}`,
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
              <small>Estimations virtuelles</small>
            </span>
          </span>
          <div className="header-actions">
            <a className="back-link" href="/admin">
              ← Demandes d&rsquo;estimation
            </a>
          </div>
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
              <div className="status hint">
                Aucune demande d&rsquo;estimation virtuelle pour le moment.
              </div>
            ) : (
              <>
                <p style={{ marginBottom: "1rem", color: "var(--muted)" }}>
                  {records.length} rencontre{records.length > 1 ? "s" : ""} —
                  la prochaine en premier. Pensez à envoyer le lien de la
                  rencontre au client avant l&rsquo;heure prévue.
                </p>
                <div style={{ display: "grid", gap: "1rem" }}>
                  {records.map((r) => (
                    <div className="card" key={r.id}>
                      <div className="summary-grid">
                        <div className="info-card">
                          <div className="label">
                            Rencontre{isPast(r.slot) ? " — PASSÉE" : ""}
                          </div>
                          <div className="value">
                            <strong>{slotDisplay(r.slot)}</strong>
                          </div>
                        </div>
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
                          <div className="label">Système</div>
                          <div className="value">
                            {r.unitType === "murale"
                              ? "Thermopompe murale"
                              : "Thermopompe centrale"}
                            {" — client "}
                            {r.lang.toUpperCase()}
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="label">Adresse</div>
                          <div className="value">
                            {[r.contact.address, r.contact.city, r.contact.postal]
                              .filter(Boolean)
                              .join(", ") || "—"}
                          </div>
                        </div>
                        <div className="info-card">
                          <div className="label">Reçue le</div>
                          <div className="value">
                            {new Date(r.submittedAt).toLocaleString("fr-CA")}
                          </div>
                        </div>
                        {r.notes ? (
                          <div className="info-card">
                            <div className="label">Notes du client</div>
                            <div className="value">{r.notes}</div>
                          </div>
                        ) : null}
                      </div>
                      <div
                        style={{
                          marginTop: "0.9rem",
                          display: "flex",
                          gap: "0.8rem",
                          flexWrap: "wrap",
                          alignItems: "center",
                        }}
                      >
                        {Object.entries(r.photos).map(([field, path]) => (
                          <a
                            key={field}
                            href={fileUrl(path)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textAlign: "center", fontSize: "0.75rem" }}
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
                                display: "block",
                              }}
                            />
                            {photoLabel(field)}
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
