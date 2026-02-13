import { PAYMENT_METHOD_LABELS } from "@/lib/constants";
import { formatCurrencyTRY, formatDateTimeTR } from "@/lib/format";
import { ReportData } from "@/lib/reports";
import { cancelOrderAction } from "@/app/actions/orders";

import { ConfirmSubmitButton } from "./confirm-submit-button";

export function ReportView({ report, showDeleteActions = false }: { report: ReportData; showDeleteActions?: boolean }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Toplam Ciro</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrencyTRY(report.totalRevenue)}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Sipariş Adedi</p>
          <p className="mt-2 text-2xl font-semibold">{report.totalOrders}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Kredi Kartı</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrencyTRY(report.paymentTotals.CARD)}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Nakit</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrencyTRY(report.paymentTotals.CASH)}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Metropol Kart</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrencyTRY(report.paymentTotals.METROPOL)}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Ticket Edenred</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrencyTRY(report.paymentTotals.EDENRED)}</p>
        </div>
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Ürün Kırılımı</h2>
        </header>
        {report.products.length === 0 ? (
          <p className="muted p-4 text-sm">Seçilen aralıkta ürün satışı bulunmuyor.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Ürün</th>
                <th className="px-4 py-2 font-medium">Adet</th>
                <th className="px-4 py-2 font-medium">Ciro</th>
              </tr>
            </thead>
            <tbody>
              {report.products.map((row) => (
                <tr key={row.productName} className="border-t border-slate-100">
                  <td className="px-4 py-2">{row.productName}</td>
                  <td className="px-4 py-2">{row.qty}</td>
                  <td className="px-4 py-2 font-medium">{formatCurrencyTRY(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel overflow-hidden">
        <header className="border-b border-slate-200 px-4 py-3">
          <h2 className="font-semibold">Sipariş Detayı</h2>
        </header>
        {report.orders.length === 0 ? (
          <p className="muted p-4 text-sm">Seçilen aralıkta sipariş bulunmuyor.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {report.orders.map((order) => (
              <details key={order.id} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{order.orderNo}</p>
                    <p className="muted text-xs">
                      {formatDateTimeTR(order.createdAt)} • {PAYMENT_METHOD_LABELS[order.paymentMethod]} • {order.status}
                    </p>
                    <p className="muted text-xs">Kasiyer: {order.createdByUsername}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrencyTRY(order.totalAmount)}</p>
                    <p className="muted text-xs">
                      Teslim: {order.deliveredAt ? formatDateTimeTR(order.deliveredAt) : "-"}
                    </p>
                    {showDeleteActions ? (
                      <form action={cancelOrderAction.bind(null, order.id)} className="mt-2">
                        <ConfirmSubmitButton
                          label="Sil"
                          confirmMessage="Bu siparişi silmek istediğinizden emin misiniz?"
                          className="h-8 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-700"
                        />
                      </form>
                    ) : null}
                  </div>
                </summary>

                <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                      <div>
                        <p className="font-medium">
                          {item.productNameSnapshot} x {item.qty}
                        </p>
                        {item.modifierText ? <p className="muted text-xs">Not: {item.modifierText}</p> : null}
                      </div>
                      <p className="font-medium">{formatCurrencyTRY(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
