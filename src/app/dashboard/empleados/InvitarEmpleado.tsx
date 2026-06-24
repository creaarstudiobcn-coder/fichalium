"use client";

import { useActionState, useState } from "react";
import { createInvitationAction, type InviteState } from "./actions";
import type { AccountStatus } from "@/lib/employees";

export function InvitarEmpleado({
  employeeId,
  accountStatus,
}: {
  employeeId: string;
  accountStatus: AccountStatus;
}) {
  const [state, action, pending] = useActionState<InviteState, FormData>(
    createInvitationAction,
    {},
  );
  const [copied, setCopied] = useState(false);

  if (accountStatus === "active") {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Con cuenta
      </span>
    );
  }

  async function copy() {
    if (!state.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Si falla el portapapeles, el enlace queda visible para copiar a mano.
    }
  }

  // Ya hay enlace generado: lo mostramos para copiar.
  if (state.inviteUrl) {
    return (
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={state.inviteUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="w-56 rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600"
        />
        <button
          type="button"
          onClick={copy}
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    );
  }

  const label = accountStatus === "invited" ? "Reinvitar" : "Invitar";

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input type="hidden" name="employeeId" value={employeeId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
        >
          {pending ? "Generando…" : label}
        </button>
      </form>
      {accountStatus === "invited" && !state.error && (
        <span className="text-xs text-amber-600">Invitación pendiente</span>
      )}
      {state.error && (
        <span className="text-xs text-red-600">{state.error}</span>
      )}
    </div>
  );
}
