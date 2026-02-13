"use client";

import { useActionState } from "react";

import { createUserAction } from "@/app/actions/admin";

export function AdminUserCreateForm() {
  const [state, action, isPending] = useActionState(createUserAction, {
    error: null,
    success: null,
  });

  return (
    <form action={action} className="panel grid gap-3 p-4 sm:grid-cols-4 sm:items-end">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Kullanıcı Adı</span>
        <input
          name="username"
          required
          className="h-10 rounded-xl border border-slate-300 px-3 outline-none focus:border-slate-500"
          placeholder="ornek.kasiyer"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Rol</span>
        <select
          name="role"
          className="h-10 rounded-xl border border-slate-300 px-3 outline-none focus:border-slate-500"
          defaultValue="CASHIER"
        >
          <option value="CASHIER">Kasiyer</option>
          <option value="ADMIN">Admin</option>
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">PIN / Şifre</span>
        <input
          name="password"
          type="password"
          required
          minLength={4}
          className="h-10 rounded-xl border border-slate-300 px-3 outline-none focus:border-slate-500"
          placeholder="1234"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Ekleniyor..." : "Kullanıcı Ekle"}
      </button>

      {state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-4">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-4">
          {state.success}
        </p>
      ) : null}
    </form>
  );
}
