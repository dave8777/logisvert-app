"use client";

import Link from "next/link";
import { useState } from "react";
import {
  MULTI_ZONE_SIZES,
  MULTI_ZONE_TYPES,
  WALL_MOUNT_LINES,
  WALL_MOUNT_SIZES,
  getMultiZoneQuote,
  getWallMountQuote,
  type MultiZoneSize,
  type Quote,
  type WallMountSize,
} from "../lib/pricing";

const CURRENCY = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Category = "Wall Mount" | "Multi-Zone";

const CATEGORIES: Category[] = ["Wall Mount", "Multi-Zone"];

function formatBtu(size: string): string {
  const thousands = Number(size.replace("k", ""));
  return `${(thousands * 1000).toLocaleString("en-CA")} BTU`;
}

export default function Page() {
  const [category, setCategory] = useState<Category>("Wall Mount");
  const [wallSize, setWallSize] = useState<WallMountSize>("12k");
  const [multiSize, setMultiSize] = useState<MultiZoneSize>("24k");
  const [quantity, setQuantity] = useState(1);

  const sizes: string[] =
    category === "Wall Mount" ? WALL_MOUNT_SIZES : MULTI_ZONE_SIZES;
  const selectedSize = category === "Wall Mount" ? wallSize : multiSize;

  function handleSizeChange(size: string) {
    if (category === "Wall Mount") {
      setWallSize(size as WallMountSize);
    } else {
      setMultiSize(size as MultiZoneSize);
    }
  }

  const columns =
    category === "Wall Mount"
      ? WALL_MOUNT_LINES.map((line) => ({
          key: line,
          label: line,
          quote: getWallMountQuote(line, wallSize, quantity),
        }))
      : MULTI_ZONE_TYPES.map((type) => ({
          key: type,
          label: type,
          quote: getMultiZoneQuote(type, multiSize, quantity),
        }));

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-6xl p-4 md:p-8">
        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Groupe DPSD"
                className="h-24 w-auto rounded-xl"
              />
              <div>
                <h1 className="text-2xl font-bold text-brand-dark md:text-3xl">
                  Groupe <span className="text-brand-orange">DPSD</span> — Sales
                  Pricing
                </h1>
                <p className="mt-1 text-sm font-medium text-brand-blue-dark">
                  Air Conditioning · Heating · Ventilation
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Pick a category and capacity to compare options: price with
                  taxes included, LogisVert subsidy, and final price.
                </p>
              </div>
            </div>
            <Link
              href="/calculateur"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-brand-orange transition hover:border-brand-orange"
            >
              AHRI / LogisVert lookup →
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="grid gap-5 lg:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Category
              </label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`rounded-xl border px-5 py-3 text-base font-semibold transition ${
                      category === item
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-brand-orange"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Capacity
              </label>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSizeChange(size)}
                    className={`rounded-xl border px-4 py-3 text-base font-semibold transition ${
                      selectedSize === size
                        ? "border-brand-orange bg-brand-orange text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-brand-orange"
                    }`}
                  >
                    {formatBtu(size)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Number of units
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
          {columns.map(({ key, label, quote }) =>
            quote ? (
              <PriceCard key={key} quote={quote} category={category} />
            ) : (
              <div
                key={key}
                className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center"
              >
                <div className="text-lg font-bold text-slate-400">{label}</div>
                <p className="mt-2 text-sm text-slate-500">
                  Not available in {formatBtu(selectedSize)}
                </p>
              </div>
            )
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Prices include taxes (GST 5% + QST 9.975%). The LogisVert subsidy is
          deducted from the tax-included total.
        </p>
      </div>
    </main>
  );
}

function PriceCard({
  quote,
  category,
}: {
  quote: Quote;
  category: Category;
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-5 shadow-sm">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xl font-bold text-brand-dark">{quote.name}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {category} {formatBtu(quote.size)}
          {quote.quantity > 1 ? ` × ${quote.quantity}` : ""}
        </p>
        {quote.ahri ? (
          <p className="mt-1 text-xs text-slate-500">AHRI: {quote.ahri}</p>
        ) : null}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Price with taxes
        </p>
        <p className="mt-1 text-3xl font-bold">
          {CURRENCY.format(quote.priceWithTax)}
        </p>
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-500">
        <div className="flex justify-between">
          <span>Price before taxes</span>
          <span>{CURRENCY.format(quote.priceBeforeTax)}</span>
        </div>
        <div className="flex justify-between">
          <span>GST (5%)</span>
          <span>{CURRENCY.format(quote.gst)}</span>
        </div>
        <div className="flex justify-between">
          <span>QST (9.975%)</span>
          <span>{CURRENCY.format(quote.qst)}</span>
        </div>
      </div>

      {quote.subsidy > 0 ? (
        <div className="mt-4 rounded-xl border border-brand-blue bg-brand-blue-light p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-brand-blue-dark">
              LogisVert subsidy
            </span>
            <span className="text-lg font-bold text-brand-blue-dark">
              − {CURRENCY.format(quote.subsidy)}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <span className="text-sm font-semibold text-slate-500">
            No LogisVert subsidy for this size
          </span>
        </div>
      )}

      <div className="mt-4 rounded-xl bg-brand-orange p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-100">
          Your final price
        </p>
        <p className="mt-1 text-2xl font-bold">
          {CURRENCY.format(quote.finalPrice)}
        </p>
        {quote.subsidy > 0 ? (
          <p className="mt-1 text-xs text-orange-100">
            {CURRENCY.format(quote.priceWithTax)} −{" "}
            {CURRENCY.format(quote.subsidy)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
