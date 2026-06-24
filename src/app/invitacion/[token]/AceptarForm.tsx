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
          className="block w-full rounded-lg bg-slate-900 px-4 py-2.5 text-center font-medium text-white transition hover:bg-slate-700"
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
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Empleado
        </span>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-900">
          {employeeName} · {email}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">
          Crea tu contraseña
        </span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
        />
        <span className="mt-1 block text-xs text-slate-400">
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
        className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Creando cuenta…" : "Crear cuenta"}
      </button>
    </form>
  );
}
