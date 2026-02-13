"use client";

import { useActionState } from "react";

import { loginAction } from "@/app/actions/auth";

export function LoginForm() {
  const [state, action, isPending] = useActionState(loginAction, { error: null });

  return (
    <form action={action} className="panel mx-auto flex w-full max-w-md flex-col gap-5 p-8">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Elloi Kafe</p>
        <h1 className="mt-1 text-3xl font-semibold">Kasaya Giriş</h1>
        <p className="muted mt-2 text-sm">Kullanıcı adı ve PIN/şifre ile devam edin.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Kullanıcı Adı</span>
        <input
          type="text"
          name="username"
          autoComplete="username"
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none transition focus:border-slate-500"
          placeholder="ornek.kasiyer"
          required
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">PIN / Şifre</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          className="h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none transition focus:border-slate-500"
          placeholder="••••"
          required
        />
      </label>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="h-11 rounded-xl bg-[var(--primary)] text-sm font-semibold text-white transition hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>
    </form>
  );
}
