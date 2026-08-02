"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "done";
      estimate: { min: number; max: number } | null;
      subsidy: number | null;
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
    title: "Estimation en ligne",
    subtitle:
      "Choisissez votre système Gree, téléversez une photo de la plaque signalétique de votre équipement actuel et obtenez une fourchette de prix approximative.",
    installType: "Type d’installation",
    installTypeReplace: "Remplacement d’une thermopompe existante",
    installTypeNew: "Nouvelle installation",
    productLine: "Gamme de produit",
    equipType: "Type d’équipement",
    choose: "Choisir",
    capacity: "Capacité",
    completePrompt:
      "Faites une sélection complète pour continuer vers l’estimation.",
    noMatch: "Aucun modèle Gree correspondant trouvé.",
    multiMatch: "Plusieurs combinaisons possibles — précisez votre choix :",
    line: "Gamme",
    type: "Type",
    outdoorUnit: "Unité extérieure",
    indoorUnit: "Unité intérieure",
    quantityLabel: "Nombre d’appareils",
    contactSection: "Vos coordonnées",
    nameLabel: "Nom complet",
    phoneLabel: "Téléphone",
    emailLabel: "Courriel (optionnel)",
    photosSection: "Photos de votre équipement actuel",
    photoHint:
      "La plaque signalétique est l’étiquette (souvent métallique) collée sur l’appareil, avec le numéro de modèle et de série.",
    outdoorPhoto: "Plaque signalétique — unité extérieure (obligatoire)",
    indoorPhoto: "Plaque signalétique — unité intérieure (optionnel)",
    newInstallPhotoHint:
      "Nouvelle installation? Envoyez plutôt une photo de l’emplacement prévu.",
    getEstimate: "Obtenir mon estimation",
    submitting: "Envoi des photos en cours…",
    missingFields:
      "Veuillez indiquer votre nom, votre téléphone et téléverser la photo de la plaque extérieure.",
    estimateTitle: "Fourchette estimée — installation complète, taxes incluses",
    estimateNote:
      "Estimation approximative à titre indicatif seulement — le prix final est confirmé lors d'une visite sur place. Nous vous contactons rapidement pour la planifier.",
    subsidyLine: "Subvention LogisVert admissible :",
    subsidyNote: "On s'occupe de tous les documents pour vous.",
    brochure: "Télécharger la brochure (PDF)",
    pendingTitle: "Photos bien reçues!",
    pendingBody:
      "Merci! Nous vérifions votre équipement et vous rappelons rapidement pour planifier une visite et confirmer votre prix — sans frais.",
    callUs: "Appelez-nous : " + PHONE_DISPLAY,
    errorTitle: "L’envoi a échoué",
    footerNote: "Un service de Groupe DPSD Inc",
    langToggle: "EN",
  },
  en: {
    brandTag: "Air Conditioning, Heating, Ventilation",
    backToSite: "← Back to site",
    title: "Online Estimate",
    subtitle:
      "Pick your Gree system, upload a photo of your current equipment's nameplate and get a ballpark price range.",
    installType: "Installation type",
    installTypeReplace: "Replacement of an existing heat pump",
    installTypeNew: "New installation",
    productLine: "Product line",
    equipType: "Equipment type",
    choose: "Select",
    capacity: "Capacity",
    completePrompt: "Complete your selection to continue to the estimate.",
    noMatch: "No matching Gree model found.",
    multiMatch: "Several possible combinations — pick one:",
    line: "Line",
    type: "Type",
    outdoorUnit: "Outdoor unit",
    indoorUnit: "Indoor unit",
    quantityLabel: "Number of units",
    contactSection: "Your contact information",
    nameLabel: "Full name",
    phoneLabel: "Phone",
    emailLabel: "Email (optional)",
    photosSection: "Photos of your current equipment",
    photoHint:
      "The nameplate is the label (often metal) on the unit showing the model and serial number.",
    outdoorPhoto: "Nameplate — outdoor unit (required)",
    indoorPhoto: "Nameplate — indoor unit (optional)",
    newInstallPhotoHint:
      "New installation? Send a photo of the planned location instead.",
    getEstimate: "Get my estimate",
    submitting: "Uploading your photos…",
    missingFields:
      "Please enter your name and phone, and upload the outdoor nameplate photo.",
    estimateTitle: "Estimated range — complete installation, taxes included",
    estimateNote:
      "Ballpark estimate for guidance only — the final price is confirmed with an on-site visit. We'll contact you shortly to schedule it.",
    subsidyLine: "Eligible LogisVert rebate:",
    subsidyNote: "We handle all the paperwork for you.",
    brochure: "Download the brochure (PDF)",
    pendingTitle: "Photos received!",
    pendingBody:
      "Thanks! We're reviewing your equipment and will call you back shortly to schedule a visit and confirm your price — free of charge.",
    callUs: "Call us: " + PHONE_DISPLAY,
    errorTitle: "The submission failed",
    footerNote: "A service of Groupe DPSD Inc",
    langToggle: "FR",
  },
} as const;

