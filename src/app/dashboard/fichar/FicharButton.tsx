"use client";

import { useActionState } from "react";
import { clockAction, type ClockState } from "./actions";

export function FicharButton({
  employeeId,
  nextType,
}: {
  employeeId: string;
  nextType: "CLOCK_IN" | "CLOCK_OUT";
}) {
  const [state, action, pending] = useActionState<ClockState, FormData>(
    clockAction,
    {},
  );

  const isEntrada = nextType === "CLOCK_IN";
  const label = isEntrada ? "Fichar ENTRADA" : "Fichar SALIDA";

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="employeeId" value={employeeId} />
        <input type="hidden" name="type" value={nextType} />
        <button
          type="submit"
          disabled={pending}
          className={
            "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 " +
            (isEntrada
              ? "bg-ficha text-navy hover:bg-ficha/90"
              : "bg-amber-500 text-white hover:bg-amber-600")
          }
        >
          {pending ? "Registrando…" : label}
        </button>
      </form>
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </div>
  );
}
