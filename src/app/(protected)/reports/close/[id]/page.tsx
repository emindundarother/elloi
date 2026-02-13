import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatCurrencyTRY, formatDateTR, formatDateTimeTR, formatTimeTR, toNumber } from "@/lib/format";
import { getReportByRange } from "@/lib/reports";

import { PrintButton } from "@/components/print-button";
import { ReportView } from "@/components/report-view";

type DayCloseReportPageProps = {
  params: Promise<{ id: string }>;
};

export default async function DayCloseReportPage({ params }: DayCloseReportPageProps) {
  await requireSession();
  const { id } = await params;

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
    notFound();
  }

  const report = await getReportByRange(closure.day, closure.day);
  const difference = toNumber(closure.difference);
  const hasMismatch = closure.hasMismatch;

  return (
    <div className="space-y-5">
      <section className="panel no-print p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Gün Sonlandırma Raporu</h1>
            <p className="muted mt-1 text-sm">
              Gün: {closure.day} • Sonlandıran: {closure.createdBy.username} • {formatDateTimeTR(closure.createdAt)}
            </p>
          </div>

          <a
            href={`/api/reports/day-close.csv?id=${closure.id}`}
            className="ml-auto h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold leading-10"
          >
            CSV Kaydet
          </a>
          <PrintButton label="PDF Kaydet" />
          <Link
            href="/reports/day"
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold leading-10"
          >
            Geri
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Raporu Oluşturan</p>
          <p className="mt-2 text-base font-semibold">{closure.createdBy.username}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Oluşturulma Tarihi</p>
          <p className="mt-2 text-base font-semibold">{formatDateTR(closure.createdAt)}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Oluşturulma Saati</p>
          <p className="mt-2 text-base font-semibold">{formatTimeTR(closure.createdAt)}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Gün Sonu Cirosu</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrencyTRY(closure.systemTotal)}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Z Raporu Toplamı</p>
          <p className="mt-2 text-2xl font-semibold">{formatCurrencyTRY(closure.zReportTotal)}</p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Fark</p>
          <p className={`mt-2 text-2xl font-semibold ${hasMismatch ? "text-red-700" : "text-emerald-700"}`}>
            {formatCurrencyTRY(difference)}
          </p>
        </div>
        <div className="panel p-4">
          <p className="muted text-xs uppercase tracking-wide">Toplam Sipariş / Ürün</p>
          <p className="mt-2 text-base font-semibold">
            {closure.totalOrders} / {closure.totalItems}
          </p>
        </div>
      </section>

      {hasMismatch ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">gün sonu rakamları tutmuyor</p>
          <p className="mt-1 text-sm">Sistem cirosu ile girilen Z raporu toplamı arasında fark var.</p>
        </section>
      ) : (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <p className="font-semibold">Gün sonu rakamları tutarlı.</p>
        </section>
      )}

      <ReportView report={report} />
    </div>
  );
}
