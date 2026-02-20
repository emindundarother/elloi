import Link from "next/link";
import { OrderStatus } from "@prisma/client";

import { cancelOrderAction, deliverOrderAction } from "@/app/actions/orders";
import { requireSession } from "@/lib/auth";
import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatCurrencyTRY, formatDateTimeTR, formatTimeTR } from "@/lib/format";
import { listOpenOrders } from "@/lib/orders";
import { getDayRangeUtc, getTodayTR } from "@/lib/time";
import { LiveClock } from "@/components/live-clock";

export default async function DashboardPage() {
  const session = await requireSession();
  const today = getTodayTR();
  const { startUtc, endUtc } = getDayRangeUtc(today);
  const dayClosure = await prisma.dayClosure.findUnique({
    where: { day: today },
    select: { id: true },
  });
  const isDayClosed = Boolean(dayClosure);
  const openOrders = await listOpenOrders();
  const pastOrders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startUtc,
        lte: endUtc,
      },
      status: {
        in: [OrderStatus.DELIVERED, OrderStatus.CANCELED],
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNo: true,
      status: true,
      paymentMethod: true,
      totalAmount: true,
      createdAt: true,
      deliveredAt: true,
      canceledAt: true,
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

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <div className="panel p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tarih - Saat</p>
          <p className="mt-3 text-2xl font-semibold"><LiveClock /></p>
          {isDayClosed ? (
            <>
              <button
                type="button"
                disabled
                className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-slate-300 text-base font-semibold text-slate-600"
              >
                + Yeni Sipariş
              </button>
              <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                Gün sonlandı, daha fazla sipariş alamazsınız.
              </p>
            </>
          ) : (
            <Link
              href="/order/new"
              className="mt-5 flex h-14 w-full items-center justify-center rounded-2xl bg-[var(--primary)] text-base font-semibold text-white transition hover:bg-[var(--primary-hover)]"
            >
              + Yeni Sipariş
            </Link>
          )}
        </div>

        <div className="panel overflow-hidden">
          <header className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-semibold">Açık Siparişler</h2>
          </header>

          {openOrders.length === 0 ? (
            <p className="muted p-4 text-sm">Açık sipariş yok. Yeni sipariş oluşturarak başlayın.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Sipariş No</th>
                    <th className="px-4 py-3 font-medium">Saat</th>
                    <th className="px-4 py-3 font-medium">Kasiyer</th>
                    <th className="px-4 py-3 font-medium">Ödeme</th>
                    <th className="px-4 py-3 font-medium">Toplam</th>
                    <th className="px-4 py-3 font-medium">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {openOrders.map((order) => {
                    const canManage = session.role === "ADMIN" || order.createdById === session.userId;

                    return (
                      <tr key={order.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-semibold">{order.orderNo}</td>
                        <td className="px-4 py-3">{formatTimeTR(order.createdAt)}</td>
                        <td className="px-4 py-3">{order.createdBy.username}</td>
                        <td className="px-4 py-3">
                          {order.payments.length > 0
                            ? order.payments
                              .map((p) => `${PAYMENT_METHOD_LABELS[p.paymentMethod]}: ${formatCurrencyTRY(p.amount)}`)
                              .join(", ")
                            : <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Ödeme Bekliyor</span>}
                        </td>
                        <td className="px-4 py-3 font-medium">{formatCurrencyTRY(order.totalAmount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {order.payments.length > 0 ? (
                              <form action={deliverOrderAction.bind(null, order.id)}>
                                <button
                                  type="submit"
                                  className="h-9 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white"
                                >
                                  Teslim Et
                                </button>
                              </form>
                            ) : (
                              <Link
                                href={`/order/pay/${order.id}`}
                                className="flex h-9 items-center rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white transition hover:bg-amber-600"
                              >
                                Ödeme Yap
                              </Link>
                            )}
                            <Link
                              href={`/order/edit/${order.id}`}
                              className="flex h-9 items-center rounded-lg border border-blue-300 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:border-blue-400 hover:bg-blue-100"
                            >
                              Düzenle
                            </Link>
                            {canManage ? (
                              <form action={cancelOrderAction.bind(null, order.id)}>
                                <button
                                  type="submit"
                                  className="h-9 rounded-lg border border-red-300 px-3 text-xs font-semibold text-red-700"
                                >
                                  İptal
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Günün Geçmiş Siparişleri</h2>
        </header>
        {pastOrders.length === 0 ? (
          <p className="muted p-4 text-sm">Bugün tamamlanan veya iptal edilen sipariş yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Sipariş No</th>
                  <th className="px-4 py-3 font-medium">Durum</th>
                  <th className="px-4 py-3 font-medium">Saat</th>
                  <th className="px-4 py-3 font-medium">Kasiyer</th>
                  <th className="px-4 py-3 font-medium">Ödeme</th>
                  <th className="px-4 py-3 font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {pastOrders.map((order) => {
                  const statusLabel = order.status === OrderStatus.DELIVERED ? "Teslim" : "İptal";
                  const actionTime = order.status === OrderStatus.DELIVERED ? order.deliveredAt : order.canceledAt;

                  return (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-semibold">{order.orderNo}</td>
                      <td className="px-4 py-3">{statusLabel}</td>
                      <td className="px-4 py-3">{formatTimeTR(actionTime ?? order.createdAt)}</td>
                      <td className="px-4 py-3">{order.createdBy.username}</td>
                      <td className="px-4 py-3">
                        {order.payments.length > 0
                          ? order.payments
                            .map((p) => `${PAYMENT_METHOD_LABELS[p.paymentMethod]}: ${formatCurrencyTRY(p.amount)}`)
                            .join(", ")
                          : order.paymentMethod
                            ? PAYMENT_METHOD_LABELS[order.paymentMethod]
                            : "-"}
                      </td>
                      <td className="px-4 py-3 font-medium">{formatCurrencyTRY(order.totalAmount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <footer className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
          Güncelleme zamanı: {formatDateTimeTR(new Date())}
        </footer>
      </section>
    </div>
  );
}
