"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GREE_OPTIONS,
  LINE_ORDER,
  type EquipmentType,
  type GreeOption,
  type ProductLine,
} from "../lib/gree-options";

type Lang = "fr" | "en";

type InstallationType =
  | "Remplacement d’une thermopompe existante"
  | "Nouvelle installation";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "pending" }
  | {
      status: "success";
      amount: number;
      installationDate: string;
      source?: string;
    }
  | { status: "error"; message: string };

const SITE_URL = "https://dpsdair.ca";
const PHONE_DISPLAY = "(514) 969-8786";
const PHONE_TEL = "+15149698786";
const EMAIL = "renovationsdp@gmail.com";

const STRINGS = {
  fr: {
    brandTag: "Airclimatisé, Chauffage, Ventilation",
    backToSite: "← Retour au site",
    title: "Calculateur de subvention LogisVert",
    subtitle:
      "Choisissez votre thermopompe Gree : le numéro AHRI est trouvé automatiquement et le montant d'aide financière est vérifié pour vous.",
    installType: "Type d’installation",
    installTypeReplace: "Remplacement d’une thermopompe existante",
    installTypeNew: "Nouvelle installation",
    installDate: "Date d’installation",
    productLine: "Gamme de produit",
    equipType: "Type d’équipement",
    choose: "Choisir",
    capacity: "Capacité",
    completePrompt:
      "Faites une sélection complète pour lancer la vérification LogisVert.",
    noMatch: "Aucun modèle Gree correspondant trouvé.",
    multiMatch: "Plusieurs combinaisons possibles — précisez votre choix :",
    line: "Gamme",
    type: "Type",
    outdoorUnit: "Unité extérieure",
    indoorUnit: "Unité intérieure",
    ahriNumber: "Numéro AHRI du modèle",
    quantityLabel: "Nombre d’appareils installés",
    calculate: "Calculer l’aide financière",
    idleNote: "Le montant s’affichera après la vérification.",
    loading: "Vérification du montant en cours…",
    successTitle: "Aide financière estimée",
    foundFor: "Montant trouvé pour l’AHRI",
    dateUsed: "Date d’installation utilisée :",
    source: "Source :",
    errorTitle: "La vérification a échoué",
    pendingTitle: "Montant à confirmer",
    pendingBody:
      "Ce modèle est admissible, mais le montant exact dépend de votre situation. Contactez-nous et nous vous le confirmons rapidement — sans frais.",
    pendingCta: "Appelez-nous : " + PHONE_DISPLAY,
    footerNote: "Un service de Groupe DPSD Inc",
    langToggle: "EN",
  },
  en: {
    brandTag: "Air Conditioning, Heating, Ventilation",
    backToSite: "← Back to site",
    title: "LogisVert Rebate Calculator",
    subtitle:
      "Pick your Gree heat pump: the AHRI number is found automatically and the rebate amount is checked for you.",
    installType: "Installation type",
    installTypeReplace: "Replacement of an existing heat pump",
    installTypeNew: "New installation",
    installDate: "Installation date",
    productLine: "Product line",
    equipType: "Equipment type",
    choose: "Select",
    capacity: "Capacity",
    completePrompt: "Complete your selection to run the LogisVert check.",
    noMatch: "No matching Gree model found.",
    multiMatch: "Several possible combinations — pick one:",
    line: "Line",
    type: "Type",
    outdoorUnit: "Outdoor unit",
    indoorUnit: "Indoor unit",
    ahriNumber: "Model AHRI number",
    quantityLabel: "Number of units installed",
    calculate: "Calculate my rebate",
    idleNote: "The amount will appear after the check.",
    loading: "Checking the current amount…",
    successTitle: "Estimated rebate",
    foundFor: "Amount found for AHRI",
    dateUsed: "Installation date used:",
    source: "Source:",
    errorTitle: "The check failed",
    pendingTitle: "Amount to be confirmed",
    pendingBody:
      "This model is eligible, but the exact amount depends on your situation. Contact us and we'll confirm it quickly — free of charge.",
    pendingCta: "Call us: " + PHONE_DISPLAY,
    footerNote: "A service of Groupe DPSD Inc",
    langToggle: "FR",
  },
} as const;

const EQUIPMENT_LABELS_EN: Record<EquipmentType, string> = {
  Murale: "Wall-mounted",
  Cassette: "Cassette",
  Console: "Console",
  Gainable: "Ducted",
  "Sans conduits": "Ductless",
  "Avec conduits": "Ducted",
  Mix: "Mixed",
  "Air Handler": "Air handler",
  "Cased Coil": "Cased coil",
};

