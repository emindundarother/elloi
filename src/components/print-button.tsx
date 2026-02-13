"use client";

export function PrintButton({ label = "Yazdır" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold"
    >
      {label}
    </button>
  );
}
