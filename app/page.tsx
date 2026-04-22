"use client";

import { useMemo, useState } from "react";
import {
  GREE_OPTIONS,
  LINE_ORDER,
  type EquipmentType,
  type GreeOption,
  type ProductLine,
} from "@/lib/gree-options";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      amount: number;
      amountLabel: string;
      installationDate: string;
    }
  | {
      status: "error";
      message: string;
    };

const CURRENCY = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export default function Page() {
  const [selectedLine, setSelectedLine] = useState<ProductLine>("Charmo");
  const [selectedType, setSelectedType] = useState<EquipmentType | "">("");
  const [selectedSize, setSelectedSize] = useState("");
  const [installationDate, setInstallationDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [lookup, setLookup] = useState<LookupState>({ status: "idle" });

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

  const handleLineChange = (line: ProductLine) => {
    setSelectedLine(line);
    setSelectedType("");
    setSelectedSize("");
    setLookup({ status: "idle" });
  };

  async function handleLiveLookup() {
    if (!selectedOption) return;

    setLookup({ status: "loading" });

    try {
      const res = await fetch(
        `/api/logisvert-lookup?ahri=${encodeURIComponent(
          selectedOption.ahri
        )}&installationDate=${encodeURIComponent(installationDate)}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(
          data?.error || "Impossible de récupérer le montant actuel de LogisVert."
        );
      }

      setLookup({
        status: "success",
        amount: data.amount,
        amountLabel: data.amountLabel,
        installationDate: data.installationDate,
      });
    } catch (error) {
      setLookup({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Échec de la recherche en direct sur LogisVert.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-3xl p-4 md:p-8">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold md:text-3xl">
            Calculateur Subvention Gree
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Cette version n’utilise aucun montant statique du PDF. Le montant est
            lu en direct à partir du numéro AHRI via LogisVert.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Date d’installation
              </label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => {
                  setInstallationDate(e.target.value);
                  setLookup({ status: "idle" });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Gamme de produit
              </label>
              <select
                value={selectedLine}
                onChange={(e) => handleLineChange(e.target.value as ProductLine)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
              >
                {LINE_ORDER.map((line) => (
                  <option key={line} value={line}>
                    {line}
                  </option>
                ))}
              </select>
            </div>

            {showTypeDropdown && (
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Type d’équipement
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value as EquipmentType);
                    setSelectedSize("");
                    setLookup({ status: "idle" });
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
                >
                  <option value="">Choisir</option>
                  {equipmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold">Capacité</label>
              <select
                value={selectedSize}
                onChange={(e) => {
                  setSelectedSize(e.target.value);
                  setLookup({ status: "idle" });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
              >
                <option value="">Choisir</option>
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            {!selectedSize ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                Fais une sélection complète pour lancer la recherche en direct.
              </div>
            ) : matchingOptions.length === 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-700">
                  Aucun modèle Gree correspondant trouvé
                </p>
              </div>
            ) : matchingOptions.length > 1 && !selectedOption ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-800">
                  Plusieurs combinaisons possibles
                </p>
                <div className="mt-4 space-y-3">
                  {matchingOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedType(item.equipmentType);
                        setSelectedSize(item.sizeLabel);
                        setLookup({ status: "idle" });
                      }}
                      className="w-full rounded-xl border border-amber-200 bg-white p-4 text-left transition hover:border-amber-400"
                    >
                      <div className="font-semibold">
                        {item.line} · {item.equipmentType} · {item.sizeLabel}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        AHRI: {item.ahri}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : selectedOption ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoCard label="Gamme" value={selectedOption.line} />
                  <InfoCard label="Type" value={selectedOption.equipmentType} />
                  <InfoCard label="Capacité" value={selectedOption.sizeLabel} />
                  <InfoCard label="AHRI" value={selectedOption.ahri} />
                  <InfoCard
                    label="Unité extérieure"
                    value={selectedOption.outdoorUnit}
                  />
                  <InfoCard
                    label="Unité intérieure"
                    value={selectedOption.indoorUnit}
                  />
                </div>

                <button
                  type="button"
                  onClick={handleLiveLookup}
                  className="mt-5 w-full rounded-xl bg-slate-900 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
                >
                  Vérifier le montant actuel sur LogisVert
                </button>

                <div className="mt-4">
                  {lookup.status === "idle" && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                      Aucun montant n’est affiché tant que la recherche en direct
                      n’a pas été faite.
                    </div>
                  )}

                  {lookup.status === "loading" && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                      Recherche en direct du montant actuel...
                    </div>
                  )}

                  {lookup.status === "success" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                        Aide financière actuelle
                      </p>
                      <h2 className="mt-1 text-3xl font-bold text-emerald-900">
                        {CURRENCY.format(lookup.amount)}
                      </h2>
                      <p className="mt-2 text-sm text-emerald-800">
                        Montant trouvé en direct pour l’AHRI {selectedOption.ahri}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Date d’installation utilisée : {lookup.installationDate}
                      </p>
                    </div>
                  )}

                  {lookup.status === "error" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="font-semibold text-red-700">
                        Impossible de lire LogisVert en direct
                      </p>
                      <p className="mt-1 text-sm text-red-700">
                        {lookup.message}
                      </p>
                      <p className="mt-2 text-xs text-red-600">
                        Aucun montant statique du PDF n’a été utilisé.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="mt-1 break-all text-sm font-medium text-slate-900">
        {value}
      </div>
    </div>
  );
}
