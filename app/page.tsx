"use client";

import Link from "next/link";
import { useState } from "react";
import {
  WALL_MOUNT_LINES,
  WALL_MOUNT_SIZES,
  getQuote,
  type Quote,
  type WallMountSize,
} from "../lib/pricing";

const CURRENCY = new Intl.NumberFormat("fr-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function Page() {
  const [selectedSize, setSelectedSize] = useState<WallMountSize>("12k");
  const [quantity, setQuantity] = useState(1);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">
                Thermopompes murales — Prix de vente
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Choisissez la capacité pour comparer les trois gammes murales :
                prix taxes incluses, subvention LogisVert et prix final.
              </p>
            </div>
            <Link
              href="/calculateur"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-400"
            >
              Recherche AHRI / LogisVert →
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Capacité
              </label>
              <div className="flex flex-wrap gap-2">
                {WALL_MOUNT_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize(size)}
                    className={`rounded-xl border px-5 py-3 text-base font-semibold transition ${
                      selectedSize === size
                        ? "border-blue-700 bg-blue-700 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-blue-400"
                    }`}
                  >
                    {size.replace("k", " 000")} BTU
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Nombre d’appareils
              </label>
              <div className="flex max-w-xs items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-xl"
                >
                  -
                </button>
                <div className="flex-1 text-center text-lg font-semibold">
                  {quantity}
                </div>
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => prev + 1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-xl"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {WALL_MOUNT_LINES.map((line) => {
            const quote = getQuote(line, selectedSize, quantity);
            return quote ? (
              <PriceCard key={line} quote={quote} />
            ) : (
              <div
                key={line}
                className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"
              >
                <div className="text-lg font-bold text-slate-400">{line}</div>
                <p className="mt-2 text-sm text-slate-500">
                  Non offert en {selectedSize.replace("k", " 000")} BTU murale
                </p>
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Prix taxes incluses (TPS 5 % + TVQ 9,975 %). La subvention LogisVert
          est déduite du total taxes incluses.
        </p>
      </div>
    </main>
  );
}

function PriceCard({ quote }: { quote: Quote }) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold">{quote.line}</h2>
        <p className="mt-1 text-sm text-slate-600">
          Murale {quote.size.replace("k", " 000")} BTU
          {quote.quantity > 1 ? ` × ${quote.quantity}` : ""}
        </p>
        {quote.ahri ? (
          <p className="mt-1 text-xs text-slate-500">AHRI : {quote.ahri}</p>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Prix taxes incluses
        </p>
        <p className="mt-1 text-3xl font-bold">
          {CURRENCY.format(quote.priceWithTax)}
        </p>
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>Prix avant taxes</span>
          <span>{CURRENCY.format(quote.priceBeforeTax)}</span>
        </div>
        <div className="flex justify-between">
          <span>TPS (5 %)</span>
          <span>{CURRENCY.format(quote.tps)}</span>
        </div>
        <div className="flex justify-between">
          <span>TVQ (9,975 %)</span>
          <span>{CURRENCY.format(quote.tvq)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-emerald-800">
            Subvention LogisVert
          </span>
          <span className="text-lg font-bold text-emerald-700">
            − {CURRENCY.format(quote.subsidy)}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-blue-700 p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">
          Votre prix final
        </p>
        <p className="mt-1 text-2xl font-bold">
          {CURRENCY.format(quote.finalPrice)}
        </p>
        <p className="mt-1 text-xs text-blue-100">
          {CURRENCY.format(quote.priceWithTax)} −{" "}
          {CURRENCY.format(quote.subsidy)}
        </p>
      </div>
    </div>
  );
}