export default function Page() {
  const [lang, setLang] = useState<Lang>("fr");
  const [selectedLine, setSelectedLine] = useState<ProductLine>("Charmo");
  const [selectedType, setSelectedType] = useState<EquipmentType | "">("");
  const [selectedSize, setSelectedSize] = useState("");
  const [installationDate, setInstallationDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [installationType, setInstallationType] =
    useState<InstallationType>("Remplacement d’une thermopompe existante");
  const [quantity, setQuantity] = useState(1);
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lang") === "en") setLang("en");
  }, []);

  const t = STRINGS[lang];

  const currency = useMemo(
    () =>
      new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", {
        style: "currency",
        currency: "CAD",
        maximumFractionDigits: 0,
      }),
    [lang]
  );

  function equipmentLabel(type: EquipmentType): string {
    return lang === "en" ? EQUIPMENT_LABELS_EN[type] : type;
  }

  function toggleLang() {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    const url = new URL(window.location.href);
    if (next === "en") url.searchParams.set("lang", "en");
    else url.searchParams.delete("lang");
    window.history.replaceState(null, "", url.toString());
  }

  const lineOptions = useMemo(() => {
    return GREE_OPTIONS.filter((item) => item.line === selectedLine);
  }, [selectedLine]);

  const equipmentTypes = useMemo(() => {
    return Array.from(new Set(lineOptions.map((item) => item.equipmentType)));
  }, [lineOptions]);

  const sizeOptions = useMemo(() => {
    return Array.from(
      new Set(
        lineOptions
          .filter((item) => !selectedType || item.equipmentType === selectedType)
          .map((item) => item.sizeLabel)
      )
    );
  }, [lineOptions, selectedType]);

  const matchingOptions = useMemo(() => {
    return lineOptions.filter((item) => {
      const typeMatch = !selectedType || item.equipmentType === selectedType;
      const sizeMatch = !selectedSize || item.sizeLabel === selectedSize;
      return typeMatch && sizeMatch;
    });
  }, [lineOptions, selectedType, selectedSize]);

  const selectedOption: GreeOption | null =
    matchingOptions.length === 1 ? matchingOptions[0] : null;

  const showTypeDropdown =
    selectedLine !== "Flexx Central" && selectedLine !== "Flexx Add-On";

  function resetLookup() {
    setLookup({ status: "idle" });
  }

  function handleLineChange(line: ProductLine) {
    setSelectedLine(line);
    setSelectedType("");
    setSelectedSize("");
    resetLookup();
  }

  async function handleLiveLookup() {
    if (!selectedOption) return;

    setLookup({ status: "loading" });

    try {
      const params = new URLSearchParams({
        ahri: selectedOption.ahri,
        installationDate,
        installationType,
        quantity: String(quantity),
      });

      const res = await fetch(`/api/logisvert-rebate?${params.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(
          data?.error ||
            (lang === "fr"
              ? "Impossible de récupérer le montant actuel."
              : "Unable to retrieve the current amount.")
        );
      }

      if (data.pending || data.amount === null) {
        setLookup({ status: "pending" });
        return;
      }

      setLookup({
        status: "success",
        amount: Number(data.amount ?? 0),
        installationDate: data.installationDate ?? installationDate,
        source: data.source,
      });
    } catch (error) {
      setLookup({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : lang === "fr"
              ? "Échec de la vérification."
              : "The check failed.",
      });
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <a className="brand" href={lang === "en" ? `${SITE_URL}/en/` : SITE_URL}>
            <img src="/logo-mark.png" alt="Groupe DPSD" />
            <span>
              Groupe DPSD Inc
              <small>{t.brandTag}</small>
            </span>
          </a>
          <div className="header-actions">
            <a
              className="back-link"
              href={lang === "en" ? `${SITE_URL}/en/` : SITE_URL}
            >
              {t.backToSite}
            </a>
            <button type="button" className="lang-switch" onClick={toggleLang}>
              {t.langToggle}
            </button>
          </div>
        </div>
      </header>

      <main>
        <section className="intro">
          <div className="container">
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
        </section>

        <section className="page-body">
          <div className="container">
            <div className="card">
              <div className="form-grid">
                <div className="field">
                  <label>{t.installType}</label>
                  <select
                    value={installationType}
                    onChange={(e) => {
                      setInstallationType(e.target.value as InstallationType);
                      resetLookup();
                    }}
                  >
                    <option value="Remplacement d’une thermopompe existante">
                      {t.installTypeReplace}
                    </option>
                    <option value="Nouvelle installation">
                      {t.installTypeNew}
                    </option>
                  </select>
                </div>

                <div className="field">
                  <label>{t.installDate}</label>
                  <input
                    type="date"
                    value={installationDate}
                    onChange={(e) => {
                      setInstallationDate(e.target.value);
                      resetLookup();
                    }}
                  />
                </div>

                <div className="field full">
                  <label>{t.productLine}</label>
                  <select
                    value={selectedLine}
                    onChange={(e) =>
                      handleLineChange(e.target.value as ProductLine)
                    }
                  >
                    {LINE_ORDER.map((line) => (
                      <option key={line} value={line}>
                        {line}
                      </option>
                    ))}
                  </select>
                </div>

                {showTypeDropdown && (
                  <div className="field">
                    <label>{t.equipType}</label>
                    <select
                      value={selectedType}
                      onChange={(e) => {
                        setSelectedType(e.target.value as EquipmentType);
                        setSelectedSize("");
                        resetLookup();
                      }}
                    >
                      <option value="">{t.choose}</option>
                      {equipmentTypes.map((type) => (
                        <option key={type} value={type}>
                          {equipmentLabel(type)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="field">
                  <label>{t.capacity}</label>
                  <select
                    value={selectedSize}
                    onChange={(e) => {
                      setSelectedSize(e.target.value);
                      resetLookup();
                    }}
                  >
                    <option value="">{t.choose}</option>
                    {sizeOptions.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedSize ? (
                <div className="status hint">{t.completePrompt}</div>
              ) : matchingOptions.length === 0 ? (
                <div className="status error">
                  <strong>{t.noMatch}</strong>
                </div>
              ) : matchingOptions.length > 1 && !selectedOption ? (
                <div className="status warn">
                  {t.multiMatch}
                  <div className="choice-list">
                    {matchingOptions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedType(item.equipmentType);
                          setSelectedSize(item.sizeLabel);
                          resetLookup();
                        }}
                      >
                        <div className="title">
                          {item.line} · {equipmentLabel(item.equipmentType)} ·{" "}
                          {item.sizeLabel}
                        </div>
                        <div className="sub">AHRI: {item.ahri}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : selectedOption ? (
                <div className="summary">
                  <div className="summary-grid">
                    <InfoCard label={t.line} value={selectedOption.line} />
                    <InfoCard
                      label={t.type}
                      value={equipmentLabel(selectedOption.equipmentType)}
                    />
                    <InfoCard label={t.capacity} value={selectedOption.sizeLabel} />
                    <InfoCard label="AHRI" value={selectedOption.ahri} />
                    <InfoCard
                      label={t.outdoorUnit}
                      value={selectedOption.outdoorUnit}
                    />
                    <InfoCard
                      label={t.indoorUnit}
                      value={selectedOption.indoorUnit}
                    />
                  </div>

                  <div className="form-grid" style={{ marginTop: "1.1rem" }}>
                    <div className="field">
                      <label>{t.ahriNumber}</label>
                      <input type="text" value={selectedOption.ahri} readOnly />
                    </div>

                    <div className="field">
                      <label>{t.quantityLabel}</label>
                      <div className="stepper">
                        <button
                          type="button"
                          onClick={() => {
                            setQuantity((prev) => Math.max(1, prev - 1));
                            resetLookup();
                          }}
                        >
                          −
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuantity((prev) => prev + 1);
                            resetLookup();
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleLiveLookup}
                  >
                    {t.calculate}
                  </button>

                  {lookup.status === "idle" && (
                    <div className="status hint">{t.idleNote}</div>
                  )}

                  {lookup.status === "loading" && (
                    <div className="status loading">{t.loading}</div>
                  )}

                  {lookup.status === "success" && (
                    <div className="result">
                      <div className="kicker">{t.successTitle}</div>
                      <div className="amount">{currency.format(lookup.amount)}</div>
                      <p>
                        {t.foundFor} {selectedOption.ahri}
                      </p>
                      <p>
                        {t.dateUsed} {lookup.installationDate}
                      </p>
                      {lookup.source ? (
                        <p>
                          {t.source} {lookup.source}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {lookup.status === "pending" && (
                    <div className="pending">
                      <h3>{t.pendingTitle}</h3>
                      <p>{t.pendingBody}</p>
                      <a className="cta" href={`tel:${PHONE_TEL}`}>
                        {t.pendingCta}
                      </a>
                    </div>
                  )}

                  {lookup.status === "error" && (
                    <div className="status error">
                      <strong>{t.errorTitle}</strong>
                      {lookup.message}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>{t.footerNote}</span>
          <span>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> · {PHONE_DISPLAY}
          </span>
        </div>
      </footer>
    </>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
