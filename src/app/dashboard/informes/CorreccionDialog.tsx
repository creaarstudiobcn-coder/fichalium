"use client";

import { useEffect, useState } from "react";
import { useActionState } from "react";
import { correccionAction, type CorreccionState } from "./actions";

type Empleado = { id: string; name: string };

type Props =
  | {
      mode: "manual";
      empleados: Empleado[];
    }
  | {
      mode: "correct";
      employeeId: string;
      employeeName: string;
      defaultType: "CLOCK_IN" | "CLOCK_OUT";
      defaultLocal: string;
      correctsId: string;
    };

/** Valor "YYYY-MM-DDTHH:mm" de la hora local actual (para prellenar el manual). */
function ahoraLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

export function CorreccionDialog(props: Props) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CorreccionState, FormData>(
    correccionAction,
    {},
  );

  // Al guardar bien, cerramos el diálogo (los datos ya se revalidaron en el server).
  useEffect(() => {
    if (state.ok) {
      const t = setTimeout(() => setOpen(false), 700);
      return () => clearTimeout(t);
    }
  }, [state.ok]);

  const isCorrect = props.mode === "correct";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          isCorrect
            ? "rounded-md px-2 py-1 text-xs font-medium text-pulse hover:underline"
            : "rounded-lg border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/80 transition hover:bg-navy/5"
        }
      >
        {isCorrect ? "Corregir" : "Añadir fichaje"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-navy">
              {isCorrect ? "Corregir fichaje" : "Añadir fichaje manual"}
            </h2>
            <p className="mt-1 text-sm text-navy/60">
              {isCorrect
                ? "Se crea un nuevo registro que sustituye al original. El fichaje original se conserva (el registro es inalterable)."
                : "Para registrar un fichaje olvidado (p. ej. una salida). Indica siempre el motivo."}
            </p>

            {state.ok ? (
              <p className="mt-5 rounded-md bg-green-50 px-3 py-3 text-sm text-green-700">
                Corrección registrada.
              </p>
            ) : (
              <form action={action} className="mt-5 space-y-4">
                {isCorrect ? (
                  <>
                    <input type="hidden" name="correctsId" value={props.correctsId} />
                    <input type="hidden" name="employeeId" value={props.employeeId} />
                    <div className="text-sm text-navy/70">
                      Empleado:{" "}
                      <span className="font-medium text-navy">
                        {props.employeeName}
                      </span>
                    </div>
                  </>
                ) : (
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-navy/80">
                      Empleado
                    </span>
                    <select
                      name="employeeId"
                      required
                      defaultValue=""
                      className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm text-navy"
                    >
                      <option value="" disabled>
                        Selecciona…
                      </option>
                      {props.empleados.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-navy/80">
                    Tipo
                  </span>
                  <select
                    name="type"
                    required
                    defaultValue={isCorrect ? props.defaultType : "CLOCK_OUT"}
                    className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm text-navy"
                  >
                    <option value="CLOCK_IN">Entrada</option>
                    <option value="CLOCK_OUT">Salida</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-navy/80">
                    Fecha y hora (España)
                  </span>
                  <input
                    type="datetime-local"
                    name="timestampLocal"
                    required
                    defaultValue={isCorrect ? props.defaultLocal : ahoraLocal()}
                    className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm text-navy"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-navy/80">
                    Motivo
                  </span>
                  <input
                    name="reason"
                    required
                    minLength={3}
                    maxLength={200}
                    placeholder="p. ej. Olvidó fichar la salida"
                    className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm text-navy"
                  />
                </label>

                {state.error && (
                  <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                    {state.error}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-navy/60 hover:bg-navy/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-lg bg-ficha px-4 py-2 text-sm font-semibold text-navy transition hover:bg-ficha/90 disabled:opacity-60"
                  >
                    {pending ? "Guardando…" : "Guardar"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
