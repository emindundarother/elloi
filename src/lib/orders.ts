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
  isPayLater?: boolean;
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

  // --- Step 2 & 3: create payments & validate (skip if pay-later) ---
  if (!input.isPayLater) {
    for (const p of input.payments) {
      let paymentAmount: Prisma.Decimal;

      if (isItemLevel && p.itemIndices && p.itemIndices.length > 0) {
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
  const paymentCount = await prisma.orderPayment.count({ where: { orderId } });

  if (paymentCount === 0) {
    throw new Error("Ödeme yapılmadan sipariş teslim edilemez. Lütfen önce ödeme alınız.");
  }

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

export async function completeOrderPayment(
  orderId: string,
  payments: PaymentEntryInput[],
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: { orderBy: { createdAt: "asc" }, select: { id: true, lineTotal: true } },
        payments: { select: { id: true } },
      },
    });

    if (!order) throw new Error("Sipariş bulunamadı.");
    if (order.status !== OrderStatus.OPEN) throw new Error("Sadece açık siparişler ödenebilir.");
    if (order.payments.length > 0) throw new Error("Bu sipariş zaten ödenmiş.");

    const isItemLevel = payments.some((p) => p.itemIndices && p.itemIndices.length > 0);

    for (const p of payments) {
      let paymentAmount: Prisma.Decimal;

      if (isItemLevel && p.itemIndices && p.itemIndices.length > 0) {
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
        },
      });

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

    const createdPayments = await tx.orderPayment.findMany({
      where: { orderId: order.id },
      select: { amount: true },
    });
    const paymentSumDecimal = createdPayments.reduce(
      (sum, pp) => sum.add(pp.amount),
      new Prisma.Decimal(0),
    );

    if (!paymentSumDecimal.equals(order.totalAmount)) {
      throw new Error(
        `Ödeme toplamı (${paymentSumDecimal}) sipariş toplamıyla (${order.totalAmount}) eşleşmiyor.`,
      );
    }
  });
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

export async function updateOrder(
  orderId: string,
  input: Omit<CreateOrderInput, "createdById">,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // --- 1. Load existing order ---
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: { select: { id: true, productId: true, qty: true } },
        payments: { select: { id: true } },
      },
    });

    if (!order) throw new Error("Sipariş bulunamadı.");
    if (order.status !== OrderStatus.OPEN) throw new Error("Sadece açık siparişler düzenlenebilir.");

    // --- 2. Revert old stock ---
    const oldStockNeeds = new Map<string, number>();
    for (const item of order.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { trackStock: true },
      });
      if (product?.trackStock) {
        oldStockNeeds.set(item.productId, (oldStockNeeds.get(item.productId) ?? 0) + item.qty);
      }
    }

    for (const [productId, qty] of oldStockNeeds.entries()) {
      await tx.product.update({
        where: { id: productId },
        data: { stockQty: { increment: qty } },
      });

      await tx.stockMovement.create({
        data: {
          productId,
          type: StockMovementType.ORDER_EDIT_REVERT,
          qtyDelta: qty,
          orderId: order.id,
          reason: "Sipariş düzenleme stok iadesi",
          createdById: order.createdById,
        },
      });
    }

    // --- 3. Delete old payments and items ---
    await tx.orderPayment.deleteMany({ where: { orderId: order.id } });
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });

    // --- 4. Build new items ---
    const requestedProductIds = Array.from(new Set(input.items.map((item) => item.productId)));
    const products = await tx.product.findMany({
      where: { id: { in: requestedProductIds }, isActive: true },
    });

    if (products.length !== requestedProductIds.length) {
      throw new Error("Bazı ürünler artık aktif değil. Lütfen siparişi yenileyin.");
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const newStockNeeds = new Map<string, number>();
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
      if (!product) throw new Error("Ürün bulunamadı.");
      if (item.qty <= 0) throw new Error("Adet en az 1 olmalı.");

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
        newStockNeeds.set(product.id, (newStockNeeds.get(product.id) ?? 0) + item.qty);
      }
    }

    // --- 5. Apply new stock ---
    for (const [productId, qty] of newStockNeeds.entries()) {
      const updated = await tx.product.updateMany({
        where: { id: productId, trackStock: true, stockQty: { gte: qty } },
        data: { stockQty: { decrement: qty } },
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

    // --- 6. Create new items ---
    await tx.orderItem.createMany({
      data: itemRows.map((row) => ({ ...row, orderId: order.id })),
    });

    // Reload items to get IDs for payment linking
    const newItems = await tx.orderItem.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, lineTotal: true },
    });

    // --- 7. Create new payments (skip if pay-later) ---
    if (!input.isPayLater) {
      const isItemLevel = input.payments.some((p) => p.itemIndices && p.itemIndices.length > 0);

      for (const p of input.payments) {
        let paymentAmount: Prisma.Decimal;

        if (isItemLevel && p.itemIndices && p.itemIndices.length > 0) {
          paymentAmount = p.itemIndices.reduce(
            (sum, idx) => sum.add(newItems[idx]?.lineTotal ?? new Prisma.Decimal(0)),
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

        if (isItemLevel && p.itemIndices && p.itemIndices.length > 0) {
          const itemIds = p.itemIndices.map((idx) => newItems[idx]?.id).filter(Boolean) as string[];
          if (itemIds.length > 0) {
            await tx.orderItem.updateMany({
              where: { id: { in: itemIds } },
              data: { orderPaymentId: payment.id },
            });
          }
        }
      }

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
    }

    // --- 8. New stock movements ---
    for (const [productId, qty] of newStockNeeds.entries()) {
      await tx.stockMovement.create({
        data: {
          productId,
          type: StockMovementType.SALE,
          qtyDelta: -qty,
          orderId: order.id,
          createdById: order.createdById,
        },
      });
    }

    // --- 9. Update order totals ---
    await tx.order.update({
      where: { id: order.id },
      data: {
        totalAmount,
        note: cleanModifier(input.note),
      },
    });
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

