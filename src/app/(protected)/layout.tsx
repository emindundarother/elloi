import Link from "next/link";

import { logoutAction } from "@/app/actions/auth";
import { requireSession } from "@/lib/auth";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await requireSession();

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 sm:py-5">
      <header className="panel no-print mb-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{APP_NAME}</p>
          <p className="text-sm font-medium text-slate-700">
            {session.username} • {ROLE_LABELS[session.role]}
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-2">
          <Link href="/" className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
            </svg>
            Ana Sayfa
          </Link>
          <Link href="/reports/day" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">
            Özet
          </Link>
          {session.role === "ADMIN" ? (
            <>
              <Link href="/admin/products" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">
                Ürünler
              </Link>
              <Link href="/admin/reports" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">
                Admin Rapor
              </Link>
              <Link href="/admin/users" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium">
                Kullanıcılar
              </Link>
            </>
          ) : null}
          <form action={logoutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v9" />
                <path d="M6.2 5.6a9 9 0 1 0 11.6 0" />
              </svg>
              Çıkış
            </button>
          </form>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl">{children}</main>
    </div>
  );
}
