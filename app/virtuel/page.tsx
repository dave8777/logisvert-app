"use client";

import { useEffect, useState } from "react";

type Lang = "fr" | "en";
type UnitType = "" | "murale" | "centrale";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "done"; slotDate: string; slotTime: string; emailSent: boolean }
  | { status: "error"; message: string };

const SITE_URL = "https://dpsdair.ca";
const PHONE_DISPLAY = "(514) 969-8786";
const PHONE_TEL = "+15149698786";
const EMAIL = "info@dpsdair.ca";
const MAX_EXTRA = 5;

const STRINGS = {
  fr: {
    brandTag: "Airclimatisé, Chauffage, Ventilation",
    backToSite: "← Retour au site",
    title: "Estimation virtuelle",
    subtitle:
      "Envoyez-nous quelques photos, choisissez un moment qui vous convient, et rencontrons-nous virtuellement pour passer votre estimation en revue — sans attendre une visite.",
    stepsIntro: [
      ["1", "Vos photos", "5 photos guidées, 5 minutes"],
      ["2", "Votre créneau", "Rencontre vidéo ou téléphone"],
      ["3", "Votre estimation", "Toutes vos options, expliquées"],
    ] as [string, string, string][],
    typeSection: "Quel type de système avez-vous?",
    typeWall: "Thermopompe murale",
    typeWallDesc: "Unité intérieure au mur, unité extérieure au sol ou sur supports",
    typeCentral: "Thermopompe centrale",
    typeCentralDesc: "Conduits d'air, ventilo-convecteur ou fournaise au sous-sol",
    npGuideTitle: "Où trouver les plaques signalétiques?",
    npGuideWall:
      "Unité intérieure : soulevez le panneau avant de l'unité murale — l'étiquette avec le numéro de modèle est sur le côté droit ou sous le couvercle. Unité extérieure : l'étiquette (souvent métallique) est collée sur le panneau latéral, près des tuyaux.",
    npGuideCentral:
      "Unité intérieure : l'étiquette est sur le caisson du ventilo-convecteur ou de la fournaise, souvent à l'intérieur du panneau avant ou sur le côté. Unité extérieure : l'étiquette est sur le panneau latéral du condenseur, près des tuyaux.",
    photosSection: "Vos 5 photos",
    photoHint:
      "Prenez les photos bien éclairées et lisibles — c'est ce qui nous permet de préparer une estimation précise avant la rencontre.",
    photoIntNameplate: "Plaque signalétique — unité intérieure",
    photoIntSpace: "Unité intérieure et son espace (vue d'ensemble)",
    photoExtNameplate: "Plaque signalétique — unité extérieure",
    photoExtSpace: "Unité extérieure et son espace (vue d'ensemble)",
    photoPanel: "Panneau électrique (porte ouverte)",
    extraSection: "Photos supplémentaires (optionnel)",
    extraHint:
      "Tout ce qui vous semble utile : autre angle, pièce à climatiser, contrainte d'installation…",
    addExtra: "+ Ajouter une photo",
    contactSection: "Vos coordonnées",
    nameLabel: "Nom complet",
    phoneLabel: "Téléphone",
    emailLabel: "Courriel",
    emailHint: "La confirmation et le lien de rencontre seront envoyés à ce courriel.",
    addressLabel: "Adresse (optionnel)",
    cityLabel: "Ville",
    postalLabel: "Code postal",
    notesLabel: "Détails ou questions (optionnel)",
    slotSection: "Choisissez votre créneau",
    slotHint:
      "Rencontre d'environ 30 minutes, par vidéo ou téléphone — du lundi au vendredi, de 9 h à 17 h.",
    slotLoading: "Chargement des disponibilités…",
    slotNone: "Aucun créneau disponible ce jour-là — choisissez une autre journée.",
    submit: "Réserver ma rencontre",
    submitting: "Envoi des photos en cours…",
    missingFields:
      "Veuillez choisir votre type de système, fournir les 5 photos, vos coordonnées (nom, téléphone, courriel, code postal) et choisir un créneau.",
    doneTitle: "Votre rencontre est réservée!",
    doneSlot: "Votre créneau :",
    doneNext:
      "Nous vous confirmerons le rendez-vous et vous enverrons le lien de la rencontre (vidéo ou téléphone, à votre choix). Pendant la rencontre, on passe vos photos en revue et on vous présente vos options avec leurs prix et subventions. Si une option vous plaît, on planifie ensuite une courte visite gratuite pour confirmer le prix final.",
    doneEmail: "Une confirmation a été envoyée à votre courriel.",
    errorTitle: "L'envoi a échoué",
    footerNote: "Un service de Groupe DPSD Inc",
    langToggle: "EN",
    dayLabel: (d: string) =>
      new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-CA", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    slotConfirmLabel: (d: string, t: string) =>
      `${new Date(`${d}T12:00:00Z`).toLocaleDateString("fr-CA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })} à ${t.replace(":", " h ")}`,
  },
  en: {
    brandTag: "Air Conditioning, Heating, Ventilation",
    backToSite: "← Back to site",
    title: "Virtual Estimate",
    subtitle:
      "Send us a few photos, pick a time that works for you, and let's meet virtually to go over your estimate — no waiting for a visit.",
    stepsIntro: [
      ["1", "Your photos", "5 guided photos, 5 minutes"],
      ["2", "Your time slot", "Video or phone meeting"],
      ["3", "Your estimate", "All your options, explained"],
    ] as [string, string, string][],
    typeSection: "What type of system do you have?",
    typeWall: "Wall-mounted heat pump",
    typeWallDesc: "Indoor unit on the wall, outdoor unit on the ground or brackets",
    typeCentral: "Central heat pump",
    typeCentralDesc: "Ductwork, air handler or furnace in the basement",
    npGuideTitle: "Where to find the nameplates",
    npGuideWall:
      "Indoor unit: lift the front panel of the wall unit — the label with the model number is on the right side or under the cover. Outdoor unit: the label (often metal) is on the side panel, near the pipes.",
    npGuideCentral:
      "Indoor unit: the label is on the air handler or furnace cabinet, often inside the front panel or on the side. Outdoor unit: the label is on the condenser's side panel, near the pipes.",
    photosSection: "Your 5 photos",
    photoHint:
      "Take well-lit, readable photos — that's what lets us prepare an accurate estimate before the meeting.",
    photoIntNameplate: "Nameplate — indoor unit",
    photoIntSpace: "Indoor unit and its space (overall view)",
    photoExtNameplate: "Nameplate — outdoor unit",
    photoExtSpace: "Outdoor unit and its space (overall view)",
    photoPanel: "Electrical panel (door open)",
    extraSection: "Additional photos (optional)",
    extraHint:
      "Anything you find useful: another angle, a room to cool, an installation constraint…",
    addExtra: "+ Add a photo",
    contactSection: "Your contact information",
    nameLabel: "Full name",
    phoneLabel: "Phone",
    emailLabel: "Email",
    emailHint: "The confirmation and meeting link will be sent to this email.",
    addressLabel: "Address (optional)",
    cityLabel: "City",
    postalLabel: "Postal code",
    notesLabel: "Details or questions (optional)",
    slotSection: "Pick your time slot",
    slotHint:
      "About a 30-minute meeting, by video or phone — Monday to Friday, 9 a.m. to 5 p.m.",
    slotLoading: "Loading availability…",
    slotNone: "No slots available that day — please pick another day.",
    submit: "Book my meeting",
    submitting: "Uploading your photos…",
    missingFields:
      "Please pick your system type, provide the 5 photos, your contact info (name, phone, email, postal code) and choose a time slot.",
    doneTitle: "Your meeting is booked!",
    doneSlot: "Your slot:",
    doneNext:
      "We'll confirm the appointment and send you the meeting link (video or phone, your choice). During the meeting, we review your photos and walk you through your options with prices and rebates. If you like an option, we then schedule a short free visit to confirm the final price.",
    doneEmail: "A confirmation has been sent to your email.",
    errorTitle: "The submission failed",
    footerNote: "A service of Groupe DPSD Inc",
    langToggle: "FR",
    dayLabel: (d: string) =>
      new Date(`${d}T12:00:00Z`).toLocaleDateString("en-CA", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }),
    slotConfirmLabel: (d: string, t: string) =>
      `${new Date(`${d}T12:00:00Z`).toLocaleDateString("en-CA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "UTC",
      })} at ${t}`,
  },
} as const;

