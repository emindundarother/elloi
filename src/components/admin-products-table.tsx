"use client";

import { useActionState, useEffect, useMemo, useState } from "react";

import { updateProductsBulkAction } from "@/app/actions/admin";
import { formatCurrencyTRY } from "@/lib/format";
import {
  PRODUCT_SUBCATEGORY_BY_CATEGORY,
  PRODUCT_SUBCATEGORY_LABELS,
  getDefaultProductSubCategory,
  type ProductSubCategory,
} from "@/lib/product-subcategory";

type ProductCategory = "FOOD" | "DRINK" | "EXTRAS";

type ProductRow = {
  id: string;
  name: string;
  category: ProductCategory;
  subCategory: ProductSubCategory;
  isActive: boolean;
  basePrice: number;
  trackStock: boolean;
  stockQty: number;
};

type ProductDraft = {
  name: string;
  category: ProductCategory;
  subCategory: ProductSubCategory;
  isActive: boolean;
  basePriceWhole: string;
  basePriceFraction: string;
  trackStock: boolean;
  qtyDelta: string;
  reason: string;
};

function splitPrice(price: number): { whole: string; fraction: string } {
  const [whole, fraction] = price.toFixed(2).split(".");
  return {
    whole: whole ?? "0",
    fraction: fraction ?? "00",
  };
}

function buildPriceValue(whole: string, fraction: string): string {
  const normalizedWhole = whole.trim() === "" ? "0" : whole.trim();
  const normalizedFraction = (fraction.trim() === "" ? "0" : fraction.trim()).slice(0, 2);
  return `${normalizedWhole}.${normalizedFraction.padStart(2, "0")}`;
}

function buildInitialDrafts(products: ProductRow[]): Record<string, ProductDraft> {
  return Object.fromEntries(
    products.map((product) => [
      product.id,
      {
        name: product.name,
        category: product.category,
        subCategory: product.subCategory,
        isActive: product.isActive,
        basePriceWhole: splitPrice(product.basePrice).whole,
        basePriceFraction: splitPrice(product.basePrice).fraction,
        trackStock: product.trackStock,
        qtyDelta: "",
        reason: "",
      },
    ]),
  );
}

function isRowDirty(initial: ProductDraft, current: ProductDraft): boolean {
  return (
    initial.name !== current.name ||
    initial.category !== current.category ||
    initial.subCategory !== current.subCategory ||
    initial.isActive !== current.isActive ||
    initial.basePriceWhole !== current.basePriceWhole ||
    initial.basePriceFraction !== current.basePriceFraction ||
    initial.trackStock !== current.trackStock ||
    current.qtyDelta.length > 0 ||
    current.reason.length > 0
  );
}

