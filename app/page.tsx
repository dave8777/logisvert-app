"use client";

import { useEffect, useMemo, useState } from "react";

type Lang = "fr" | "en";
type SystemType = "murale" | "centrale";

type InstallationType =
  | "Remplacement d’une thermopompe existante"
  | "Nouvelle installation";

type ResultOption = {
  key: string;
  available: boolean;
  estimate: { min: number; max: number; subsidy: number | null } | null;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "done";
      options: ResultOption[];
      inArea: boolean | null;
      emailSent: boolean;
      id: string;
      date: string;
    }
  | { status: "error"; message: string };

const SITE_URL = "https://dpsdair.ca";
const PHONE_DISPLAY = "(514) 969-8786";
const PHONE_TEL = "+15149698786";
const EMAIL = "renovationsdp@gmail.com";

const WALL_SIZES = ["12k", "18k", "24k", "36k"] as const;
const CENTRAL_TONS = ["2", "3", "4", "5"] as const;

// Visuel, marque et brochure par option (mêmes ressources que le site).
const OPTION_META: Record<
  string,
  { photo: string; logo: string | null; brochure: string | null }
> = {
  charmo: { photo: "/products/charmo.png", logo: "/products/charmologo.png", brochure: "charmo" },
  clivia: { photo: "/products/clivia.png", logo: "/products/clivialogo.png", brochure: "clivia" },
  airy: { photo: "/products/airy.png", logo: "/products/airylogo.png", brochure: "airy" },
  handler: { photo: "/products/airhandler.png", logo: "/products/flexxlogo.png", brochure: "flexx" },
  coil: { photo: "/products/coil.png", logo: "/products/flexxlogo.png", brochure: "flexx" },
};

