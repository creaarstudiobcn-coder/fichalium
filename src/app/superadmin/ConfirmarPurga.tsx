"use client";

import { useActionState, useState } from "react";
import { purgeAction, type SaState } from "./actions";

/**
 * Purga irreversible con doble confirmación: el botón solo se habilita cuando se
 * escribe EXACTAMENTE el nombre de la empresa (y el servidor lo revalida).
 */
export function ConfirmarPurga({
  companyId,
  name,
}: {
  companyId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [state, formAction, pending] = useActionState<SaState, FormData>(
    purgeAction,
    {},
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
      >
        Purgar (RGPD)
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="companyId" value={companyId} />
      <p className="text-xs text-red-700">
        Borrado IRREVERSIBLE. Escribe <strong>{name}</strong> para confirmar:
      </p>
      <div className="flex items-center gap-2">
        <input
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-48 rounded-lg border border-slate-300 px-2 py-1 text-xs"
          placeholder={name}
        />
        <button
          type="submit"
          disabled={pending || confirm.trim() !== name}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Purgando…" : "Borrar todo"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm("");
          }}
          className="text-xs text-slate-500 underline"
        >
          Cancelar
        </button>
      </div>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </form>
  );
}
