"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { closeDayAction, resetDayClosureAction } from "@/app/actions/day-close";
import { formatCurrencyTRY } from "@/lib/format";

export function DayCloseForm({
  day,
  existingClosureId,
  dailyRevenue,
  canReset,
  openOrderCount,
}: {
  day: string;
  existingClosureId: string | null;
  dailyRevenue: number;
  canReset: boolean;
  openOrderCount: number;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [zReportTotal, setZReportTotal] = useState("");
  const [state, action, isPending] = useActionState(closeDayAction, {
    error: null,
    closureId: null,
  });
  const [resetState, resetAction, isResetPending] = useActionState(resetDayClosureAction, {
    error: null,
    success: null,
  });

  useEffect(() => {
    if (!state.closureId || state.error) return;
    router.push(`/reports/close/${state.closureId}`);
  }, [router, state.closureId, state.error]);

  useEffect(() => {
    if (!resetState.success) return;
    router.refresh();
  }, [resetState.success, router]);

  if (existingClosureId) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">Bu gün zaten sonlandırılmış.</p>
        </div>
        <Link
          href={`/reports/close/${existingClosureId}`}
          className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold"
        >
          Kapanış Raporunu Aç
        </Link>
        {canReset ? (
          <form action={resetAction} className="space-y-2">
            <input type="hidden" name="day" value={day} />
            <input type="hidden" name="closureId" value={existingClosureId} />
            <button
              type="submit"
              disabled={isResetPending}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 disabled:opacity-60"
            >
              {isResetPending ? "Sıfırlanıyor..." : "Gün Sonu Raporunu Sıfırla"}
            </button>
            {resetState.error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {resetState.error}
              </p>
            ) : null}
            {resetState.success ? (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {resetState.success}
              </p>
            ) : null}
          </form>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {openOrderCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">
            {openOrderCount} aktif sipariş bulunuyor.
          </p>
          <p className="mt-1">
            Günü sonlandırmak için tüm siparişlerin teslim edilmiş veya iptal edilmiş olması gerekir.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={openOrderCount > 0}
        className="h-14 w-full rounded-2xl bg-[var(--primary)] px-4 text-base font-semibold text-white disabled:opacity-60"
      >
        Günü Sonlandır
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="panel w-full max-w-md p-5">
            <h3 className="text-lg font-semibold">Günlük Ciro</h3>
            <p className="mt-1 text-2xl font-semibold">{formatCurrencyTRY(dailyRevenue)}</p>

            <form action={action} className="mt-4 space-y-3">
              <input type="hidden" name="day" value={day} />
              <label className="flex flex-col gap-1">
                <span className="text-xs text-slate-500">Z Raporu Toplamı</span>
                <input
                  name="zReportTotal"
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={zReportTotal}
                  onChange={(event) => setZReportTotal(event.target.value)}
                  placeholder="Örn. 12543.90"
                  className="h-10 rounded-xl border border-slate-300 px-3"
                />
              </label>

              {state.error ? (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-10 flex-1 rounded-xl border border-slate-300 bg-white text-sm font-semibold"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isPending || zReportTotal.trim().length === 0}
                  className="h-10 flex-1 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isPending ? "Oluşturuluyor..." : "Raporu Oluştur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
