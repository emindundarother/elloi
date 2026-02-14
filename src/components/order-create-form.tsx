"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";

import { createOrderAction } from "@/app/actions/orders";
import { DRINK_LARGE_SIZE_EXTRA, DRINK_PLANT_BASED_MILK_EXTRA } from "@/lib/constants";
import { formatCurrencyTRY } from "@/lib/format";
import {
  PRODUCT_SUBCATEGORY_LABELS,
  PRODUCT_SUBCATEGORY_ORDER,
  inferProductSubCategory,
  type ProductSubCategory,
} from "@/lib/product-subcategory";

type ProductCategory = "FOOD" | "DRINK" | "EXTRAS";
type DrinkSize = "SMALL" | "LARGE";
type DrinkServiceType = "MEKANDA" | "TAKEAWAY";
type DrinkTemperature = "SICAK" | "SOGUK";
type MilkType = "NORMAL_SUT" | "LAKTOZSUZ_SUT" | "BADEM_SUTU" | "YULAF_SUTU" | "SUTSUZ";
type CreamPreference = "KREMA_OLSUN" | "KREMA_OLMASIN";
type DrinkExtra = "EKSTRA_BUZLU" | "EKSTRA_SUTLU";
type FoodServiceType = "SICAK" | "SOGUK";

type DrinkCustomization = {
  size: DrinkSize;
  serviceType: DrinkServiceType;
  temperature: DrinkTemperature;
  milkType: MilkType;
  cream: CreamPreference;
  extra: DrinkExtra;
};

type FoodCustomization = {
  serviceType: FoodServiceType;
};

type ProductRow = {
  id: string;
  name: string;
  category: ProductCategory;
  subCategory: ProductSubCategory | null;
  basePrice: number;
  stockQty: number;
  trackStock: boolean;
};

type CartItem = {
  productId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  qty: number;
  category: ProductCategory;
  drinkCustomization: DrinkCustomization | null;
  foodCustomization: FoodCustomization | null;
  trackStock: boolean;
  stockQty: number;
};

type PaymentMethod = "CASH" | "CARD" | "METROPOL" | "EDENRED";

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CARD", label: "Kredi Kartı" },
  { value: "CASH", label: "Nakit" },
  { value: "METROPOL", label: "Metropol Kart" },
  { value: "EDENRED", label: "Ticket Edenred" },
];

const productCategoryLabels: Record<ProductCategory, string> = {
  FOOD: "Yiyecek",
  DRINK: "İçecek",
  EXTRAS: "Ekstralar",
};

const drinkSizeLabels: Record<DrinkSize, string> = {
  SMALL: "Küçük",
  LARGE: "Büyük",
};

const drinkServiceLabels: Record<DrinkServiceType, string> = {
  MEKANDA: "Mekanda",
  TAKEAWAY: "Takeaway",
};

const drinkTemperatureLabels: Record<DrinkTemperature, string> = {
  SICAK: "Sıcak",
  SOGUK: "Soğuk",
};

const milkTypeLabels: Record<MilkType, string> = {
  NORMAL_SUT: "Normal süt",
  LAKTOZSUZ_SUT: "Laktozsuz süt",
  BADEM_SUTU: "Badem sütü",
  YULAF_SUTU: "Yulaf sütü",
  SUTSUZ: "Sütsüz",
};

const creamLabels: Record<CreamPreference, string> = {
  KREMA_OLSUN: "Krema olsun",
  KREMA_OLMASIN: "Krema olmasın",
};

const drinkExtraLabels: Record<DrinkExtra, string> = {
  EKSTRA_BUZLU: "Ekstra buzlu",
  EKSTRA_SUTLU: "Ekstra sütlü",
};

const foodServiceLabels: Record<FoodServiceType, string> = {
  SICAK: "Sıcak",
  SOGUK: "Soğuk",
};

function defaultDrinkCustomization(): DrinkCustomization {
  return {
    size: "SMALL",
    serviceType: "MEKANDA",
    temperature: "SICAK",
    milkType: "NORMAL_SUT",
    cream: "KREMA_OLSUN",
    extra: "EKSTRA_BUZLU",
  };
}

function defaultFoodCustomization(): FoodCustomization {
  return {
    serviceType: "SICAK",
  };
}

