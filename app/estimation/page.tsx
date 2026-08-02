"use client";

import { useEffect, useMemo, useState } from "react";

type DocOption = {
  key: string;
  available: boolean;
  estimate: { min: number; max: number; subsidy: number | null } | null;
};

type DocRecord = {
  id: string;
  submittedAt: string;
  lang: string;
  clientName: string;
  clientAddress: string;
  selection: {
    systemType: string;
    sizeKey: string;
    label: string;
    installationType: string;
    quantity: number;
  };
  options: DocOption[];
};

const PHONE_DISPLAY = "(514) 969-8786";

const OPTION_META: Record<
  string,
  { photo: string; logo: string | null }
> = {
  charmo: { photo: "/products/charmo.png", logo: "/products/charmologo.png" },
  clivia: { photo: "/products/clivia.png", logo: "/products/clivialogo.png" },
  airy: { photo: "/products/airy.png", logo: "/products/airylogo.png" },
  handler: { photo: "/products/airhandler.png", logo: "/products/flexxlogo.png" },
  coil: { photo: "/products/coil.png", logo: "/products/flexxlogo.png" },
};

const S = {
  fr: {
    docTitle: "ESTIMATION",
    number: "Estimation nº",
    date: "Date :",
    prepared: "Préparée pour",
    project: "Projet",
    replacement: "Remplacement d'une thermopompe existante",
    newInstall: "Nouvelle installation",
    rangeLabel: "Fourchette estimée — installation complète, taxes incluses",
    subsidy: "Subvention LogisVert admissible",
    notOffered: "Non offert dans cette capacité",
    optionNames: {
      charmo: ["Gree Charmo", "Chauffage jusqu'à −25 °C"],
      clivia: ["Gree Clivia", "Chauffage jusqu'à −30 °C"],
      airy: ["Gree Airy", "Chauffage jusqu'à −30 °C — haute efficacité"],
      handler: ["Système complet", "Ventilo-convecteur neuf + appoint électrique"],
      coil: ["Sur fournaise existante", "Serpentin — votre fournaise en appoint"],
    } as Record<string, [string, string]>,
    includedBase: [
      "Installation complète par notre équipe",
      "Ligne frigorifique en cuivre neuve",
      "Support, fouet électrique et sectionneur",
      "Garantie 10+2 ans sur les pièces et le compresseur",
      "Garantie main-d'œuvre de 1 an",
      "Tous les documents pour votre demande LogisVert",
    ],
    includedRemoval: "Enlèvement et disposition des anciens équipements",
    includedHandler: [
      "Chauffage d'appoint électrique intégré",
      "Intégration en tôlerie à vos conduits",
      "Nouveau thermostat Honeywell",
    ],
    includedCoil: [
      "Installé sur votre fournaise et vos conduits existants",
      "Intégration en tôlerie",
      "Nouveau thermostat Honeywell",
    ],
    warranty: "Garantie 10+2 ans sur les pièces et le compresseur · Garantie main-d'œuvre de 1 an",
    foot:
      "Estimation approximative à titre indicatif seulement, établie à partir des renseignements et photos fournis. Le prix final est confirmé lors d'une visite sur place, sans frais et sans engagement. Les montants incluent les taxes (TPS + TVQ). Subventions LogisVert selon le barème en vigueur — admissibilité confirmée lors de la visite; nous préparons tous les documents pour vous.",
    contact: "Des questions? Appelez-nous au",
    print: "🖨️ Imprimer / enregistrer en PDF",
    loading: "Chargement de votre estimation…",
    notFound: "Estimation introuvable. Vérifiez le lien ou contactez-nous au",
    company: "Groupe DPSD Inc · RBQ 5733-3916-01 · Membre de la CMMTQ",
  },
  en: {
    docTitle: "ESTIMATE",
    number: "Estimate no.",
    date: "Date:",
    prepared: "Prepared for",
    project: "Project",
    replacement: "Replacement of an existing heat pump",
    newInstall: "New installation",
    rangeLabel: "Estimated range — complete installation, taxes included",
    subsidy: "Eligible LogisVert rebate",
    notOffered: "Not offered in this capacity",
    optionNames: {
      charmo: ["Gree Charmo", "Heating down to −25 °C"],
      clivia: ["Gree Clivia", "Heating down to −30 °C"],
      airy: ["Gree Airy", "Heating down to −30 °C — high efficiency"],
      handler: ["Complete system", "New air handler + electric backup"],
      coil: ["On existing furnace", "Cased coil — your furnace as backup"],
    } as Record<string, [string, string]>,
    includedBase: [
      "Complete installation by our team",
      "New copper refrigerant lineset",
      "Rack, electrical whip and disconnect",
      "10+2 year warranty on parts and compressor",
      "1 year labor warranty",
      "All documents for your LogisVert rebate application",
    ],
    includedRemoval: "Removal and disposal of the old equipment",
    includedHandler: [
      "Built-in electric backup heat",
      "Sheet metal integration to your ductwork",
      "New Honeywell thermostat",
    ],
    includedCoil: [
      "Installed on your existing furnace and ductwork",
      "Sheet metal integration",
      "New Honeywell thermostat",
    ],
    warranty: "10+2 year warranty on parts and compressor · 1 year labor warranty",
    foot:
      "Ballpark estimate for guidance only, based on the information and photos provided. The final price is confirmed with a free, no-obligation on-site visit. Amounts include taxes (GST + QST). LogisVert rebates per the current program — eligibility confirmed during the visit; we prepare all the paperwork for you.",
    contact: "Questions? Call us at",
    print: "🖨️ Print / save as PDF",
    loading: "Loading your estimate…",
    notFound: "Estimate not found. Check the link or call us at",
    company: "Groupe DPSD Inc · RBQ 5733-3916-01 · CMMTQ member",
  },
} as const;

