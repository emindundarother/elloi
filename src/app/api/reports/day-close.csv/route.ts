import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { toNumber } from "@/lib/format";
import { getReportByRange } from "@/lib/reports";

function sanitizeCsvValue(value: string): string {
  if (/^[=+\-@\t\r\n]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

function escapeCsv(value: unknown): string {
  const stringValue = sanitizeCsvValue(String(value ?? ""));
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return new Response("Yetkisiz", { status: 401 });
  }
  if (session.role !== "ADMIN") {
    return new Response("Yetkisiz", { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return new Response("id zorunlu", { status: 400 });
  }

  const closure = await prisma.dayClosure.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!closure) {
    return new Response("Rapor bulunamadı", { status: 404 });
  }

  const report = await getReportByRange(closure.day, closure.day);

  const summaryRows = [
    ["day", closure.day],
    ["createdBy", closure.createdBy.username],
    ["createdAt", closure.createdAt.toISOString()],
    ["systemTotal", toNumber(closure.systemTotal).toFixed(2)],
    ["zReportTotal", toNumber(closure.zReportTotal).toFixed(2)],
    ["difference", toNumber(closure.difference).toFixed(2)],
    ["hasMismatch", closure.hasMismatch ? "Evet" : "Hayır"],
    ["mismatchMessage", closure.hasMismatch ? "gün sonu rakamları tutmuyor" : ""],
    ["totalOrders", closure.totalOrders.toString()],
    ["totalItems", closure.totalItems.toString()],
  ].map((row) => row.map((cell) => escapeCsv(cell)).join(","));

  const productHeader = ["productName", "qty", "revenue"].map(escapeCsv).join(",");
  const productRows = report.products.map((product) =>
    [
      product.productName,
      product.qty.toString(),
      product.revenue.toFixed(2),
    ]
      .map((value) => escapeCsv(value))
      .join(","),
  );

  const detailHeader = [
    "orderNo",
    "status",
    "createdAt",
    "deliveredAt",
    "cashier",
    "paymentMethod",
    "totalAmount",
    "productName",
    "qty",
    "modifier",
    "lineTotal",
  ]
    .map(escapeCsv)
    .join(",");

  const detailRows = report.orders.flatMap((order) =>
    order.items.map((item) =>
      [
        order.orderNo,
        order.status,
        order.createdAt.toISOString(),
        order.deliveredAt ? order.deliveredAt.toISOString() : "",
        order.createdByUsername,
        order.payments.length > 0
          ? order.payments
            .map((p) => `${PAYMENT_METHOD_LABELS[p.paymentMethod]}: ${p.amount.toFixed(2)}`)
            .join("; ")
          : order.paymentMethod
            ? PAYMENT_METHOD_LABELS[order.paymentMethod]
            : "-",
        order.totalAmount.toFixed(2),
        item.productNameSnapshot,
        item.qty.toString(),
        item.modifierText ?? "",
        item.lineTotal.toFixed(2),
      ]
        .map((value) => escapeCsv(value))
        .join(","),
    ),
  );

  const csv = [
    escapeCsv("summaryKey"),
    ...summaryRows,
    "",
    escapeCsv("productBreakdown"),
    productHeader,
    ...productRows,
    "",
    escapeCsv("orderDetails"),
    detailHeader,
    ...detailRows,
  ].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="elloi-day-close-${closure.day}.csv"`,
    },
  });
}
