"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Clave de persistencia en localStorage. "accepted" | "rejected".
const STORAGE_KEY = "cookie-consent";

export function CookieBanner() {
  // Empieza oculto: en SSR no se pinta nada (evita parpadeo / mismatch de
  // hidratación). En cliente decidimos según la elección guardada.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const choice = localStorage.getItem(STORAGE_KEY);
      if (choice !== "accepted" && choice !== "rejected") setVisible(true);
    } catch {
      // Si localStorage no está disponible, mostramos igualmente el aviso.
      setVisible(true);
    }
  }, []);

  function choose(value: "accepted" | "rejected") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Sin almacenamiento no podemos recordar la elección; al menos lo cerramos.
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-navy/70">
          Usamos cookies para que la app funcione y para mejorar tu experiencia.
          Consulta nuestra{" "}
          <Link href="/cookies" className="font-medium text-pulse hover:underline">
            política de cookies
          </Link>{" "}
          y la{" "}
          <Link
            href="/privacidad"
            className="font-medium text-pulse hover:underline"
          >
            política de privacidad
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("rejected")}
            className="rounded-lg border border-navy/15 px-4 py-2 text-sm font-medium text-navy/80 transition hover:bg-navy/5"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="rounded-lg bg-ficha px-4 py-2 text-sm font-semibold text-navy transition hover:bg-ficha/90"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
