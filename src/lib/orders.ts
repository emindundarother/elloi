import {
  OrderStatus,
  PaymentMethod,
  Prisma,
  StockMovementType,
} from "@prisma/client";

import { DRINK_LARGE_SIZE_EXTRA, DRINK_PLANT_BASED_MILK_EXTRA } from "./constants";
import { prisma } from "./db";
import { getTodayTR, getTrDateKey } from "./time";

type DrinkSize = "SMALL" | "LARGE";
type MilkType = "NORMAL_SUT" | "LAKTOZSUZ_SUT" | "BADEM_SUTU" | "YULAF_SUTU" | "SUTSUZ";

type CreateOrderItemInput = {
  productId: string;
  qty: number;
  modifierText?: string;
  drinkSize?: DrinkSize;
  milkType?: MilkType;
};

type PaymentEntryInput = {
  paymentMethod: PaymentMethod;
  amount: number;
  note?: string;
  itemIndices?: number[];
};

type CreateOrderInput = {
  payments: PaymentEntryInput[];
  note?: string;
  items: CreateOrderItemInput[];
  createdById: string;
};

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

function nextOrderNo(prefix: string, lastOrderNo?: string): string {
  const lastSeq = lastOrderNo ? Number(lastOrderNo.slice(-3)) : 0;
  const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(3, "0")}`;
}

function cleanModifier(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function calculateUnitPrice(product: { basePrice: Prisma.Decimal; category: string }, item: CreateOrderItemInput): Prisma.Decimal {
  if (product.category !== "DRINK") {
    return product.basePrice;
  }

  let unitPrice = product.basePrice;

  if (item.drinkSize === "LARGE") {
    unitPrice = unitPrice.plus(DRINK_LARGE_SIZE_EXTRA);
  }

  if (item.milkType === "BADEM_SUTU" || item.milkType === "YULAF_SUTU") {
    unitPrice = unitPrice.plus(DRINK_PLANT_BASED_MILK_EXTRA);
  }

  return unitPrice;
}

async function createOrderTxn(
  tx: Prisma.TransactionClient,
  input: CreateOrderInput,
): Promise<{ id: string; orderNo: string }> {
  const today = getTodayTR();
  const dayClosure = await tx.dayClosure.findUnique({
    where: { day: today },
    select: { id: true },
  });

  if (dayClosure) {
    throw new Error("Gün sonlandırıldı. Yeni sipariş açılamaz.");
  }

  const prefix = `ELL-${getTrDateKey(new Date())}-`;
  const lastOrder = await tx.order.findFirst({
    where: { orderNo: { startsWith: prefix } },
    orderBy: { orderNo: "desc" },
    select: { orderNo: true },
  });

  const orderNo = nextOrderNo(prefix, lastOrder?.orderNo);

  const requestedProductIds = Array.from(new Set(input.items.map((item) => item.productId)));
  const products = await tx.product.findMany({
    where: {
      id: { in: requestedProductIds },
      isActive: true,
    },
  });

  if (products.length !== requestedProductIds.length) {
    throw new Error("Bazı ürünler artık aktif değil. Lütfen siparişi yenileyin.");
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const stockNeeds = new Map<string, number>();
  const itemRows: Array<{
    productId: string;
    productNameSnapshot: string;
    unitPriceSnapshot: Prisma.Decimal;
    qty: number;
    modifierText: string | null;
    lineTotal: Prisma.Decimal;
  }> = [];

  let totalAmount = new Prisma.Decimal(0);

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new Error("Ürün bulunamadı.");
    }

    if (item.qty <= 0) {
      throw new Error("Adet en az 1 olmalı.");
    }

    const unitPrice = calculateUnitPrice(product, item);
    const lineTotal = unitPrice.mul(item.qty);
    totalAmount = totalAmount.plus(lineTotal);

    itemRows.push({
      productId: item.productId,
      productNameSnapshot: product.name,
      unitPriceSnapshot: unitPrice,
      qty: item.qty,
      modifierText: cleanModifier(item.modifierText),
      lineTotal,
    });

    if (product.trackStock) {
      stockNeeds.set(product.id, (stockNeeds.get(product.id) ?? 0) + item.qty);
    }
  }

  for (const [productId, qty] of stockNeeds.entries()) {
    const updated = await tx.product.updateMany({
      where: {
        id: productId,
        trackStock: true,
        stockQty: { gte: qty },
      },
      data: {
        stockQty: { decrement: qty },
      },
    });

    if (updated.count === 0) {
      const latest = await tx.product.findUnique({
        where: { id: productId },
        select: { name: true, stockQty: true },
      });

      throw new StockError(
        `${latest?.name ?? "Ürün"} için stok yetersiz. Mevcut: ${latest?.stockQty ?? 0}`,
      );
    }
  }

  const isItemLevel = input.payments.some((p) => p.itemIndices && p.itemIndices.length > 0);

  // --- Step 1: create order + items (without payment links yet) ---
  const order = await tx.order.create({
    data: {
      orderNo,
      status: OrderStatus.OPEN,
      paymentMethod: null,
      totalAmount,
      note: cleanModifier(input.note),
      createdById: input.createdById,
      items: {
        create: itemRows,
      },
    },
    select: {
      id: true,
      orderNo: true,
      items: { select: { id: true, lineTotal: true }, orderBy: { createdAt: "asc" } },
    },
  });

  // --- Step 2: create payments & link items ---
  for (const p of input.payments) {
    let paymentAmount: Prisma.Decimal;

    if (isItemLevel && p.itemIndices && p.itemIndices.length > 0) {
      // Item-level: amount is the sum of linked items' lineTotals
      paymentAmount = p.itemIndices.reduce(
        (sum, idx) => sum.add(order.items[idx]?.lineTotal ?? new Prisma.Decimal(0)),
        new Prisma.Decimal(0),
      );
    } else {
      paymentAmount = new Prisma.Decimal(p.amount.toFixed(2));
    }

    const payment = await tx.orderPayment.create({
      data: {
        orderId: order.id,
        paymentMethod: p.paymentMethod,
        amount: paymentAmount,
        note: cleanModifier(p.note),
      },
    });

    // Link items to their payment
    if (isItemLevel && p.itemIndices && p.itemIndices.length > 0) {
      const itemIds = p.itemIndices.map((idx) => order.items[idx]?.id).filter(Boolean) as string[];
      if (itemIds.length > 0) {
        await tx.orderItem.updateMany({
          where: { id: { in: itemIds } },
          data: { orderPaymentId: payment.id },
        });
      }
    }
  }

  // --- Step 3: validate payment total matches order total ---
  const createdPayments = await tx.orderPayment.findMany({
    where: { orderId: order.id },
    select: { amount: true },
  });
  const paymentSumDecimal = createdPayments.reduce(
    (sum, pp) => sum.add(pp.amount),
    new Prisma.Decimal(0),
  );

  if (!paymentSumDecimal.equals(totalAmount)) {
    throw new Error(
      `Ödeme toplamı (${paymentSumDecimal}) sipariş toplamıyla (${totalAmount}) eşleşmiyor.`,
    );
  }

  for (const [productId, qty] of stockNeeds.entries()) {
    await tx.stockMovement.create({
      data: {
        productId,
        type: StockMovementType.SALE,
        qtyDelta: -qty,
        orderId: order.id,
        createdById: input.createdById,
      },
    });
  }

  return order;
}

export async function createOrder(input: CreateOrderInput): Promise<{ id: string; orderNo: string }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction((tx) => createOrderTxn(tx, input));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        attempt < 2
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Sipariş numarası üretilemedi. Lütfen tekrar deneyin.");
}

export async function deliverOrder(orderId: string): Promise<void> {
  const updated = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: OrderStatus.OPEN,
    },
    data: {
      status: OrderStatus.DELIVERED,
      deliveredAt: new Date(),
    },
  });

  if (updated.count === 0) {
    throw new Error("Sipariş teslim edilemedi. Durumu değişmiş olabilir.");
  }
}

export async function cancelOrder(orderId: string, userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (
      !order ||
      (order.status !== OrderStatus.OPEN && order.status !== OrderStatus.DELIVERED)
    ) {
      throw new Error("Sadece açık veya teslim edilmiş sipariş silinebilir.");
    }

    const affectedProducts = Array.from(new Set(order.items.map((item) => item.productId)));
    const products = await tx.product.findMany({
      where: {
        id: { in: affectedProducts },
      },
      select: {
        id: true,
        name: true,
        trackStock: true,
      },
    });

    const productMap = new Map(products.map((product) => [product.id, product]));
    const revertStock = new Map<string, number>();

    for (const item of order.items) {
      const product = productMap.get(item.productId);
      if (!product?.trackStock) continue;

      revertStock.set(item.productId, (revertStock.get(item.productId) ?? 0) + item.qty);
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CANCELED,
        canceledAt: new Date(),
        deliveredAt: null,
      },
    });

    for (const [productId, qty] of revertStock.entries()) {
      await tx.product.update({
        where: { id: productId },
        data: {
          stockQty: { increment: qty },
        },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          type: StockMovementType.CANCEL_REVERT,
          qtyDelta: qty,
          orderId: order.id,
          reason: "Sipariş iptali stok iadesi",
          createdById: userId,
        },
      });
    }
  });
}

export async function listOpenOrders() {
  return prisma.order.findMany({
    where: { status: OrderStatus.OPEN },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      orderNo: true,
      paymentMethod: true,
      totalAmount: true,
      createdAt: true,
      note: true,
      createdById: true,
      createdBy: {
        select: {
          username: true,
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
}
