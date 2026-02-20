import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderStatus } from "@prisma/client";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { resolveProductSubCategory } from "@/lib/product-subcategory";
import { OrderCreateForm } from "@/components/order-create-form";

export default async function EditOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
    await requireSession();
    const { orderId } = await params;

    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
            id: true,
            orderNo: true,
            status: true,
            note: true,
            items: {
                orderBy: { createdAt: "asc" },
                select: {
                    id: true,
                    productId: true,
                    productNameSnapshot: true,
                    unitPriceSnapshot: true,
                    qty: true,
                    modifierText: true,
                    lineTotal: true,
                    product: {
                        select: {
                            id: true,
                            name: true,
                            category: true,
                            subCategory: true,
                            basePrice: true,
                            stockQty: true,
                            trackStock: true,
                            isActive: true,
                        },
                    },
                },
            },
            payments: {
                select: {
                    paymentMethod: true,
                    amount: true,
                },
            },
        },
    });

    if (!order || order.status !== OrderStatus.OPEN) {
        notFound();
    }

    // Fetch all active products for the product picker
    const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            category: true,
            subCategory: true,
            basePrice: true,
            stockQty: true,
            trackStock: true,
        },
    });

    // Build initial cart from order items
    const initialCart = order.items.map((item) => ({
        productId: item.productId,
        name: item.product.isActive ? item.product.name : item.productNameSnapshot,
        basePrice: item.product.isActive ? toNumber(item.product.basePrice) : toNumber(item.unitPriceSnapshot),
        unitPrice: toNumber(item.unitPriceSnapshot),
        qty: item.qty,
        category: item.product.category as "FOOD" | "DRINK" | "EXTRAS",
        trackStock: item.product.trackStock,
        stockQty: item.product.stockQty + item.qty, // Add back qty since edit will revert stock
        modifierText: item.modifierText,
    }));

    // Build initial payments
    const initialPayments = order.payments.map((p) => ({
        paymentMethod: p.paymentMethod as "CASH" | "CARD" | "METROPOL" | "EDENRED",
        amount: toNumber(p.amount),
    }));

    const isPayLater = order.payments.length === 0;

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-2xl font-semibold">Sipariş Düzenle — {order.orderNo}</h1>
                <p className="muted mt-1 text-sm">Ürünleri düzenleyin, ödemeyi ayarlayın, kaydedin.</p>
            </div>

            <OrderCreateForm
                products={products.map((product) => ({
                    ...product,
                    subCategory: resolveProductSubCategory(product.subCategory, product.category, product.name),
                    basePrice: toNumber(product.basePrice),
                }))}
                editOrderId={order.id}
                editOrderNo={order.orderNo}
                initialCart={initialCart}
                initialPayments={initialPayments}
                initialNote={order.note ?? ""}
                initialIsPayLater={isPayLater}
            />
        </div>
    );
}
