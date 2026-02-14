"use client";

import { useActionState } from "react";
import { deleteUserAction } from "@/app/actions/admin";

type Props = {
    userId: string;
};

export function DeleteUserButton({ userId }: Props) {
    const [state, formAction, isPending] = useActionState(deleteUserAction, {
        error: null,
        success: null,
    });

    return (
        <div>
            <form action={formAction}>
                <input type="hidden" name="userId" value={userId} />
                <button
                    type="submit"
                    disabled={isPending}
                    className="h-9 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-semibold text-red-700 disabled:opacity-50"
                >
                    {isPending ? "…" : "Sil"}
                </button>
            </form>
            {state.error && (
                <p className="mt-1 max-w-[200px] text-xs text-amber-600">{state.error}</p>
            )}
            {state.success && (
                <p className="mt-1 text-xs text-emerald-600">{state.success}</p>
            )}
        </div>
    );
}
