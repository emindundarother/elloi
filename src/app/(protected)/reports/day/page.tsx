import { OrderStatus } from "@prisma/client";
import Link from "next/link";

import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getReportByRange } from "@/lib/reports";
import { getDayRangeUtc, getTodayTR, normalizeDayInput } from "@/lib/time";

import { DayCloseForm } from "@/components/day-close-form";
import { PrintButton } from "@/components/print-button";
import { ReportView } from "@/components/report-view";

type DayReportPageProps = {
  searchParams: Promise<{ day?: string }>;
};

export default async function DayReportPage({ searchParams }: DayReportPageProps) {
  const session = await requireSession();
  const params = await searchParams;

  const selectedDay = normalizeDayInput(params.day ?? getTodayTR());
  const report = await getReportByRange(selectedDay, selectedDay);
  const existingClosure = await prisma.dayClosure.findUnique({
    where: { day: selectedDay },
    select: { id: true },
  });

  const { startUtc, endUtc } = getDayRangeUtc(selectedDay);
  const openOrderCount = await prisma.order.count({
    where: {
      status: OrderStatus.OPEN,
      createdAt: { gte: startUtc, lte: endUtc },
    },
  });

  return (
    <div className="space-y-5">
      <section className="panel no-print p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Gün Sonu Raporu</h1>
            <p className="muted mt-1 text-sm">Varsayılan: cihazın güncel tarihi.</p>
          </div>

          <form className="ml-auto flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Tarih</span>
              <input
                type="date"
                name="day"
                defaultValue={selectedDay}
                className="h-10 rounded-xl border border-slate-300 px-3"
              />
            </label>
            <button
              type="submit"
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold"
            >
              Uygula
            </button>
          </form>

          {session.role === "ADMIN" ? (
            <a
              href={`/api/reports/day.csv?start=${report.startDay}&end=${report.endDay}`}
              className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold leading-10"
            >
              CSV
            </a>
          ) : null}
          <PrintButton />
          <Link
            href="/reports/day"
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold leading-10"
          >
            Sıfırla
          </Link>
        </div>
      </section>

      <section className="panel no-print p-4">
        <h2 className="text-lg font-semibold">Günü Sonlandır</h2>
        <p className="muted mt-1 text-sm">
          Z raporu toplamını girip günü sonlandırdığınızda fark analizi ve kapanış raporu oluşturulur.
        </p>
        <div className="mt-3">
          <DayCloseForm
            day={selectedDay}
            existingClosureId={existingClosure?.id ?? null}
            dailyRevenue={report.totalRevenue}
            canReset={session.role === "ADMIN"}
            openOrderCount={openOrderCount}
          />
        </div>
      </section>

      <section className="panel p-4">
        <h2 className="text-lg font-semibold">Günün Özeti - {selectedDay}</h2>
      </section>

      <ReportView
        report={report}
        showDeleteActions
        currentUserId={session.userId}
        isAdmin={session.role === "ADMIN"}
      />
    </div>
  );
}
