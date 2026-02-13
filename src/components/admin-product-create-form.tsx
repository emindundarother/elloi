"use client";

import { useState } from "react";
import { useActionState } from "react";

import { createProductAction } from "@/app/actions/admin";
import {
  PRODUCT_SUBCATEGORY_BY_CATEGORY,
  PRODUCT_SUBCATEGORY_LABELS,
  getDefaultProductSubCategory,
  type ProductSubCategory,
} from "@/lib/product-subcategory";

type ProductCategory = "FOOD" | "DRINK" | "EXTRAS";

export function AdminProductCreateForm() {
  const [category, setCategory] = useState<ProductCategory>("FOOD");
  const [subCategory, setSubCategory] = useState<ProductSubCategory>(getDefaultProductSubCategory("FOOD"));
  const [trackStock, setTrackStock] = useState(true);
  const [state, action, isPending] = useActionState(createProductAction, {
    error: null,
    success: null,
  });

  return (
    <form action={action} className="panel grid gap-3 p-4 sm:grid-cols-7 sm:items-end">
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-sm font-medium">Ürün Adı</span>
        <input
          name="name"
          required
          className="h-10 rounded-xl border border-slate-300 px-3 outline-none focus:border-slate-500"
          placeholder="Örn. Caffe Latte"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Kategori</span>
        <select
          name="category"
          value={category}
          onChange={(event) => {
            const nextCategory = event.target.value as ProductCategory;
            setCategory(nextCategory);

            if (!PRODUCT_SUBCATEGORY_BY_CATEGORY[nextCategory].includes(subCategory)) {
              setSubCategory(getDefaultProductSubCategory(nextCategory));
            }
          }}
          className="h-10 rounded-xl border border-slate-300 px-3 outline-none focus:border-slate-500"
        >
          <option value="FOOD">Yiyecek</option>
          <option value="DRINK">İçecek</option>
          <option value="EXTRAS">Ekstralar</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Alt Kategori</span>
        <select
          name="subCategory"
          value={subCategory}
          onChange={(event) => setSubCategory(event.target.value as ProductSubCategory)}
          className="h-10 rounded-xl border border-slate-300 px-3 outline-none focus:border-slate-500"
        >
          {PRODUCT_SUBCATEGORY_BY_CATEGORY[category].map((option) => (
            <option key={option} value={option}>
              {PRODUCT_SUBCATEGORY_LABELS[option]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Fiyat (TL)</span>
        <input
          type="number"
          step="0.01"
          min="0"
          name="basePrice"
          required
          className="h-10 rounded-xl border border-slate-300 px-3 outline-none focus:border-slate-500"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Başlangıç Stok</span>
        <input
          type="number"
          step="1"
          min="0"
          name="stockQty"
          disabled={!trackStock}
          defaultValue="0"
          className="h-10 rounded-xl border border-slate-300 px-3 outline-none focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        />
      </label>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="trackStock"
            checked={trackStock}
            onChange={(event) => setTrackStock(event.target.checked)}
            className="h-4 w-4"
          />
          Stok Takip Et
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Ekleniyor..." : "Ürün Ekle"}
        </button>
      </div>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-7">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-7">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