export function AdminProductsTable({ products }: { products: ProductRow[] }) {
  const initialDrafts = useMemo(() => buildInitialDrafts(products), [products]);
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>(initialDrafts);
  const [state, bulkAction, isPending] = useActionState(updateProductsBulkAction, {
    error: null,
    success: null,
  });

  useEffect(() => {
    setDrafts(initialDrafts);
  }, [initialDrafts]);

  const hasUnsavedChanges = products.some((product) => {
    const initial = initialDrafts[product.id];
    const current = drafts[product.id];
    if (!initial || !current) return false;
    return isRowDirty(initial, current);
  });

  const payloadJson = useMemo(() => {
    const changedItems = products
      .filter((product) => {
        const initial = initialDrafts[product.id];
        const current = drafts[product.id];
        if (!initial || !current) return false;
        return isRowDirty(initial, current);
      })
      .map((product) => {
        const current = drafts[product.id];
        return {
          id: product.id,
          name: current.name,
          category: current.category,
          subCategory: current.subCategory,
          isActive: current.isActive,
          basePrice: buildPriceValue(current.basePriceWhole, current.basePriceFraction),
          trackStock: current.trackStock,
          qtyDelta: current.qtyDelta.trim().length > 0 ? current.qtyDelta : undefined,
          reason: current.reason,
        };
      });

    return JSON.stringify(changedItems);
  }, [drafts, initialDrafts, products]);

  return (
    <form action={bulkAction} className="panel overflow-hidden">
      {hasUnsavedChanges ? (
        <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
          Kaydedilmemiş değişiklikler var.
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-4 py-3 font-medium">Ürün</th>
              <th className="px-4 py-3 text-center font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">Fiyat</th>
              <th className="px-4 py-3 font-medium">Stok</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const draft = drafts[product.id];

              if (!draft) return null;

              return (
                <tr key={product.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [product.id]: { ...prev[product.id], name: event.target.value },
                        }))
                      }
                      className="h-9 w-full min-w-44 rounded-lg border border-slate-300 px-2 font-medium"
                    />
                    <select
                      value={draft.category}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [product.id]: {
                            ...prev[product.id],
                            category: event.target.value as ProductCategory,
                            subCategory: PRODUCT_SUBCATEGORY_BY_CATEGORY[event.target.value as ProductCategory].includes(
                              prev[product.id].subCategory,
                            )
                              ? prev[product.id].subCategory
                              : getDefaultProductSubCategory(event.target.value as ProductCategory),
                          },
                        }))
                      }
                      className="mt-2 h-8 w-full rounded-lg border border-slate-300 px-2 text-xs"
                    >
                      <option value="FOOD">Yiyecek</option>
                      <option value="DRINK">İçecek</option>
                      <option value="EXTRAS">Ekstralar</option>
                    </select>
                    <select
                      value={draft.subCategory}
                      onChange={(event) =>
                        setDrafts((prev) => ({
                          ...prev,
                          [product.id]: {
                            ...prev[product.id],
                            subCategory: event.target.value as ProductSubCategory,
                          },
                        }))
                      }
                      className="mt-2 h-8 w-full rounded-lg border border-slate-300 px-2 text-xs"
                    >
                      {PRODUCT_SUBCATEGORY_BY_CATEGORY[draft.category].map((option) => (
                        <option key={option} value={option}>
                          {PRODUCT_SUBCATEGORY_LABELS[option]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 align-middle">
                    <div className="flex justify-center">
                      <button
                        type="button"
                        onClick={() =>
                          setDrafts((prev) => ({
                            ...prev,
                            [product.id]: {
                              ...prev[product.id],
                              isActive: !prev[product.id].isActive,
                            },
                          }))
                        }
                        className={`inline-flex h-10 min-w-24 items-center justify-center rounded-lg px-4 text-sm font-semibold transition ${
                          draft.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                        }`}
                      >
                        {draft.isActive ? "Aktif" : "Pasif"}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="mb-2 text-xs text-slate-500">Mevcut: {formatCurrencyTRY(product.basePrice)}</p>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={draft.basePriceWhole}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [product.id]: { ...prev[product.id], basePriceWhole: event.target.value },
                          }))
                        }
                        className="h-9 w-20 rounded-lg border border-slate-300 px-2"
                        placeholder="135"
                      />
                      <span className="text-sm text-slate-500">,</span>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="99"
                        value={draft.basePriceFraction}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [product.id]: { ...prev[product.id], basePriceFraction: event.target.value.slice(0, 2) },
                          }))
                        }
                        className="h-9 w-16 rounded-lg border border-slate-300 px-2"
                        placeholder="50"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-2">
                      {draft.trackStock ? <p className="text-xs text-slate-500">Mevcut: {product.stockQty}</p> : null}
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={draft.trackStock}
                          onChange={(event) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [product.id]: {
                                ...prev[product.id],
                                trackStock: event.target.checked,
                                qtyDelta: event.target.checked ? prev[product.id].qtyDelta : "",
                                reason: event.target.checked ? prev[product.id].reason : "",
                              },
                            }))
                          }
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Stok takibi açık
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={draft.qtyDelta}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [product.id]: { ...prev[product.id], qtyDelta: event.target.value },
                          }))
                        }
                        disabled={!draft.trackStock}
                        className="h-9 w-20 rounded-lg border border-slate-300 px-2 disabled:cursor-not-allowed disabled:bg-slate-100"
                        placeholder="+/-"
                      />
                      <input
                        value={draft.reason}
                        onChange={(event) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [product.id]: { ...prev[product.id], reason: event.target.value },
                          }))
                        }
                        disabled={!draft.trackStock}
                        placeholder="Neden (opsiyonel)"
                        className="h-8 w-full rounded-lg border border-slate-300 px-2 text-xs disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <input type="hidden" name="payloadJson" value={payloadJson} readOnly />
      <div className="border-t border-slate-200 px-4 py-4">
        <button
          type="submit"
          disabled={!hasUnsavedChanges || isPending}
          className="h-11 w-full rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Kaydediliyor..." : "Tüm Değişiklikleri Kaydet"}
        </button>
        {state.error ? <p className="mt-2 text-xs text-red-600">{state.error}</p> : null}
        {state.success ? <p className="mt-2 text-xs text-emerald-700">{state.success}</p> : null}
      </div>
    </form>
  );
}
