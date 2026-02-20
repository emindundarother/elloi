"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";

import { createOrderAction, updateOrderAction } from "@/app/actions/orders";
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
type DrinkExtra = "EKSTRA_YOK" | "EKSTRA_BUZLU" | "EKSTRA_SUTLU";
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
  cartItemId: string;
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

type PaymentEntry = {
  id: string;
  paymentMethod: PaymentMethod;
  amount: number;
  itemIndices?: number[];
};

const paymentOptions: Array<{ value: PaymentMethod; label: string }> = [
  { value: "CARD", label: "Kredi Kartı" },
  { value: "CASH", label: "Nakit" },
  { value: "METROPOL", label: "Metropol Kart" },
  { value: "EDENRED", label: "Ticket Edenred" },
];

let cartItemIdCounter = 0;
function nextCartItemId(): string {
  cartItemIdCounter += 1;
  return `ci-${cartItemIdCounter}`;
}

let paymentIdCounter = 0;
function nextPaymentId(): string {
  paymentIdCounter += 1;
  return `pay-${paymentIdCounter}`;
}

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
  EKSTRA_YOK: "Ekstra yok",
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
    cream: "KREMA_OLMASIN",
    extra: "EKSTRA_YOK",
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

type InitialCartItem = {
  productId: string;
  name: string;
  basePrice: number;
  unitPrice: number;
  qty: number;
  category: ProductCategory;
  trackStock: boolean;
  stockQty: number;
  modifierText: string | null;
};

type InitialPayment = {
  paymentMethod: "CASH" | "CARD" | "METROPOL" | "EDENRED";
  amount: number;
};

type OrderCreateFormProps = {
  products: ProductRow[];
  editOrderId?: string;
  editOrderNo?: string;
  initialCart?: InitialCartItem[];
  initialPayments?: InitialPayment[];
  initialNote?: string;
  initialIsPayLater?: boolean;
};

function buildInitialCart(items: InitialCartItem[]): CartItem[] {
  return items.map((item) => ({
    cartItemId: nextCartItemId(),
    productId: item.productId,
    name: item.name,
    basePrice: item.basePrice,
    unitPrice: item.unitPrice,
    qty: item.qty,
    category: item.category,
    drinkCustomization: item.category === "DRINK" ? defaultDrinkCustomization() : null,
    foodCustomization: item.category === "FOOD" ? defaultFoodCustomization() : null,
    trackStock: item.trackStock,
    stockQty: item.stockQty,
  }));
}

function buildInitialPayments(payments: InitialPayment[]): PaymentEntry[] {
  if (payments.length === 0) return [];
  return payments.map((p) => ({
    id: nextPaymentId(),
    paymentMethod: p.paymentMethod,
    amount: p.amount,
  }));
}