function calculateDrinkUnitPrice(basePrice: number, customization: DrinkCustomization): number {
  let nextPrice = basePrice;

  if (customization.size === "LARGE") {
    nextPrice += DRINK_LARGE_SIZE_EXTRA;
  }

  if (customization.milkType === "BADEM_SUTU" || customization.milkType === "YULAF_SUTU") {
    nextPrice += DRINK_PLANT_BASED_MILK_EXTRA;
  }

  return nextPrice;
}

function buildModifierText(item: CartItem): string {
  if (item.category === "DRINK" && item.drinkCustomization) {
    const extraNotes: string[] = [];
    if (item.drinkCustomization.size === "LARGE") {
      extraNotes.push(`Büyük boy +${DRINK_LARGE_SIZE_EXTRA} TL`);
    }
    if (item.drinkCustomization.milkType === "BADEM_SUTU" || item.drinkCustomization.milkType === "YULAF_SUTU") {
      extraNotes.push(`Bitkisel süt +${DRINK_PLANT_BASED_MILK_EXTRA} TL`);
    }

    return [
      `Boyut: ${drinkSizeLabels[item.drinkCustomization.size]}`,
      `Servis: ${drinkServiceLabels[item.drinkCustomization.serviceType]}`,
      `Sıcak-Soğuk: ${drinkTemperatureLabels[item.drinkCustomization.temperature]}`,
      `Süt tipi: ${milkTypeLabels[item.drinkCustomization.milkType]}`,
      `Krema: ${creamLabels[item.drinkCustomization.cream]}`,
      `Ekstra: ${drinkExtraLabels[item.drinkCustomization.extra]}`,
      ...extraNotes,
    ].join(" | ");
  }

  if (item.category === "FOOD" && item.foodCustomization) {
    return `Servis tipi: ${foodServiceLabels[item.foodCustomization.serviceType]}`;
  }

  return "";
}