const STRINGS = {
  fr: {
    brandTag: "Airclimatisé, Chauffage, Ventilation",
    backToSite: "← Retour au site",
    title: "Estimation en ligne",
    subtitle:
      "Choisissez votre type de système, téléversez quelques photos et recevez vos fourchettes de prix — toutes les options d'un coup, comme en magasin.",
    installType: "Type d’installation",
    installTypeReplace: "Remplacement d’une thermopompe existante",
    installTypeNew: "Nouvelle installation",
    systemType: "Type de système",
    systemWall: "Thermopompe murale",
    systemCentral: "Thermopompe centrale (conduits d'air)",
    capacity: "Capacité",
    choose: "Choisir",
    wallSize: (s: string) => `${s.replace("k", " 000")} BTU`,
    centralSize: (t: string) => `${t} tonnes`,
    quantityLabel: "Nombre d’appareils",
    multizoneNote:
      "Projet multizone (plusieurs pièces sur une seule unité extérieure)? Ces projets sont sur mesure —",
    multizoneCall: "appelez-nous",
    completePrompt: "Choisissez la capacité pour continuer.",
    contactSection: "Vos coordonnées",
    nameLabel: "Nom complet",
    phoneLabel: "Téléphone",
    emailLabel: "Courriel",
    emailHint: "Vos estimations vous seront envoyées à ce courriel.",
    addressLabel: "Adresse d’installation (optionnel)",
    cityLabel: "Ville",
    postalLabel: "Code postal",
    notesLabel: "Détails ou questions (optionnel)",
    outOfArea:
      "Votre secteur semble à l'extérieur de notre zone de service habituelle — nous confirmerons si nous pouvons vous servir.",
    photosSection: "Photos de votre installation",
    photoHint:
      "La plaque signalétique est l’étiquette (souvent métallique) collée sur l’appareil, avec le numéro de modèle et de série. Plus vous fournissez de photos, plus vos estimations seront précises.",
    photoExtNameplate: "Plaque signalétique — unité extérieure",
    photoExtUnit: "Unité extérieure — vue d’ensemble",
    photoIntNameplate: "Plaque signalétique — unité intérieure",
    photoIntUnit: "Unité intérieure — vue d’ensemble",
    photoPanel: "Panneau électrique (porte ouverte)",
    optional: "(optionnel)",
    newInstallPhotoHint:
      "Nouvelle installation? Envoyez plutôt des photos des emplacements prévus.",
    getEstimate: "Obtenir mes estimations",
    submitting: "Envoi des photos en cours…",
    detecting: "Lecture de votre plaque signalétique…",
    detectedTitle: "Unité détectée sur votre photo :",
    detectedQuestion: "Cherchez-vous à remplacer cette unité?",
    detectedYes: "Oui, remplacer cette unité",
    detectedNo: "Non / autre projet",
    detectedApplied:
      "Parfait — nous avons préréglé le formulaire pour un remplacement équivalent. Vous pouvez ajuster la capacité au besoin.",
    missingFields:
      "Veuillez indiquer votre nom, votre téléphone, votre courriel, votre code postal et téléverser la photo de la plaque extérieure.",
    viewPdf: "📄 Voir mon estimation (PDF)",
    resultsTitle: "Vos fourchettes estimées",
    resultsSub:
      "Installation complète, taxes incluses. Estimations à titre indicatif seulement — le prix final est confirmé lors d'une visite sur place. Nous vous contactons rapidement.",
    subsidyLine: "Subvention LogisVert admissible :",
    subsidyNote: "On s'occupe de tous les documents pour vous.",
    notOffered: "Non offert dans cette capacité",
    brochure: "Brochure (PDF)",
    emailedNote: "Une copie de vos estimations a été envoyée à votre courriel.",
    errorTitle: "L’envoi a échoué",
    optionNames: {
      charmo: ["Gree Charmo", "Chauffage jusqu'à −25 °C"],
      clivia: ["Gree Clivia", "Chauffage jusqu'à −30 °C"],
      airy: ["Gree Airy", "−30 °C — haute efficacité"],
      handler: ["Système complet", "Ventilo-convecteur neuf + appoint électrique"],
      coil: ["Sur fournaise existante", "Serpentin — votre fournaise en appoint"],
    } as Record<string, [string, string]>,
    footerNote: "Un service de Groupe DPSD Inc",
    langToggle: "EN",
  },
  en: {
    brandTag: "Air Conditioning, Heating, Ventilation",
    backToSite: "← Back to site",
    title: "Online Estimate",
    subtitle:
      "Pick your system type, upload a few photos and get your price ranges — every option at once, just like in-store.",
    installType: "Installation type",
    installTypeReplace: "Replacement of an existing heat pump",
    installTypeNew: "New installation",
    systemType: "System type",
    systemWall: "Wall-mounted heat pump",
    systemCentral: "Central heat pump (ductwork)",
    capacity: "Capacity",
    choose: "Select",
    wallSize: (s: string) => `${s.replace("k", ",000")} BTU`,
    centralSize: (t: string) => `${t} tons`,
    quantityLabel: "Number of units",
    multizoneNote:
      "Multi-zone project (several rooms on one outdoor unit)? Those are custom quoted —",
    multizoneCall: "call us",
    completePrompt: "Pick the capacity to continue.",
    contactSection: "Your contact information",
    nameLabel: "Full name",
    phoneLabel: "Phone",
    emailLabel: "Email",
    emailHint: "Your estimates will be sent to this email.",
    addressLabel: "Installation address (optional)",
    cityLabel: "City",
    postalLabel: "Postal code",
    notesLabel: "Details or questions (optional)",
    outOfArea:
      "Your area looks like it's outside our usual service zone — we'll confirm whether we can serve you.",
    photosSection: "Photos of your installation",
    photoHint:
      "The nameplate is the label (often metal) on the unit showing the model and serial number. The more photos you provide, the more accurate your estimates.",
    photoExtNameplate: "Nameplate — outdoor unit",
    photoExtUnit: "Outdoor unit — overall view",
    photoIntNameplate: "Nameplate — indoor unit",
    photoIntUnit: "Indoor unit — overall view",
    photoPanel: "Electrical panel (door open)",
    optional: "(optional)",
    newInstallPhotoHint:
      "New installation? Send photos of the planned locations instead.",
    getEstimate: "Get my estimates",
    submitting: "Uploading your photos…",
    detecting: "Reading your nameplate…",
    detectedTitle: "Unit detected on your photo:",
    detectedQuestion: "Are you looking to replace this unit?",
    detectedYes: "Yes, replace this unit",
    detectedNo: "No / different project",
    detectedApplied:
      "Perfect — we've preset the form for an equivalent replacement. You can adjust the capacity if needed.",
    missingFields:
      "Please enter your name, phone, email and postal code, and upload the outdoor nameplate photo.",
    viewPdf: "📄 View my estimate (PDF)",
    resultsTitle: "Your estimated ranges",
    resultsSub:
      "Complete installation, taxes included. Ballpark estimates for guidance only — the final price is confirmed with an on-site visit. We'll contact you shortly.",
    subsidyLine: "Eligible LogisVert rebate:",
    subsidyNote: "We handle all the paperwork for you.",
    notOffered: "Not offered in this capacity",
    brochure: "Brochure (PDF)",
    emailedNote: "A copy of your estimates has been sent to your email.",
    errorTitle: "The submission failed",
    optionNames: {
      charmo: ["Gree Charmo", "Heating down to −25 °C"],
      clivia: ["Gree Clivia", "Heating down to −30 °C"],
      airy: ["Gree Airy", "−30 °C — high efficiency"],
      handler: ["Complete system", "New air handler + electric backup"],
      coil: ["On existing furnace", "Cased coil — your furnace as backup"],
    } as Record<string, [string, string]>,
    footerNote: "A service of Groupe DPSD Inc",
    langToggle: "FR",
  },
} as const;