export function OrderCreateForm({
  products,
  editOrderId,
  editOrderNo,
  initialCart,
  initialPayments,
  initialNote,
  initialIsPayLater,
}: OrderCreateFormProps) {
  const isEditMode = Boolean(editOrderId);
  const formAction = isEditMode ? updateOrderAction : createOrderAction;

  const [search, setSearch] = useState("");
  const [openGroup, setOpenGroup] = useState<ProductSubCategory | null>(null);
  const [cart, setCart] = useState<CartItem[]>(
    initialCart ? buildInitialCart(initialCart) : [],
  );
  const [payments, setPayments] = useState<PaymentEntry[]>(
    initialPayments && initialPayments.length > 0
      ? buildInitialPayments(initialPayments)
      : [{ id: nextPaymentId(), paymentMethod: "CASH", amount: 0 }],
  );
  const [localError, setLocalError] = useState<string | null>(null);
  const [state, action, isPending] = useActionState(formAction, { error: null });

  // Pay-later state
  const [isPayLater, setIsPayLater] = useState(initialIsPayLater ?? false);

  // Item-level payment state
  const [isItemLevelPayment, setIsItemLevelPayment] = useState(false);
  const [selectedItemIndices, setSelectedItemIndices] = useState<Set<number>>(new Set());
  const [selectedItemQtys, setSelectedItemQtys] = useState<Map<number, number>>(new Map());
  const [itemAssignMethod, setItemAssignMethod] = useState<PaymentMethod>("CARD");

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

  const paymentTotal = useMemo(() => {
    return payments.reduce((acc, p) => acc + p.amount, 0);
  }, [payments]);

  const paymentMismatch = cart.length > 0 && Math.abs(paymentTotal - totalAmount) > 0.009;

  // For item-level mode: check all items are assigned
  const unassignedItemIndices = useMemo(() => {
    if (!isItemLevelPayment) return [];
    const assignedSet = new Set(payments.flatMap((p) => p.itemIndices ?? []));
    return cart.map((_, i) => i).filter((i) => !assignedSet.has(i));
  }, [isItemLevelPayment, payments, cart]);

  const itemLevelMismatch = isItemLevelPayment && cart.length > 0 && unassignedItemIndices.length > 0;

  const serializedPayments = useMemo(() => {
    if (isPayLater) return "[]";
    return JSON.stringify(
      payments
        .filter((p) => p.amount > 0)
        .map((p) => ({
          paymentMethod: p.paymentMethod,
          amount: p.amount,
          ...(p.itemIndices && p.itemIndices.length > 0 ? { itemIndices: p.itemIndices } : {}),
        })),
    );
  }, [payments, isPayLater]);

  const addPaymentEntry = () => {
    setPayments((prev) => [
      ...prev,
      { id: nextPaymentId(), paymentMethod: "CASH", amount: 0 },
    ]);
  };

  const removePaymentEntry = (id: string) => {
    setPayments((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((p) => p.id !== id);
    });
  };

  const updatePaymentEntry = (id: string, field: "paymentMethod" | "amount", value: string | number) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
            ...p,
            [field]: field === "amount" ? Number(value) || 0 : value,
          }
          : p,
      ),
    );
  };

  const setFullAmountPayment = (method: PaymentMethod) => {
    if (isItemLevelPayment) {
      const allIndices = cart.map((_, i) => i);
      const amount = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
      setPayments([{ id: nextPaymentId(), paymentMethod: method, amount, itemIndices: allIndices }]);
      setSelectedItemIndices(new Set());
    } else {
      setPayments([{ id: nextPaymentId(), paymentMethod: method, amount: totalAmount }]);
    }
  };

  const toggleItemSelection = (index: number) => {
    setSelectedItemIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        setSelectedItemQtys((qm) => {
          const nq = new Map(qm);
          nq.delete(index);
          return nq;
        });
      } else {
        next.add(index);
        const item = cart[index];
        if (item) {
          setSelectedItemQtys((qm) => new Map(qm).set(index, item.qty));
        }
      }
      return next;
    });
  };

  const changeSelectedQty = (index: number, qty: number) => {
    const item = cart[index];
    if (!item) return;
    const clamped = Math.max(1, Math.min(qty, item.qty));
    setSelectedItemQtys((qm) => new Map(qm).set(index, clamped));
  };

  const assignSelectedItems = () => {
    if (selectedItemIndices.size === 0) return;

    const indices = Array.from(selectedItemIndices).sort((a, b) => b - a);

    const nextCart = [...cart];
    const newIndices: number[] = [];

    for (const idx of indices) {
      const item = nextCart[idx];
      if (!item) continue;

      const selQty = selectedItemQtys.get(idx) ?? item.qty;

      if (selQty < item.qty) {
        nextCart[idx] = { ...item, qty: selQty };
        const remainderItem: CartItem = { ...item, cartItemId: nextCartItemId(), qty: item.qty - selQty };
        nextCart.splice(idx + 1, 0, remainderItem);
        newIndices.push(idx);
      } else {
        newIndices.push(idx);
      }
    }

    const oldToNew = new Map<number, number>();
    let offset = 0;
    for (let i = 0; i < cart.length; i++) {
      oldToNew.set(i, i + offset);
      if (selectedItemIndices.has(i)) {
        const selQty = selectedItemQtys.get(i) ?? cart[i].qty;
        if (selQty < cart[i].qty) {
          offset += 1;
        }
      }
    }

    const finalIndices = newIndices.sort((a, b) => a - b);
    const mappedFinalIndices = finalIndices.map((oi) => oldToNew.get(oi) ?? oi);

    const amount = mappedFinalIndices.reduce((sum, idx) => {
      const ci = nextCart[idx];
      return ci ? sum + ci.unitPrice * ci.qty : sum;
    }, 0);

    setCart(nextCart);

    setPayments((prevPayments) => {
      const remapped = prevPayments.map((p) => {
        if (!p.itemIndices || p.itemIndices.length === 0) return p;
        return {
          ...p,
          itemIndices: p.itemIndices.map((oi) => oldToNew.get(oi) ?? oi),
        };
      });
      return [
        ...remapped,
        { id: nextPaymentId(), paymentMethod: itemAssignMethod, amount, itemIndices: mappedFinalIndices },
      ];
    });

    setSelectedItemIndices(new Set());
    setSelectedItemQtys(new Map());
  };

  const removeItemLevelPayment = (paymentId: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== paymentId));
  };

  const toggleItemLevelPayment = (checked: boolean) => {
    setIsItemLevelPayment(checked);
    setSelectedItemIndices(new Set());
    setSelectedItemQtys(new Map());
    setPayments([{ id: nextPaymentId(), paymentMethod: "CASH", amount: checked ? 0 : totalAmount }]);
  };

  const togglePayLater = (checked: boolean) => {
    setIsPayLater(checked);
    if (checked) {
      setIsItemLevelPayment(false);
      setSelectedItemIndices(new Set());
      setSelectedItemQtys(new Map());
      setPayments([]);
    } else {
      setPayments([{ id: nextPaymentId(), paymentMethod: "CASH", amount: totalAmount }]);
    }
  };

  const addToCart = (product: ProductRow) => {
    setLocalError(null);

    setCart((prev) => {
      const currentTotalQty = prev
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + item.qty, 0);

      if (product.trackStock && currentTotalQty >= product.stockQty) {
        setLocalError(`${product.name} için stok yetersiz.`);
        return prev;
      }

      return [
        ...prev,
        {
          cartItemId: nextCartItemId(),
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

  const changeQty = (cartItemId: string, nextQty: number) => {
    setLocalError(null);
    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.cartItemId !== cartItemId) return item;

          if (nextQty <= 0) return null;

          const otherQty = prev
            .filter((other) => other.productId === item.productId && other.cartItemId !== cartItemId)
            .reduce((sum, other) => sum + other.qty, 0);

          if (item.trackStock && nextQty + otherQty > item.stockQty) {
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
    cartItemId: string,
    key: K,
    value: DrinkCustomization[K],
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId && item.category === "DRINK" && item.drinkCustomization
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

  const changeFoodCustomization = (cartItemId: string, serviceType: FoodServiceType) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId && item.category === "FOOD" && item.foodCustomization
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

  const canSubmit = cart.length > 0 && !isPending && (
    isPayLater || (paymentTotal > 0 && (isItemLevelPayment ? !itemLevelMismatch : !paymentMismatch))
  );

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
            (() => {
              const renderOrder = cart.map((item, cartIndex) => ({ item, cartIndex }));
              if (isItemLevelPayment) {
                renderOrder.sort((a, b) => {
                  const aAssigned = payments.some((p) => p.itemIndices?.includes(a.cartIndex));
                  const bAssigned = payments.some((p) => p.itemIndices?.includes(b.cartIndex));
                  if (aAssigned === bAssigned) return a.cartIndex - b.cartIndex;
                  return aAssigned ? -1 : 1;
                });
              }
              return renderOrder;
            })().map(({ item, cartIndex }) => {
              const assignedPayment = isItemLevelPayment
                ? payments.find((p) => p.itemIndices?.includes(cartIndex))
                : null;
              const isAssigned = !!assignedPayment;
              const isSelected = selectedItemIndices.has(cartIndex);

              return (
                <article
                  key={item.cartItemId}
                  className={`rounded-xl border p-3 transition ${isItemLevelPayment && isAssigned
                    ? "border-green-300 bg-green-50"
                    : isItemLevelPayment && isSelected
                      ? "border-blue-300 bg-blue-50"
                      : "border-slate-200 bg-slate-50"
                    }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {isItemLevelPayment && !isAssigned ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItemSelection(cartIndex)}
                          className="h-4 w-4 rounded accent-blue-600"
                        />
                      ) : null}
                      {isItemLevelPayment && isAssigned && assignedPayment ? (
                        <span className="inline-flex h-5 items-center rounded bg-green-600 px-1.5 text-[10px] font-bold text-white">
                          {paymentOptions.find((o) => o.value === assignedPayment.paymentMethod)?.label ?? assignedPayment.paymentMethod}
                        </span>
                      ) : null}
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="muted text-xs">{formatCurrencyTRY(item.unitPrice)}</p>
                      </div>
                    </div>

                    {isItemLevelPayment && isAssigned ? (
                      <span className="text-sm font-semibold text-green-700">{item.qty}×</span>
                    ) : isItemLevelPayment && isSelected && item.qty > 1 ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 mr-1">Adet:</span>
                        <button
                          type="button"
                          onClick={() => changeSelectedQty(cartIndex, (selectedItemQtys.get(cartIndex) ?? item.qty) - 1)}
                          className="h-7 w-7 rounded-md border border-blue-300 bg-blue-50 text-xs font-bold text-blue-700"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-blue-700">
                          {selectedItemQtys.get(cartIndex) ?? item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeSelectedQty(cartIndex, (selectedItemQtys.get(cartIndex) ?? item.qty) + 1)}
                          className="h-7 w-7 rounded-md border border-blue-300 bg-blue-50 text-xs font-bold text-blue-700"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-slate-400">/ {item.qty}</span>
                      </div>
                    ) : isItemLevelPayment ? (
                      <span className="text-sm font-semibold">{item.qty}×</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => changeQty(item.cartItemId, item.qty - 1)}
                          className="h-8 w-8 rounded-lg border border-slate-300 bg-white"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => changeQty(item.cartItemId, item.qty + 1)}
                          className="h-8 w-8 rounded-lg border border-slate-300 bg-white"
                        >
                          +
                        </button>
                      </div>
                    )}
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
                              changeDrinkCustomization(item.cartItemId, "size", event.target.value as DrinkSize)
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
                                item.cartItemId,
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
                                item.cartItemId,
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
                              changeDrinkCustomization(item.cartItemId, "milkType", event.target.value as MilkType)
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
                                item.cartItemId,
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
                              changeDrinkCustomization(item.cartItemId, "extra", event.target.value as DrinkExtra)
                            }
                            className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                          >
                            <option value="EKSTRA_YOK">Ekstra yok</option>
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
                          changeFoodCustomization(item.cartItemId, event.target.value as FoodServiceType)
                        }
                        className="h-9 w-full rounded-lg border border-slate-300 px-2 text-sm"
                      >
                        <option value="SICAK">Sıcak</option>
                        <option value="SOGUK">Soğuk</option>
                      </select>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>

        <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
          <div>
            {/* Daha sonra öde toggle */}
            <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <input
                type="checkbox"
                checked={isPayLater}
                onChange={(e) => togglePayLater(e.target.checked)}
                className="h-4 w-4 rounded accent-amber-600"
              />
              <span className="text-sm font-medium text-amber-800">Daha Sonra Öde</span>
              <span className="text-xs text-amber-600">(ödeme yapmadan siparişi kaydet)</span>
            </label>

            {isPayLater ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3">
                <p className="text-sm text-amber-800 font-medium">
                  Sipariş ödeme yapılmadan kaydedilecek.
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Ödeme daha sonra açık siparişler listesinden yapılabilir.
                </p>
              </div>
            ) : (
              <>
                {/* Item-level payment toggle */}
                <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={isItemLevelPayment}
                    onChange={(e) => toggleItemLevelPayment(e.target.checked)}
                    className="h-4 w-4 rounded accent-blue-600"
                  />
                  <span className="text-sm font-medium text-slate-700">Ürün bazlı ödeme</span>
                  <span className="text-xs text-slate-500">(ürünleri farklı yöntemlerle öde)</span>
                </label>

                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Ödeme</p>
                  {!isItemLevelPayment ? (
                    <button
                      type="button"
                      onClick={addPaymentEntry}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400"
                    >
                      + Ödeme Ekle
                    </button>
                  ) : null}
                </div>

                {/* Quick full-amount buttons */}
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {paymentOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFullAmountPayment(option.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 transition hover:border-slate-400"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Item-level assignment controls */}
                {isItemLevelPayment ? (
                  <div className="space-y-3">
                    {selectedItemIndices.size > 0 ? (
                      <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2">
                        <span className="text-xs font-medium text-blue-700">
                          {selectedItemIndices.size} ürün seçili
                        </span>
                        <select
                          value={itemAssignMethod}
                          onChange={(e) => setItemAssignMethod(e.target.value as PaymentMethod)}
                          className="h-8 flex-1 rounded-lg border border-blue-300 px-2 text-sm"
                        >
                          {paymentOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={assignSelectedItems}
                          className="h-8 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                        >
                          Seçilenleri Ata →
                        </button>
                      </div>
                    ) : null}

                    <div className="space-y-2">
                      {payments.filter((p) => p.itemIndices && p.itemIndices.length > 0).map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-green-200 bg-green-50 p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex h-5 items-center rounded bg-green-600 px-1.5 text-[10px] font-bold text-white">
                                {paymentOptions.find((o) => o.value === entry.paymentMethod)?.label}
                              </span>
                              <span className="text-sm font-semibold text-green-800">
                                {formatCurrencyTRY(entry.amount)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItemLevelPayment(entry.id)}
                              className="h-6 w-6 rounded border border-red-200 bg-red-50 text-xs font-bold text-red-600"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-green-700">
                            {entry.itemIndices?.map((idx) => {
                              const ci = cart[idx];
                              return ci ? `${ci.qty}× ${ci.name}` : null;
                            }).filter(Boolean).join(", ")}
                          </p>
                        </div>
                      ))}
                    </div>

                    {itemLevelMismatch ? (
                      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {unassignedItemIndices.length} ürün henüz bir ödeme yöntemine atanmadı:
                        {" "}{unassignedItemIndices.map((i) => cart[i]?.name).filter(Boolean).join(", ")}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {payments.map((entry, index) => (
                        <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                          <span className="text-xs font-semibold text-slate-500 w-5">{index + 1}.</span>
                          <select
                            value={entry.paymentMethod}
                            onChange={(e) => updatePaymentEntry(entry.id, "paymentMethod", e.target.value)}
                            className="h-9 flex-1 rounded-lg border border-slate-300 px-2 text-sm"
                          >
                            {paymentOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={entry.amount || ""}
                            onChange={(e) => updatePaymentEntry(entry.id, "amount", e.target.value)}
                            placeholder="Tutar"
                            className="h-9 w-28 rounded-lg border border-slate-300 px-2 text-sm text-right"
                          />
                          <span className="text-xs text-slate-500">₺</span>
                          {payments.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removePaymentEntry(entry.id)}
                              className="h-8 w-8 rounded-lg border border-red-200 bg-red-50 text-xs font-bold text-red-600"
                            >
                              ✕
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>

                    {paymentMismatch ? (
                      <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        Ödeme toplamı = {formatCurrencyTRY(paymentTotal)}, kalan tutar = {formatCurrencyTRY(Math.max(totalAmount - paymentTotal, 0))}
                      </p>
                    ) : null}
                  </>
                )}
              </>
            )}
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">Not (opsiyonel)</span>
            <input
              type="text"
              name="note"
              maxLength={120}
              defaultValue={initialNote ?? ""}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-slate-500"
              placeholder="Kısa not"
            />
          </label>

          {editOrderId ? <input type="hidden" name="orderId" value={editOrderId} /> : null}
          <input type="hidden" name="itemsJson" value={serializedItems} />
          <input type="hidden" name="paymentsJson" value={serializedPayments} />
          <input type="hidden" name="isPayLater" value={isPayLater ? "true" : "false"} />

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
                {isPending
                  ? "Kaydediliyor..."
                  : isEditMode
                    ? isPayLater ? "Siparişi Güncelle (Ödemesiz)" : "Siparişi Güncelle"
                    : isPayLater ? "Siparişi Kaydet (Ödemesiz)" : "Siparişi Kaydet"}
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
