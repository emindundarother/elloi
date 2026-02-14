import { OrderStatus, PaymentMethod } from "@prisma/client";

import { prisma } from "./db";
import { toNumber } from "./format";
import { getRangeUtc } from "./time";

type PaymentTotals = Record<PaymentMethod, number>;

export type ReportOrderItem = {
  id: string;
  productNameSnapshot: string;
  qty: number;
  modifierText: string | null;
  lineTotal: number;
};

export type ReportOrder = {
  id: string;
  orderNo: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  createdById: string;
  createdByUsername: string;
  totalAmount: number;
  createdAt: Date;
  deliveredAt: Date | null;
  items: ReportOrderItem[];
};

export type ProductBreakdown = {
  productName: string;
  qty: number;
  revenue: number;
};

export type ReportData = {
  startDay: string;
  endDay: string;
  totalRevenue: number;
  totalOrders: number;
  paymentTotals: PaymentTotals;
  products: ProductBreakdown[];
  orders: ReportOrder[];
};

export async function getReportByRange(startDay?: string | null, endDay?: string | null): Promise<ReportData> {
  const { startUtc, endUtc, startDay: normalizedStart, endDay: normalizedEnd } = getRangeUtc(
    startDay,
    endDay,
  );

  const rows = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startUtc,
        lte: endUtc,
      },
      status: {
        in: [OrderStatus.OPEN, OrderStatus.DELIVERED],
      },
    },
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: {
        select: {
          username: true,
        },
      },
      items: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const paymentTotals: PaymentTotals = {
    CASH: 0,
    CARD: 0,
    METROPOL: 0,
    EDENRED: 0,
  };

  let totalRevenue = 0;
  const productsMap = new Map<string, ProductBreakdown>();

  const orders: ReportOrder[] = rows.map((order) => {
    const orderTotal = toNumber(order.totalAmount);
    totalRevenue += orderTotal;
    paymentTotals[order.paymentMethod] += orderTotal;

    const items: ReportOrderItem[] = order.items.map((item) => {
      const lineTotal = toNumber(item.lineTotal);
      const existing = productsMap.get(item.productNameSnapshot);

      if (existing) {
        existing.qty += item.qty;
        existing.revenue += lineTotal;
      } else {
        productsMap.set(item.productNameSnapshot, {
          productName: item.productNameSnapshot,
          qty: item.qty,
          revenue: lineTotal,
        });
      }

      return {
        id: item.id,
        productNameSnapshot: item.productNameSnapshot,
        qty: item.qty,
        modifierText: item.modifierText,
        lineTotal,
      };
    });

    return {
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      paymentMethod: order.paymentMethod,
      createdById: order.createdById,
      createdByUsername: order.createdBy.username,
      totalAmount: orderTotal,
      createdAt: order.createdAt,
      deliveredAt: order.deliveredAt,
      items,
    };
  });

  return {
    startDay: normalizedStart,
    endDay: normalizedEnd,
    totalRevenue,
    totalOrders: orders.length,
    paymentTotals,
    products: Array.from(productsMap.values()).sort((a, b) => b.revenue - a.revenue),
    orders,
  };
}