export default function Page() {
  const [lang, setLang] = useState<Lang>("fr");
  const [systemType, setSystemType] = useState<SystemType>("murale");
  const [sizeKey, setSizeKey] = useState("");
  const [installationType, setInstallationType] =
    useState<InstallationType>("Remplacement d’une thermopompe existante");
  const [quantity, setQuantity] = useState(1);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — humans leave it empty
  const [photos, setPhotos] = useState<Record<string, File | null>>({
    exteriorNameplate: null,
    exteriorUnit: null,
    interiorNameplate: null,
    interiorUnit: null,
    panel: null,
  });
  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });
  const [detection, setDetection] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | {
        status: "done";
        description: string;
        suggestion: { systemType: SystemType; sizeKey: string } | null;
      }
  >({ status: "idle" });
  const [replaceChoice, setReplaceChoice] = useState<"" | "yes" | "no">("");

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

  function toggleLang() {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    const url = new URL(window.location.href);
    if (next === "en") url.searchParams.set("lang", "en");
    else url.searchParams.delete("lang");
    window.history.replaceState(null, "", url.toString());
  }

  const sizeChoices: readonly string[] =
    systemType === "murale" ? WALL_SIZES : CENTRAL_TONS;

  const formComplete =
    sizeKey !== "" &&
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    postal.trim().replace(/\s/g, "").length >= 3 &&
    photos.exteriorNameplate !== null;

  function resetSubmit() {
    setSubmit({ status: "idle" });
  }

  // Lecture de la plaque extérieure (OCR via Workers AI) dès qu'une photo
  // est choisie — comme l'app de vente. Échec silencieux : le client peut
  // toujours continuer sans lecture.
  async function analyzeNameplate(file: File) {
    setDetection({ status: "loading" });
    setReplaceChoice("");
    try {
      const form = new FormData();
      form.set("photo", file);
      form.set("lang", lang);
      const res = await fetch("/api/nameplate", { method: "POST", body: form });
      const data = await res.json();
      if (data?.ok && data.description) {
        setDetection({
          status: "done",
          description: data.description as string,
          suggestion: data.suggestion ?? null,
        });
        return;
      }
    } catch {
      // silencieux
    }
    setDetection({ status: "idle" });
  }

  function confirmReplace() {
    setReplaceChoice("yes");
    setInstallationType("Remplacement d’une thermopompe existante");
    if (detection.status === "done" && detection.suggestion) {
      setSystemType(detection.suggestion.systemType);
      setSizeKey(detection.suggestion.sizeKey);
    }
    resetSubmit();
  }

  function handleSystemChange(next: SystemType) {
    setSystemType(next);
    setSizeKey("");
    setQuantity(1);
    resetSubmit();
  }

  async function handleSubmit() {
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
      form.set("address", address.trim());
      form.set("city", city.trim());
      form.set("postal", postal.trim());
      form.set("notes", notes.trim());
      form.set("website", website);
      form.set("systemType", systemType);
      form.set("sizeKey", sizeKey);
      form.set("installationType", installationType);
      form.set("quantity", String(systemType === "murale" ? quantity : 1));
      form.set("lang", lang);
      form.set(
        "detectedUnit",
        detection.status === "done" ? detection.description : ""
      );
      form.set("replaceConfirmed", replaceChoice);
      for (const [key, file] of Object.entries(photos)) {
        if (file) form.set(key, file);
      }

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
        options: (data.options ?? []) as ResultOption[],
        inArea: data.inArea ?? null,
        emailSent: Boolean(data.emailSent),
        id: String(data.id ?? ""),
        date: String(data.date ?? ""),
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
                  <label>{t.systemType}</label>
                  <select
                    value={systemType}
                    onChange={(e) =>
                      handleSystemChange(e.target.value as SystemType)
                    }
                  >
                    <option value="murale">{t.systemWall}</option>
                    <option value="centrale">{t.systemCentral}</option>
                  </select>
                </div>

                <div className="field">
                  <label>{t.capacity}</label>
                  <select
                    value={sizeKey}
                    onChange={(e) => {
                      setSizeKey(e.target.value);
                      resetSubmit();
                    }}
                  >
                    <option value="">{t.choose}</option>
                    {sizeChoices.map((s) => (
                      <option key={s} value={s}>
                        {systemType === "murale"
                          ? t.wallSize(s)
                          : t.centralSize(s)}
                      </option>
                    ))}
                  </select>
                </div>

                {systemType === "murale" ? (
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
                ) : null}
              </div>

              <p className="photo-hint" style={{ marginTop: "0.9rem" }}>
                {t.multizoneNote}{" "}
                <a href={`tel:${PHONE_TEL}`}>{t.multizoneCall}</a> —{" "}
                {PHONE_DISPLAY}.
              </p>

              {!sizeKey ? (
                <div className="status hint">{t.completePrompt}</div>
              ) : (
                <div className="summary">
                  <h3 className="section-title" style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}>
                    {t.contactSection}
                  </h3>
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
                      <p className="field-hint">{t.emailHint}</p>
                    </div>
                    <div className="field full">
                      <label>{t.addressLabel}</label>
                      <input
                        type="text"
                        value={address}
                        autoComplete="street-address"
                        onChange={(e) => {
                          setAddress(e.target.value);
                          resetSubmit();
                        }}
                      />
                    </div>
                    <div className="field">
                      <label>{t.cityLabel}</label>
                      <input
                        type="text"
                        value={city}
                        autoComplete="address-level2"
                        onChange={(e) => {
                          setCity(e.target.value);
                          resetSubmit();
                        }}
                      />
                    </div>
                    <div className="field">
                      <label>{t.postalLabel}</label>
                      <input
                        type="text"
                        value={postal}
                        autoComplete="postal-code"
                        onChange={(e) => {
                          setPostal(e.target.value);
                          resetSubmit();
                        }}
                      />
                    </div>
                    <div className="field full">
                      <label>{t.notesLabel}</label>
                      <textarea
                        rows={3}
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          resetSubmit();
                        }}
                      />
                    </div>
                    <input
                      type="text"
                      name="website"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="hp-field"
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden="true"
                    />
                  </div>

                  <h3 className="section-title">{t.photosSection}</h3>
                  <p className="photo-hint">
                    {t.photoHint}
                    {installationType === "Nouvelle installation"
                      ? ` ${t.newInstallPhotoHint}`
                      : ""}
                  </p>
                  <div className="form-grid">
                    {(
                      [
                        ["exteriorNameplate", t.photoExtNameplate, true],
                        ["exteriorUnit", t.photoExtUnit, false],
                        ["interiorNameplate", t.photoIntNameplate, false],
                        ["interiorUnit", t.photoIntUnit, false],
                        ["panel", t.photoPanel, false],
                      ] as [string, string, boolean][]
                    ).map(([key, label, required]) => (
                      <PhotoField
                        key={key}
                        label={required ? label : `${label} ${t.optional}`}
                        file={photos[key]}
                        required={required}
                        onChange={(f) => {
                          setPhotos((prev) => ({ ...prev, [key]: f }));
                          resetSubmit();
                          if (key === "exteriorNameplate") {
                            if (f) void analyzeNameplate(f);
                            else setDetection({ status: "idle" });
                          }
                        }}
                      />
                    ))}
                  </div>

                  {detection.status === "loading" && (
                    <div className="status loading">{t.detecting}</div>
                  )}

                  {detection.status === "done" && (
                    <div className="detect-card">
                      <div className="detect-title">{t.detectedTitle}</div>
                      <div className="detect-desc">{detection.description}</div>
                      {replaceChoice === "" ? (
                        <>
                          <div className="detect-question">
                            {t.detectedQuestion}
                          </div>
                          <div className="detect-actions">
                            <button type="button" onClick={confirmReplace}>
                              {t.detectedYes}
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => setReplaceChoice("no")}
                            >
                              {t.detectedNo}
                            </button>
                          </div>
                        </>
                      ) : replaceChoice === "yes" ? (
                        <div className="detect-applied">{t.detectedApplied}</div>
                      ) : null}
                    </div>
                  )}

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

                  {submit.status === "done" && (
                    <div className="results">
                      <h3>{t.resultsTitle}</h3>
                      <p className="results-sub">{t.resultsSub}</p>
                      <div className="tier-grid">
                        {submit.options.map((o) => {
                          const meta = OPTION_META[o.key];
                          const [optName, optTag] = t.optionNames[o.key] ?? [
                            o.key,
                            "",
                          ];
                          return (
                            <div
                              key={o.key}
                              className={`tier-card${o.available && o.estimate ? "" : " unavailable"}`}
                            >
                              {meta ? (
                                <img
                                  className="tier-photo"
                                  src={meta.photo}
                                  alt={optName}
                                />
                              ) : null}
                              <div className="tier-name">{optName}</div>
                              <div className="tier-tag">{optTag}</div>
                              {o.available && o.estimate ? (
                                <>
                                  <div className="tier-range">
                                    {currency.format(o.estimate.min)} –{" "}
                                    {currency.format(o.estimate.max)}
                                  </div>
                                  {o.estimate.subsidy ? (
                                    <div className="tier-subsidy">
                                      {t.subsidyLine}{" "}
                                      <strong>
                                        {currency.format(o.estimate.subsidy)}
                                      </strong>
                                    </div>
                                  ) : null}
                                  {meta?.brochure ? (
                                    <a
                                      className="tier-brochure"
                                      href={`/brochures/brochure-${meta.brochure}-${lang}.pdf`}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {t.brochure}
                                    </a>
                                  ) : null}
                                </>
                              ) : (
                                <div className="tier-none">{t.notOffered}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {submit.id && submit.date ? (
                        <a
                          className="doc-link"
                          href={`/estimation?id=${submit.id}&date=${submit.date}&lang=${lang}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t.viewPdf}
                        </a>
                      ) : null}
                      <p className="results-note">{t.subsidyNote}</p>
                      {submit.emailSent ? (
                        <p className="results-note">{t.emailedNote}</p>
                      ) : null}
                      {submit.inArea === false ? (
                        <p className="results-note warn-note">{t.outOfArea}</p>
                      ) : null}
                      <img
                        className="badge-chip"
                        src={`/products/guarantee-${lang}.png`}
                        alt="10+2"
                      />
                    </div>
                  )}

                  {submit.status === "error" && (
                    <div className="status error">
                      <strong>{t.errorTitle}</strong>
                      {submit.message}
                    </div>
                  )}
                </div>
              )}
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

function PhotoField({
  label,
  file,
  onChange,
  required,
}: {
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
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