export function OrderCreateForm({ products }: { products: ProductRow[] }) {
  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState<ProductSubCategory | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, action, isPending] = useActionState(createOrderAction, { error: null });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (cart.length === 0) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [cart.length]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return products;

    return products.filter((product) => product.name.toLowerCase().includes(normalizedSearch));
  }, [products, search]);

  const isSearching = search.trim().length > 0;

  const groupedProducts = useMemo(() => {
    const grouped = Object.fromEntries(
      PRODUCT_SUBCATEGORY_ORDER.map((groupKey) => [groupKey, [] as ProductRow[]]),
    ) as Record<
      ProductSubCategory,
      ProductRow[]
    >;

    for (const product of filteredProducts) {
      const groupKey = product.subCategory ?? inferProductSubCategory(product.category, product.name);
      grouped[groupKey].push(product);
    }

    return grouped;
  }, [filteredProducts]);

  const totalAmount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.unitPrice * item.qty, 0);
  }, [cart]);

  const serializedItems = useMemo(() => {
    return JSON.stringify(
      cart.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        modifierText: buildModifierText(item),
        drinkSize: item.drinkCustomization?.size,
        milkType: item.drinkCustomization?.milkType,
      })),
    );
  }, [cart]);

  const addToCart = (product: ProductRow) => {
    setLocalError(null);

    setCart((prev) => {
      const index = prev.findIndex((item) => item.productId === product.id);

      if (index >= 0) {
        const existing = prev[index];
        if (existing.trackStock && existing.qty >= existing.stockQty) {
          setLocalError(`${product.name} için stok yetersiz.`);
          return prev;
        }

        const next = [...prev];
        next[index] = {
          ...existing,
          qty: existing.qty + 1,
        };
        return next;
      }

      if (product.trackStock && product.stockQty <= 0) {
        setLocalError(`${product.name} stokta kalmadı.`);
        return prev;
      }

      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          basePrice: product.basePrice,
          unitPrice:
            product.category === "DRINK"
              ? calculateDrinkUnitPrice(product.basePrice, defaultDrinkCustomization())
              : product.basePrice,
          qty: 1,
          category: product.category,
          drinkCustomization: product.category === "DRINK" ? defaultDrinkCustomization() : null,
          foodCustomization: product.category === "FOOD" ? defaultFoodCustomization() : null,
          trackStock: product.trackStock,
          stockQty: product.stockQty,
        },
      ];
    });
  };

  const changeQty = (productId: string, nextQty: number) => {
    setLocalError(null);
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId !== productId) return item;

          if (nextQty <= 0) return null;

          if (item.trackStock && nextQty > item.stockQty) {
            setLocalError(`${item.name} için stok yetersiz.`);
            return item;
          }

          return {
            ...item,
            qty: nextQty,
          };
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const changeDrinkCustomization = <K extends keyof DrinkCustomization>(
    productId: string,
    key: K,
    value: DrinkCustomization[K],
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.category === "DRINK" && item.drinkCustomization
          ? (() => {
            const nextCustomization = {
              ...item.drinkCustomization,
              [key]: value,
            } as DrinkCustomization;

            return {
              ...item,
              unitPrice: calculateDrinkUnitPrice(item.basePrice, nextCustomization),
              drinkCustomization: nextCustomization,
            };
          })()
          : item,
      ),
    );
  };

  const changeFoodCustomization = (productId: string, serviceType: FoodServiceType) => {
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId && item.category === "FOOD" && item.foodCustomization
          ? {
            ...item,
            foodCustomization: {
              serviceType,
            },
          }
          : item,
      ),
    );
  };

  const canSubmit = cart.length > 0 && !isPending;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="panel flex flex-col p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Ürünler</h2>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ürün ara..."
            className="h-10 w-full max-w-xs rounded-xl border border-slate-300 px-3 outline-none focus:border-slate-500"
          />
        </div>
        {!isSearching ? (
          <p className="muted mb-3 text-xs">Önce alt kategori seçin, sonra ürünleri ekleyin.</p>
        ) : null}

        <div className="grid gap-2 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <p className="muted rounded-xl border border-dashed border-slate-300 p-6 text-sm">
              Aramana uygun ürün bulunamadı.
            </p>
          ) : (
            <div className="space-y-4">
              {PRODUCT_SUBCATEGORY_ORDER.map((groupKey) => {
                const groupProducts = groupedProducts[groupKey];
                if (groupProducts.length === 0) return null;
                const isOpen = isSearching ? true : openGroup === groupKey;

                return (
                  <section key={groupKey} className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setOpenGroup((prev) => (prev === groupKey ? null : groupKey))}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left"
                    >
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                        {PRODUCT_SUBCATEGORY_LABELS[groupKey]}
                      </span>
                      <span className="text-xs text-slate-500">
                        {groupProducts.length} ürün {isOpen ? "▾" : "▸"}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="grid gap-2">
                        {groupProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => addToCart(product)}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-400"
                          >
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="muted text-xs">
                                {formatCurrencyTRY(product.basePrice)}
                                {product.category === "DRINK" ? ` • Büyük +${DRINK_LARGE_SIZE_EXTRA} TL` : ""}
                                {product.trackStock ? ` • Stok: ${product.stockQty}` : " • Stok takibi yok"}
                                {` • ${productCategoryLabels[product.category]}`}
                              </p>
                            </div>
                            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium">Ekle</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <form action={action} className="panel flex flex-col p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sepet</h2>
          <span className="muted text-xs">{cart.length} ürün</span>
        </div>

        <div className="flex-1 space-y-3">
          {cart.length === 0 ? (
            <p className="muted rounded-xl border border-dashed border-slate-300 p-5 text-sm">
              Ürüne dokunarak siparişe ekleyin.
            </p>
          ) : (
            cart.map((item) => (
              <article key={item.productId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="muted text-xs">{formatCurrencyTRY(item.unitPrice)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeQty(item.productId, item.qty - 1)}
                      className="h-8 w-8 rounded-lg border border-slate-300 bg-white"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => changeQty(item.productId, item.qty + 1)}
                      className="h-8 w-8 rounded-lg border border-slate-300 bg-white"
                    >
                      +
                    </button>
                  </div>
                </div>

                {item.category === "DRINK" && item.drinkCustomization ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-600">Özelleştirme</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="text-xs text-slate-600">
                        <span className="mb-1 block">0. seçenek - Boyut</span>
                        <select
                          value={item.drinkCustomization.size}
                          onChange={(event) =>
                            changeDrinkCustomization(item.productId, "size", event.target.value as DrinkSize)
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                        >
                          <option value="SMALL">Küçük</option>
                          <option value="LARGE">Büyük (+{DRINK_LARGE_SIZE_EXTRA} TL)</option>
                        </select>
                      </label>

                      <label className="text-xs text-slate-600">
                        <span className="mb-1 block">1. seçenek - Mekanda/Takeaway</span>
                        <select
                          value={item.drinkCustomization.serviceType}
                          onChange={(event) =>
                            changeDrinkCustomization(
                              item.productId,
                              "serviceType",
                              event.target.value as DrinkServiceType,
                            )
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                        >
                          <option value="MEKANDA">Mekanda</option>
                          <option value="TAKEAWAY">Takeaway</option>
                        </select>
                      </label>

                      <label className="text-xs text-slate-600">
                        <span className="mb-1 block">2. seçenek - Sıcak/Soğuk</span>
                        <select
                          value={item.drinkCustomization.temperature}
                          onChange={(event) =>
                            changeDrinkCustomization(
                              item.productId,
                              "temperature",
                              event.target.value as DrinkTemperature,
                            )
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                        >
                          <option value="SICAK">Sıcak</option>
                          <option value="SOGUK">Soğuk</option>
                        </select>
                      </label>

                      <label className="text-xs text-slate-600">
                        <span className="mb-1 block">3. seçenek - Süt tipi</span>
                        <select
                          value={item.drinkCustomization.milkType}
                          onChange={(event) =>
                            changeDrinkCustomization(item.productId, "milkType", event.target.value as MilkType)
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                        >
                          <option value="NORMAL_SUT">Normal süt</option>
                          <option value="LAKTOZSUZ_SUT">Laktozsuz süt</option>
                          <option value="BADEM_SUTU">Badem sütü (+{DRINK_PLANT_BASED_MILK_EXTRA} TL)</option>
                          <option value="YULAF_SUTU">Yulaf sütü (+{DRINK_PLANT_BASED_MILK_EXTRA} TL)</option>
                          <option value="SUTSUZ">Sütsüz</option>
                        </select>
                      </label>

                      <label className="text-xs text-slate-600">
                        <span className="mb-1 block">4. seçenek - Krema</span>
                        <select
                          value={item.drinkCustomization.cream}
                          onChange={(event) =>
                            changeDrinkCustomization(
                              item.productId,
                              "cream",
                              event.target.value as CreamPreference,
                            )
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                        >
                          <option value="KREMA_OLSUN">Krema olsun</option>
                          <option value="KREMA_OLMASIN">Krema olmasın</option>
                        </select>
                      </label>

                      <label className="text-xs text-slate-600 sm:col-span-2">
                        <span className="mb-1 block">5. seçenek - Ekstralar</span>
                        <select
                          value={item.drinkCustomization.extra}
                          onChange={(event) =>
                            changeDrinkCustomization(item.productId, "extra", event.target.value as DrinkExtra)
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                        >
                          <option value="EKSTRA_BUZLU">Ekstra buzlu</option>
                          <option value="EKSTRA_SUTLU">Ekstra sütlü</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ) : null}

                {item.category === "FOOD" && item.foodCustomization ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-slate-600">Servis tipi</p>
                    <select
                      value={item.foodCustomization.serviceType}
                      onChange={(event) =>
                        changeFoodCustomization(item.productId, event.target.value as FoodServiceType)
                      }
                      className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                    >
                      <option value="SICAK">Sıcak</option>
                      <option value="SOGUK">Soğuk</option>
                    </select>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>

        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
          <div>
            <p className="mb-2 text-sm font-medium">Ödeme Tipi</p>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:grid-cols-4">
              {paymentOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaymentMethod(option.value)}
                  className={`h-9 rounded-lg text-sm transition ${paymentMethod === option.value
                    ? "bg-[var(--primary)] font-semibold text-white"
                    : "bg-transparent text-slate-700"
                    }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Not (opsiyonel)</span>
            <input
              type="text"
              name="note"
              maxLength={120}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-slate-500"
              placeholder="Kısa not"
            />
          </label>

          <input type="hidden" name="itemsJson" value={serializedItems} />
          <input type="hidden" name="paymentMethod" value={paymentMethod} />

          {localError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{localError}</p>
          ) : null}
          {state.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
          ) : null}

          <div className="sticky bottom-0 rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm muted">Toplam</span>
              <strong className="text-xl">{formatCurrencyTRY(totalAmount)}</strong>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="submit"
                disabled={!canSubmit}
                className="h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Kaydediliyor..." : "Siparişi Kaydet"}
              </button>
              <Link
                href="/"
                className="flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700"
              >
                İptal
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