function familyKey(line: ProductLine): string {
  if (line === "Flexx Central" || line === "Flexx Add-On") return "flexx";
  return line.toLowerCase();
}

function productImage(option: GreeOption): string {
  switch (option.equipmentType) {
    case "Cassette":
      return "/products/cassette.png";
    case "Console":
      return "/products/console.png";
    case "Gainable":
      return "/products/gainable.png";
    case "Air Handler":
      return "/products/airhandler.png";
    case "Cased Coil":
      return "/products/coil.png";
    case "Sans conduits":
    case "Avec conduits":
    case "Mix":
      return "/products/multizone.png";
    default: {
      const key = familyKey(option.line);
      return `/products/${key === "flexx" ? "flexx36" : key}.png`;
    }
  }
}

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
  const [installationType, setInstallationType] =
    useState<InstallationType>("Remplacement d’une thermopompe existante");
  const [quantity, setQuantity] = useState(1);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [outdoorFile, setOutdoorFile] = useState<File | null>(null);
  const [indoorFile, setIndoorFile] = useState<File | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  const outdoorInputRef = useRef<HTMLInputElement>(null);
  const indoorInputRef = useRef<HTMLInputElement>(null);

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

  const formComplete =
    Boolean(selectedOption) &&
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    outdoorFile !== null;

  function resetSubmit() {
    setSubmit({ status: "idle" });
  }

  function handleLineChange(line: ProductLine) {
    setSelectedLine(line);
    setSelectedType("");
    setSelectedSize("");
    resetSubmit();
  }

  async function handleSubmit() {
    if (!selectedOption) return;
    if (!formComplete) {
      setSubmit({ status: "error", message: t.missingFields });
      return;
    }

    setSubmit({ status: "submitting" });

    try {
      const form = new FormData();
      form.set("name", name.trim());
      form.set("phone", phone.trim());
      form.set("email", email.trim());
      form.set("optionId", selectedOption.id);
      form.set("installationType", installationType);
      form.set("quantity", String(quantity));
      form.set("lang", lang);
      if (outdoorFile) form.set("outdoorPhoto", outdoorFile);
      if (indoorFile) form.set("indoorPhoto", indoorFile);

      const res = await fetch("/api/estimate", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(
          data?.error ||
            (lang === "fr" ? "Une erreur est survenue." : "Something went wrong.")
        );
      }

      setSubmit({
        status: "done",
        estimate: data.estimate ?? null,
        subsidy: data.subsidy ?? null,
      });
    } catch (error) {
      setSubmit({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : lang === "fr"
              ? "Une erreur est survenue."
              : "Something went wrong.",
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
                      resetSubmit();
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
                        resetSubmit();
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
                      resetSubmit();
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
                          resetSubmit();
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
                  <div className="product-row">
                    <img
                      className="product-shot"
                      src={productImage(selectedOption)}
                      alt={selectedOption.line}
                    />
                    <div className="product-meta">
                      <img
                        className="product-logo"
                        src={`/products/${familyKey(selectedOption.line)}logo.png`}
                        alt={selectedOption.line}
                      />
                      <a
                        href={`/brochures/brochure-${familyKey(selectedOption.line)}-${lang}.pdf`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.brochure}
                      </a>
                    </div>
                  </div>
                  <div className="summary-grid">
                    <InfoCard label={t.line} value={selectedOption.line} />
                    <InfoCard
                      label={t.type}
                      value={equipmentLabel(selectedOption.equipmentType)}
                    />
                    <InfoCard label={t.capacity} value={selectedOption.sizeLabel} />
                    <InfoCard
                      label={t.outdoorUnit}
                      value={selectedOption.outdoorUnit}
                    />
                  </div>

                  <div className="form-grid" style={{ marginTop: "1.1rem" }}>
                    <div className="field">
                      <label>{t.quantityLabel}</label>
                      <div className="stepper">
                        <button
                          type="button"
                          onClick={() => {
                            setQuantity((prev) => Math.max(1, prev - 1));
                            resetSubmit();
                          }}
                        >
                          −
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setQuantity((prev) => prev + 1);
                            resetSubmit();
                          }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <h3 className="section-title">{t.contactSection}</h3>
                  <div className="form-grid">
                    <div className="field">
                      <label>{t.nameLabel}</label>
                      <input
                        type="text"
                        value={name}
                        autoComplete="name"
                        onChange={(e) => {
                          setName(e.target.value);
                          resetSubmit();
                        }}
                      />
                    </div>
                    <div className="field">
                      <label>{t.phoneLabel}</label>
                      <input
                        type="tel"
                        value={phone}
                        autoComplete="tel"
                        onChange={(e) => {
                          setPhone(e.target.value);
                          resetSubmit();
                        }}
                      />
                    </div>
                    <div className="field full">
                      <label>{t.emailLabel}</label>
                      <input
                        type="email"
                        value={email}
                        autoComplete="email"
                        onChange={(e) => {
                          setEmail(e.target.value);
                          resetSubmit();
                        }}
                      />
                    </div>
                  </div>

                  <h3 className="section-title">{t.photosSection}</h3>
                  <p className="photo-hint">
                    {t.photoHint}
                    {installationType === "Nouvelle installation"
                      ? ` ${t.newInstallPhotoHint}`
                      : ""}
                  </p>
                  <div className="form-grid">
                    <PhotoField
                      label={t.outdoorPhoto}
                      file={outdoorFile}
                      inputRef={outdoorInputRef}
                      required
                      onChange={(f) => {
                        setOutdoorFile(f);
                        resetSubmit();
                      }}
                    />
                    <PhotoField
                      label={t.indoorPhoto}
                      file={indoorFile}
                      inputRef={indoorInputRef}
                      onChange={(f) => {
                        setIndoorFile(f);
                        resetSubmit();
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    disabled={!formComplete || submit.status === "submitting"}
                    onClick={handleSubmit}
                  >
                    {submit.status === "submitting" ? t.submitting : t.getEstimate}
                  </button>

                  {submit.status === "idle" && !formComplete && (
                    <div className="status hint">{t.missingFields}</div>
                  )}

                  {submit.status === "done" && submit.estimate && (
                    <div className="result">
                      <div className="kicker">{t.estimateTitle}</div>
                      <div className="amount">
                        {currency.format(submit.estimate.min)} –{" "}
                        {currency.format(submit.estimate.max)}
                      </div>
                      {submit.subsidy ? (
                        <p className="subsidy">
                          {t.subsidyLine}{" "}
                          <strong>{currency.format(submit.subsidy)}</strong> —{" "}
                          {t.subsidyNote}
                        </p>
                      ) : null}
                      <p>{t.estimateNote}</p>
                      <img
                        className="badge-chip"
                        src={`/products/guarantee-${lang}.png`}
                        alt="10+2"
                      />
                    </div>
                  )}

                  {submit.status === "done" && !submit.estimate && (
                    <div className="pending">
                      <h3>{t.pendingTitle}</h3>
                      {submit.subsidy ? (
                        <p className="subsidy">
                          {t.subsidyLine}{" "}
                          <strong>{currency.format(submit.subsidy)}</strong> —{" "}
                          {t.subsidyNote}
                        </p>
                      ) : null}
                      <p>{t.pendingBody}</p>
                      <a className="cta" href={`tel:${PHONE_TEL}`}>
                        {t.callUs}
                      </a>
                    </div>
                  )}

                  {submit.status === "error" && (
                    <div className="status error">
                      <strong>{t.errorTitle}</strong>
                      {submit.message}
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

function PhotoField({
  label,
  file,
  onChange,
  inputRef,
  required,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  required?: boolean;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className={`field photo-field${required ? " required" : ""}`}>
      <label>{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        <img className="photo-preview" src={previewUrl} alt="" />
      ) : null}
    </div>
  );
}
