import { ReportView } from "@/components/report-view";
import { requireSession } from "@/lib/auth";
import { getReportByRange } from "@/lib/reports";
import { getTodayTR } from "@/lib/time";
import { PrintButton } from "@/components/print-button";

function getWeekRange(day: string): { startDay: string; endDay: string } {
  const date = new Date(`${day}T00:00:00Z`);
  const weekDay = date.getUTCDay();
  const offsetToMonday = weekDay === 0 ? 6 : weekDay - 1;

  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() - offsetToMonday);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  return {
    startDay: start.toISOString().slice(0, 10),
    endDay: end.toISOString().slice(0, 10),
  };
}

type AdminReportsPageProps = {
  searchParams: Promise<{ preset?: string; start?: string; end?: string }>;
};

export default async function AdminReportsPage({ searchParams }: AdminReportsPageProps) {
  await requireSession("ADMIN");

  const params = await searchParams;
  const today = getTodayTR();

  let start = params.start || today;
  let end = params.end || today;

  if (params.preset === "today") {
    start = today;
    end = today;
  }

  if (params.preset === "week") {
    const week = getWeekRange(today);
    start = week.startDay;
    end = week.endDay;
  }

  const report = await getReportByRange(start, end);

  return (
    <div className="space-y-5">
      <section className="panel no-print p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Admin Raporları</h1>
            <p className="muted mt-1 text-sm">Günlük, haftalık veya özel tarih aralığı.</p>
          </div>

          <a
            href="/admin/reports?preset=today"
            className="ml-auto h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold leading-10"
          >
            Bugün
          </a>
          <a
            href="/admin/reports?preset=week"
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold leading-10"
          >
            Bu Hafta
          </a>

          <form className="flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Başlangıç</span>
              <input
                type="date"
                name="start"
                defaultValue={report.startDay}
                className="h-10 rounded-xl border border-slate-300 px-3"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">Bitiş</span>
              <input
                type="date"
                name="end"
                defaultValue={report.endDay}
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

          <a
            href={`/api/reports/day.csv?start=${report.startDay}&end=${report.endDay}`}
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold leading-10"
          >
            CSV
          </a>
          <PrintButton />
        </div>
      </section>

      <ReportView report={report} />
    </div>
  );
}
