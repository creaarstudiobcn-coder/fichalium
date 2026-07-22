"use client";

import { useActionState } from "react";
import Link from "next/link";
import { resetAction, type ResetState } from "./actions";

export function NuevaPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(
    resetAction,
    {},
  );

  if (state.ok) {
    return (
      <div className="mt-6 space-y-4">
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Tu contraseña se ha actualizado. Ya puedes iniciar sesión con la nueva.
        </p>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-ficha px-4 py-2.5 text-center font-semibold text-navy transition hover:bg-ficha/90"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy/80">
          Nueva contraseña
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-navy/15 px-3 py-2 text-navy outline-none focus:border-pulse focus:ring-1 focus:ring-pulse"
        />
        <span className="mt-1 block text-xs text-navy/50">
          Mínimo 8 caracteres.
        </span>
      </label>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-ficha px-4 py-2.5 font-semibold text-navy transition hover:bg-ficha/90 disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar contraseña"}
      </button>
    </form>
  );
}
