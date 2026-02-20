import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatus } from "@prisma/client";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrencyTRY, toNumber } from "@/lib/format";
import { OrderPaymentForm } from "@/components/order-payment-form";

export default async function PayOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
    const session = await requireSession();
    const { orderId } = await params;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            orderNo: true,
            status: true,
            totalAmount: true,
            createdById: true,
            items: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    productNameSnapshot: true,
                    unitPriceSnapshot: true,
                    qty: true,
                    modifierText: true,
                    lineTotal: true,
                },
            },
            payments: { select: { id: true } },
        },
    });

    if (!order || order.status !== OrderStatus.OPEN) {
        notFound();
    }

    // Check access
    if (session.role !== "ADMIN" && order.createdById !== session.userId) {
        notFound();
    }

    if (order.payments.length > 0) {
        return (
            <div className="space-y-4">
                <div className="panel p-5 sm:p-6">
                    <h1 className="text-2xl font-semibold">Ödeme — {order.orderNo}</h1>
                    <p className="mt-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                        Bu sipariş zaten ödenmiş.
                    </p>
                    <Link
                        href="/"
                        className="mt-4 inline-flex h-10 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold"
                    >
                        Kasa Ekranına Dön
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Ödeme Yap — {order.orderNo}</h1>
                <p className="muted mt-1 text-sm">
                    Sipariş tutarı: {formatCurrencyTRY(order.totalAmount)}
                </p>
            </div>

            <OrderPaymentForm
                orderId={order.id}
                items={order.items.map((item) => ({
                    ...item,
                    unitPriceSnapshot: toNumber(item.unitPriceSnapshot),
                    lineTotal: toNumber(item.lineTotal),
                }))}
                totalAmount={toNumber(order.totalAmount)}
            />
        </div>
    );
}
