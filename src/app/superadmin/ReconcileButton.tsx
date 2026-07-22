"use client";

import { useActionState } from "react";
import { reconcileAction, type ReconcileState } from "./actions";

export function ReconcileButton() {
  const [state, action, pending] = useActionState<ReconcileState, FormData>(
    reconcileAction,
    {},
  );

  return (
    <div className="flex flex-col items-start gap-1">
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-950 disabled:opacity-60"
        >
          {pending ? "Reconciliando…" : "Reconciliar ahora con Stripe"}
        </button>
      </form>
      {state.message && (
        <span className="text-xs font-medium text-amber-900">
          {state.message}
        </span>
      )}
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </div>
  );
}