export default function VirtualPage() {
  const [lang, setLang] = useState<Lang>("fr");
  const [unitType, setUnitType] = useState<UnitType>("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postal, setPostal] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState(""); // honeypot

  const [photos, setPhotos] = useState<Record<string, File | null>>({
    intNameplate: null,
    intSpace: null,
    extNameplate: null,
    extSpace: null,
    panel: null,
  });
  const [extras, setExtras] = useState<File[]>([]);

  const [days, setDays] = useState<string[]>([]);
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slotState, setSlotState] = useState<{
    loading: boolean;
    times: string[];
    taken: string[];
  }>({ loading: false, times: [], taken: [] });

  const [submit, setSubmit] = useState<SubmitState>({ status: "idle" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lang") === "en") setLang("en");
  }, []);

  const t = STRINGS[lang];

  function toggleLang() {
    const next: Lang = lang === "fr" ? "en" : "fr";
    setLang(next);
    const url = new URL(window.location.href);
    if (next === "en") url.searchParams.set("lang", "en");
    else url.searchParams.delete("lang");
    window.history.replaceState(null, "", url.toString());
  }

  // Jours et disponibilités depuis l'API (source de vérité côté serveur).
  async function loadDay(date: string) {
    setSlotState({ loading: true, times: [], taken: [] });
    setSlotTime("");
    try {
      const res = await fetch(`/api/virtual/slots?date=${date}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data?.ok) {
        setSlotState({
          loading: false,
          times: data.times ?? [],
          taken: data.taken ?? [],
        });
        if (Array.isArray(data.days) && data.days.length) setDays(data.days);
        return;
      }
    } catch {
      // tombe au cas d'erreur ci-dessous
    }
    setSlotState({ loading: false, times: [], taken: [] });
  }

  useEffect(() => {
    // premier chargement : récupérer la liste des jours via le premier jour ouvrable
    void (async () => {
      try {
        const probe = new Date().toISOString().slice(0, 10);
        const res = await fetch(`/api/virtual/slots?date=${probe}`, {
          cache: "no-store",
        }).catch(() => null);
        const data = res ? await res.json().catch(() => null) : null;
        if (data?.ok && Array.isArray(data.days) && data.days.length) {
          setDays(data.days);
          setSlotDate(data.days[0]);
          void loadDay(data.days[0]);
        }
      } catch {
        // silencieux
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const photosComplete = Object.values(photos).every((f) => f !== null);
  const formComplete =
    unitType !== "" &&
    photosComplete &&
    name.trim().length > 0 &&
    phone.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
    postal.trim().replace(/\s/g, "").length >= 3 &&
    slotDate !== "" &&
    slotTime !== "";

  function resetSubmit() {
    if (submit.status !== "idle") setSubmit({ status: "idle" });
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
      form.set("unitType", unitType);
      form.set("slotDate", slotDate);
      form.set("slotTime", slotTime);
      form.set("lang", lang);
      for (const [key, file] of Object.entries(photos)) {
        if (file) form.set(key, file);
      }
      extras.slice(0, MAX_EXTRA).forEach((file, i) => {
        form.set(`extra${i}`, file);
      });

      const res = await fetch("/api/virtual", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        // créneau pris entre-temps : rafraîchir la journée
        if (res.status === 409) void loadDay(slotDate);
        throw new Error(
          data?.error ||
            (lang === "fr" ? "Une erreur est survenue." : "Something went wrong.")
        );
      }
      setSubmit({
        status: "done",
        slotDate,
        slotTime,
        emailSent: Boolean(data.emailSent),
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
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
            <div className="vsteps">
              {t.stepsIntro.map(([n, label, sub]) => (
                <div className="vstep" key={n}>
                  <span className="vstep-n">{n}</span>
                  <div>
                    <strong>{label}</strong>
                    <small>{sub}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="page-body">
          <div className="container">
            {submit.status === "done" ? (
              <div className="card">
                <div className="results" style={{ marginTop: 0 }}>
                  <h3>{t.doneTitle}</h3>
                  <p className="results-sub">
                    <strong>{t.doneSlot}</strong>{" "}
                    {t.slotConfirmLabel(submit.slotDate, submit.slotTime)}
                  </p>
                  <p className="results-note">{t.doneNext}</p>
                  {submit.emailSent ? (
                    <p className="results-note">{t.doneEmail}</p>
                  ) : null}
                  <img
                    className="badge-chip"
                    src={`/products/guarantee-${lang}.png`}
                    alt="10+2"
                  />
                </div>
              </div>
            ) : (
              <div className="card">
                {/* --- Type de système --- */}
                <h3
                  className="section-title"
                  style={{ borderTop: "none", paddingTop: 0, marginTop: 0 }}
                >
                  {t.typeSection}
                </h3>
                <div className="pick-grid">
                  <button
                    type="button"
                    className={`pick-card${unitType === "murale" ? " selected" : ""}`}
                    onClick={() => {
                      setUnitType("murale");
                      resetSubmit();
                    }}
                  >
                    <img src="/products/clivia.png" alt={t.typeWall} />
                    <strong>{t.typeWall}</strong>
                    <span>{t.typeWallDesc}</span>
                  </button>
                  <button
                    type="button"
                    className={`pick-card${unitType === "centrale" ? " selected" : ""}`}
                    onClick={() => {
                      setUnitType("centrale");
                      resetSubmit();
                    }}
                  >
                    <img src="/products/central-old.svg" alt={t.typeCentral} />
                    <strong>{t.typeCentral}</strong>
                    <span>{t.typeCentralDesc}</span>
                  </button>
                </div>

                {unitType !== "" && (
                  <>
                    {/* --- Guide plaques signalétiques --- */}
                    <div className="np-guide">
                      <strong>{t.npGuideTitle}</strong>
                      <p>{unitType === "murale" ? t.npGuideWall : t.npGuideCentral}</p>
                    </div>

                    {/* --- Photos --- */}
                    <h3 className="section-title">{t.photosSection}</h3>
                    <p className="photo-hint">{t.photoHint}</p>
                    <div className="form-grid">
                      {(
                        [
                          ["intNameplate", t.photoIntNameplate],
                          ["intSpace", t.photoIntSpace],
                          ["extNameplate", t.photoExtNameplate],
                          ["extSpace", t.photoExtSpace],
                          ["panel", t.photoPanel],
                        ] as [string, string][]
                      ).map(([key, label]) => (
                        <PhotoField
                          key={key}
                          label={label}
                          file={photos[key]}
                          required
                          onChange={(f) => {
                            setPhotos((prev) => ({ ...prev, [key]: f }));
                            resetSubmit();
                          }}
                        />
                      ))}
                    </div>

                    <h3 className="section-title">{t.extraSection}</h3>
                    <p className="photo-hint">{t.extraHint}</p>
                    <div className="extra-list">
                      {extras.map((file, i) => (
                        <ExtraThumb
                          key={`${file.name}-${i}`}
                          file={file}
                          onRemove={() => {
                            setExtras((prev) => prev.filter((_, j) => j !== i));
                            resetSubmit();
                          }}
                        />
                      ))}
                      {extras.length < MAX_EXTRA ? (
                        <label className="extra-add">
                          {t.addExtra}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) setExtras((prev) => [...prev, f]);
                              e.target.value = "";
                              resetSubmit();
                            }}
                          />
                        </label>
                      ) : null}
                    </div>

                    {/* --- Coordonnées --- */}
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

                    {/* --- Créneau --- */}
                    <h3 className="section-title">{t.slotSection}</h3>
                    <p className="photo-hint">{t.slotHint}</p>
                    {days.length > 0 && (
                      <div className="day-scroll">
                        {days.map((d) => (
                          <button
                            key={d}
                            type="button"
                            className={`day-chip${slotDate === d ? " selected" : ""}`}
                            onClick={() => {
                              setSlotDate(d);
                              void loadDay(d);
                              resetSubmit();
                            }}
                          >
                            {t.dayLabel(d)}
                          </button>
                        ))}
                      </div>
                    )}
                    {slotState.loading ? (
                      <div className="status loading">{t.slotLoading}</div>
                    ) : slotState.times.filter((x) => !slotState.taken.includes(x))
                        .length === 0 ? (
                      <div className="status hint">{t.slotNone}</div>
                    ) : (
                      <div className="slot-grid">
                        {slotState.times.map((time) => {
                          const taken = slotState.taken.includes(time);
                          return (
                            <button
                              key={time}
                              type="button"
                              disabled={taken}
                              className={`slot-chip${slotTime === time ? " selected" : ""}`}
                              onClick={() => {
                                setSlotTime(time);
                                resetSubmit();
                              }}
                            >
                              {time}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      className="btn-primary"
                      disabled={!formComplete || submit.status === "submitting"}
                      onClick={handleSubmit}
                    >
                      {submit.status === "submitting" ? t.submitting : t.submit}
                    </button>

                    {submit.status === "idle" && !formComplete && (
                      <div className="status hint">{t.missingFields}</div>
                    )}
                    {submit.status === "error" && (
                      <div className="status error">
                        <strong>{t.errorTitle}</strong>
                        {submit.message}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <span>{t.footerNote}</span>
          <span>
            <a href={`mailto:${EMAIL}`}>{EMAIL}</a> ·{" "}
            <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
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

function ExtraThumb({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return (
    <div className="extra-thumb">
      {url ? <img src={url} alt="" /> : null}
      <button type="button" onClick={onRemove} aria-label="Retirer">
        ×
      </button>
    </div>
  );
}
