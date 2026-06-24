"use client";

import { useActionState } from "react";
import Link from "next/link";
import { acceptAction, type AcceptState } from "./actions";

export function AceptarForm({
  token,
  employeeName,
  email,
}: {
  token: string;
  employeeName: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(
    acceptAction,
    {},
  );

  if (state.ok) {
    return (
      <div className="space-y-4">
        <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          ¡Cuenta creada! Ya puedes iniciar sesión y fichar.
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

      <div>
        <span className="mb-1 block text-sm font-medium text-navy/80">
          Empleado
        </span>
        <p className="rounded-lg bg-offwhite px-3 py-2 text-sm text-navy">
          {employeeName} · {email}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-navy/80">
          Crea tu contraseña
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
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
