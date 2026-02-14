import { NextRequest } from "next/server";

import { getSession } from "@/lib/auth";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
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

  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const report = await getReportByRange(start, end ?? start);

  const header = [
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
  ].join(",");

  const rows = report.orders.flatMap((order) =>
    order.items.map((item) =>
      [
        order.orderNo,
        order.status,
        order.createdAt.toISOString(),
        order.deliveredAt ? order.deliveredAt.toISOString() : "",
        order.createdByUsername,
        PAYMENT_METHOD_LABELS[order.paymentMethod],
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

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="elloi-report-${report.startDay}-${report.endDay}.csv"`,
    },
  });
}
