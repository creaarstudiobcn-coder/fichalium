"use client";

import { useActionState, useEffect, useRef } from "react";
import { createEmployeeAction, type ActionState } from "./actions";

export function NuevoEmpleadoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    createEmployeeAction,
    {},
  );

  // Limpia el formulario tras un alta correcta.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={action}
      className="rounded-xl border border-navy/10 bg-white p-5"
    >
      <h2 className="text-sm font-semibold text-navy">Añadir empleado</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy/70">
            Nombre
          </span>
          <input
            name="name"
            required
            className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm outline-none focus:border-pulse"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-navy/70">
            Email
          </span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm outline-none focus:border-pulse"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-[38px] rounded-lg bg-ficha px-4 text-sm font-semibold text-navy transition hover:bg-ficha/90 disabled:opacity-60"
        >
          {pending ? "Añadiendo…" : "Añadir"}
        </button>
      </div>

      {state.error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
          Empleado añadido.
        </p>
      )}
    </form>
  );
}