export default function EstimationPage() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error" }
    | { status: "done"; record: DocRecord }
  >({ status: "loading" });
  const [lang, setLang] = useState<"fr" | "en">("fr");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") ?? "";
    const date = params.get("date") ?? "";
    if (params.get("lang") === "en") setLang("en");
    (async () => {
      try {
        const res = await fetch(
          `/api/estimate/view?id=${encodeURIComponent(id)}&date=${encodeURIComponent(date)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error();
        const record = data.record as DocRecord;
        if (!params.get("lang") && record.lang === "en") setLang("en");
        setState({ status: "done", record });
      } catch {
        setState({ status: "error" });
      }
    })();
  }, []);

  const t = S[lang];

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      }),
    [lang]
  );

  if (state.status === "loading") {
    return <div className="doc-message">{t.loading}</div>;
  }
  if (state.status === "error") {
    return (
      <div className="doc-message">
        {t.notFound} {PHONE_DISPLAY}.
      </div>
    );
  }

  const r = state.record;
  const isReplacement =
    r.selection.installationType !== "Nouvelle installation";
  const isCentral = r.selection.systemType === "centrale";
  const shownOptions = r.options.filter((o) => o.available && o.estimate);
  const docNo = r.id.slice(0, 8).toUpperCase();
  const docDate = new Date(r.submittedAt).toLocaleDateString(
    lang === "fr" ? "fr-CA" : "en-CA",
    { year: "numeric", month: "long", day: "numeric" }
  );

  function includedFor(key: string): string[] {
    const items: string[] = [...t.includedBase];
    if (isReplacement) items.splice(1, 0, t.includedRemoval);
    if (key === "handler") items.splice(1, 0, ...t.includedHandler);
    if (key === "coil") items.splice(1, 0, ...t.includedCoil);
    return items;
  }

  return (
    <div className="doc-wrap">
      <div className="no-print doc-toolbar">
        <button type="button" onClick={() => window.print()}>
          {t.print}
        </button>
      </div>

      <div className="doc">
        <div className="doc-head">
          <img src="/logo-mark.png" alt="Groupe DPSD" />
          <div className="doc-meta">
            <h1>{t.docTitle}</h1>
            <div>
              <strong>
                {t.number} {docNo}
              </strong>{" "}
              · {docDate}
            </div>
            <div>{t.company}</div>
            <div>{PHONE_DISPLAY} · dpsdair.ca</div>
          </div>
        </div>

        <div className="doc-sub">
          <div>
            <strong>{t.prepared}</strong>
            <br />
            {r.clientName}
            {r.clientAddress ? (
              <>
                <br />
                <span className="doc-muted">{r.clientAddress}</span>
              </>
            ) : null}
          </div>
          <div style={{ textAlign: "right" }}>
            <strong>{t.project}</strong>
            <br />
            {r.selection.label}
            <br />
            <span className="doc-muted">
              {isReplacement ? t.replacement : t.newInstall}
            </span>
          </div>
        </div>

        <div
          className="doc-options"
          style={{
            gridTemplateColumns: `repeat(${Math.min(shownOptions.length, 3) || 1}, 1fr)`,
          }}
        >
          {shownOptions.map((o) => {
            const meta = OPTION_META[o.key];
            const [name, tag] = t.optionNames[o.key] ?? [o.key, ""];
            const e = o.estimate!;
            return (
              <div className="doc-card" key={o.key}>
                <div className="doc-photo">
                  {meta ? <img src={meta.photo} alt={name} /> : null}
                  {meta?.logo ? (
                    <img className="doc-flogo" src={meta.logo} alt={name} />
                  ) : (
                    <div className="doc-name">{name}</div>
                  )}
                  <div className="doc-tag">{tag}</div>
                </div>
                <ul className="doc-inc">
                  {includedFor(o.key).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="doc-price">
                  <div className="doc-range">
                    <div className="lbl">{t.rangeLabel}</div>
                    <div className="amt">
                      {currency.format(e.min)} – {currency.format(e.max)}
                    </div>
                  </div>
                  {e.subsidy ? (
                    <div className="doc-subsidy">
                      {t.subsidy} : <strong>−{currency.format(e.subsidy)}</strong>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="doc-guarantee">
          <img src={`/products/guarantee-${lang}.png`} alt="10+2" />
          <div>{t.warranty}</div>
        </div>

        <p className="doc-foot">{t.foot}</p>
        <p className="doc-foot">
          <strong>
            {t.contact} {PHONE_DISPLAY}.
          </strong>
        </p>
      </div>
    </div>
  );
}
