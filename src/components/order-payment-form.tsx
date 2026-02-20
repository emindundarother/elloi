"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { completePaymentAction } from "@/app/actions/orders";
import { formatCurrencyTRY } from "@/lib/format";

type OrderItemRow = {
    id: string;
    productNameSnapshot: string;
    unitPriceSnapshot: number;
    qty: number;
    modifierText: string | null;
    lineTotal: number;
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

let paymentIdCounter = 0;
function nextPaymentId(): string {
    paymentIdCounter += 1;
    return `ppay-${paymentIdCounter}`;
}

export function OrderPaymentForm({
    orderId,
    items,
    totalAmount,
}: {
    orderId: string;
    items: OrderItemRow[];
    totalAmount: number;
}) {
    const [payments, setPayments] = useState<PaymentEntry[]>([
        { id: nextPaymentId(), paymentMethod: "CASH", amount: 0 },
    ]);
    const [state, action, isPending] = useActionState(completePaymentAction, { error: null });

    // Item-level payment state
    const [isItemLevelPayment, setIsItemLevelPayment] = useState(false);
    const [selectedItemIndices, setSelectedItemIndices] = useState<Set<number>>(new Set());
    const [itemAssignMethod, setItemAssignMethod] = useState<PaymentMethod>("CARD");

    const paymentTotal = useMemo(() => {
        return payments.reduce((acc, p) => acc + p.amount, 0);
    }, [payments]);

    const paymentMismatch = Math.abs(paymentTotal - totalAmount) > 0.009;

    const unassignedItemIndices = useMemo(() => {
        if (!isItemLevelPayment) return [];
        const assignedSet = new Set(payments.flatMap((p) => p.itemIndices ?? []));
        return items.map((_, i) => i).filter((i) => !assignedSet.has(i));
    }, [isItemLevelPayment, payments, items]);

    const itemLevelMismatch = isItemLevelPayment && unassignedItemIndices.length > 0;

    const serializedPayments = useMemo(() => {
        return JSON.stringify(
            payments
                .filter((p) => p.amount > 0)
                .map((p) => ({
                    paymentMethod: p.paymentMethod,
                    amount: p.amount,
                    ...(p.itemIndices && p.itemIndices.length > 0 ? { itemIndices: p.itemIndices } : {}),
                })),
        );
    }, [payments]);

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
                    ? { ...p, [field]: field === "amount" ? Number(value) || 0 : value }
                    : p,
            ),
        );
    };

    const setFullAmountPayment = (method: PaymentMethod) => {
        if (isItemLevelPayment) {
            const allIndices = items.map((_, i) => i);
            setPayments([{ id: nextPaymentId(), paymentMethod: method, amount: totalAmount, itemIndices: allIndices }]);
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
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const assignSelectedItems = () => {
        if (selectedItemIndices.size === 0) return;

        const indices = Array.from(selectedItemIndices).sort((a, b) => a - b);
        const amount = indices.reduce((sum, idx) => {
            const item = items[idx];
            return item ? sum + item.lineTotal : sum;
        }, 0);

        setPayments((prev) => [
            ...prev,
            { id: nextPaymentId(), paymentMethod: itemAssignMethod, amount, itemIndices: indices },
        ]);
        setSelectedItemIndices(new Set());
    };

    const removeItemLevelPayment = (paymentId: string) => {
        setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    };

    const toggleItemLevelPayment = (checked: boolean) => {
        setIsItemLevelPayment(checked);
        setSelectedItemIndices(new Set());
        setPayments([{ id: nextPaymentId(), paymentMethod: "CASH", amount: checked ? 0 : totalAmount }]);
    };

    const canSubmit = !isPending && paymentTotal > 0 &&
        (isItemLevelPayment ? !itemLevelMismatch : !paymentMismatch);

    return (
        <form action={action} className="panel flex flex-col p-5 sm:p-6">
            {/* Order items (read-only) */}
            <div className="mb-4">
                <h2 className="text-lg font-semibold mb-3">Sipariş Kalemleri</h2>
                <div className="space-y-2">
                    {items.map((item, index) => {
                        const assignedPayment = isItemLevelPayment
                            ? payments.find((p) => p.itemIndices?.includes(index))
                            : null;
                        const isAssigned = !!assignedPayment;
                        const isSelected = selectedItemIndices.has(index);

                        return (
                            <div
                                key={item.id}
                                className={`flex items-center justify-between rounded-xl border p-3 transition ${isItemLevelPayment && isAssigned
                                        ? "border-green-300 bg-green-50"
                                        : isItemLevelPayment && isSelected
                                            ? "border-blue-300 bg-blue-50"
                                            : "border-slate-200 bg-slate-50"
                                    }`}
                            >
                                <div className="flex items-center gap-2">
                                    {isItemLevelPayment && !isAssigned ? (
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleItemSelection(index)}
                                            className="h-4 w-4 rounded accent-blue-600"
                                        />
                                    ) : null}
                                    {isItemLevelPayment && isAssigned && assignedPayment ? (
                                        <span className="inline-flex h-5 items-center rounded bg-green-600 px-1.5 text-[10px] font-bold text-white">
                                            {paymentOptions.find((o) => o.value === assignedPayment.paymentMethod)?.label}
                                        </span>
                                    ) : null}
                                    <div>
                                        <p className="font-medium">{item.productNameSnapshot}</p>
                                        <p className="muted text-xs">
                                            {item.qty}× {formatCurrencyTRY(item.unitPriceSnapshot)}
                                            {item.modifierText ? ` • ${item.modifierText}` : ""}
                                        </p>
                                    </div>
                                </div>
                                <span className="font-semibold text-sm">{formatCurrencyTRY(item.lineTotal)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Payment section */}
            <div className="space-y-4 border-t border-slate-200 pt-4">
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
                                            const ci = items[idx];
                                            return ci ? `${ci.qty}× ${ci.productNameSnapshot}` : null;
                                        }).filter(Boolean).join(", ")}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {itemLevelMismatch ? (
                            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                                {unassignedItemIndices.length} ürün henüz bir ödeme yöntemine atanmadı:
                                {" "}{unassignedItemIndices.map((i) => items[i]?.productNameSnapshot).filter(Boolean).join(", ")}
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
            </div>

            <input type="hidden" name="orderId" value={orderId} />
            <input type="hidden" name="paymentsJson" value={serializedPayments} />

            {state.error ? (
                <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            ) : null}

            <div className="mt-4 sticky bottom-0 rounded-xl border border-slate-200 bg-white p-3">
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
                        {isPending ? "Kaydediliyor..." : "Ödemeyi Kaydet"}
                    </button>
                    <Link
                        href="/"
                        className="flex h-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700"
                    >
                        İptal
                    </Link>
                </div>
            </div>
        </form>
    );
}
