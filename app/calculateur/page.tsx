"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  GREE_OPTIONS,
  LINE_ORDER,
  type EquipmentType,
  type GreeOption,
  type ProductLine,
} from "../../lib/gree-options";

type InstallationType =
  | "Replacement of an existing heat pump"
  | "New installation";

type LookupState =
  | { status: "idle" }
  | { status: "loading" }
  | {
      status: "success";
      amount: number;
      amountLabel?: string;
      installationDate: string;
      source?: string;
    }
  | {
      status: "error";
      message: string;
    };

const CURRENCY = new Intl.NumberFormat("en-CA", {
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
  const [installationType, setInstallationType] =
    useState<InstallationType>("Replacement of an existing heat pump");
  const [quantity, setQuantity] = useState(1);
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
          data?.error || "Unable to retrieve the current LogisVert amount."
        );
      }

      setLookup({
        status: "success",
        amount: Number(data.amount ?? 0),
        amountLabel: data.amountLabel,
        installationDate: data.installationDate ?? installationDate,
        source: data.source,
      });
    } catch (error) {
      setLookup({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "The live LogisVert lookup failed.",
      });
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <Link
            href="/"
            className="text-sm font-semibold text-brand-orange hover:underline"
          >
            ← Back to sales pricing
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.jpg"
              alt="Groupe DPSD"
              className="h-16 w-auto rounded-xl"
            />
            <h1 className="text-2xl font-bold text-brand-dark md:text-3xl">
              Gree Subsidy Calculator
            </h1>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Pick your unit from your own lists. The AHRI number is filled in
            automatically and sent to the LogisVert lookup.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Installation type
              </label>
              <select
                value={installationType}
                onChange={(e) => {
                  setInstallationType(e.target.value as InstallationType);
                  resetLookup();
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
              >
                <option value="Replacement of an existing heat pump">
                  Replacement of an existing heat pump
                </option>
                <option value="New installation">New installation</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Installation date
              </label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => {
                  setInstallationDate(e.target.value);
                  resetLookup();
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-semibold">
                Product line
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
                  Equipment type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value as EquipmentType);
                    setSelectedSize("");
                    resetLookup();
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
                >
                  <option value="">Choose</option>
                  {equipmentTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold">Capacity</label>
              <select
                value={selectedSize}
                onChange={(e) => {
                  setSelectedSize(e.target.value);
                  resetLookup();
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base outline-none transition focus:border-slate-500"
              >
                <option value="">Choose</option>
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
                Complete your selection to run the LogisVert lookup.
              </div>
            ) : matchingOptions.length === 0 ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-700">
                  No matching Gree model found
                </p>
              </div>
            ) : matchingOptions.length > 1 && !selectedOption ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-semibold text-amber-800">
                  Several possible combinations
                </p>
                <div className="mt-4 space-y-3">
                  {matchingOptions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedType(item.equipmentType);
                        setSelectedSize(item.sizeLabel);
                        resetLookup();
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
                  <InfoCard label="Line" value={selectedOption.line} />
                  <InfoCard label="Type" value={selectedOption.equipmentType} />
                  <InfoCard label="Capacity" value={selectedOption.sizeLabel} />
                  <InfoCard label="AHRI" value={selectedOption.ahri} />
                  <InfoCard
                    label="Outdoor unit"
                    value={selectedOption.outdoorUnit}
                  />
                  <InfoCard
                    label="Indoor unit"
                    value={selectedOption.indoorUnit}
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Model AHRI number
                    </label>
                    <input
                      type="text"
                      value={selectedOption.ahri}
                      readOnly
                      className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-base text-slate-700"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Number of units installed
                    </label>
                    <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2">
                      <button
                        type="button"
                        onClick={() => {
                          setQuantity((prev) => Math.max(1, prev - 1));
                          resetLookup();
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-xl"
                      >
                        -
                      </button>
                      <div className="flex-1 text-center text-lg font-semibold">
                        {quantity}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuantity((prev) => prev + 1);
                          resetLookup();
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-xl"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLiveLookup}
                  className="mt-5 w-full rounded-xl bg-brand-orange px-4 py-3 text-base font-semibold text-white transition hover:bg-brand-orange-dark"
                >
                  Calculate the subsidy
                </button>

                <div className="mt-4">
                  {lookup.status === "idle" && (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
                      No amount is shown until the lookup has been run.
                    </div>
                  )}

                  {lookup.status === "loading" && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                      Looking up the current amount on LogisVert...
                    </div>
                  )}

                  {lookup.status === "success" && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                      <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
                        Current subsidy
                      </p>
                      <h2 className="mt-1 text-3xl font-bold text-emerald-900">
                        {CURRENCY.format(lookup.amount)}
                      </h2>
                      <p className="mt-2 text-sm text-emerald-800">
                        Amount found for AHRI {selectedOption.ahri}
                      </p>
                      <p className="mt-1 text-xs text-emerald-700">
                        Installation date used: {lookup.installationDate}
                      </p>
                      {lookup.source ? (
                        <p className="mt-1 text-xs text-emerald-700">
                          Source: {lookup.source}
                        </p>
                      ) : null}
                    </div>
                  )}

                  {lookup.status === "error" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="font-semibold text-red-700">
                        Unable to read LogisVert live
                      </p>
                      <p className="mt-1 text-sm text-red-700">
                        {lookup.message}
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
      <div className="text-xs font-semibold uppercase text-slate-500">
        {label}
      </div>
      <div className="mt-1 break-all text-sm font-medium text-slate-900">
        {value}
      </div>
    </div>
  );
}
