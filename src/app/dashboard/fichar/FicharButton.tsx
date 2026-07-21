"use client";

import { useActionState, useState } from "react";
import { clockAction, type ClockState } from "./actions";

/**
 * Pide la ubicación UNA vez (one-shot). La promesa SIEMPRE resuelve: si el
 * usuario deniega el permiso, no hay GPS o tarda demasiado, devuelve null y se
 * ficha igual sin ubicación. Nunca lanza ni bloquea el fichaje.
 */
function getGeolocation(): Promise<{
  lat: number;
  lng: number;
  accuracy: number;
} | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      () => resolve(null), // permiso denegado / error / timeout → sin ubicación
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

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
  // Fase de geolocalización previa al envío (no la cubre `pending`).
  const [locating, setLocating] = useState(false);

  const isEntrada = nextType === "CLOCK_IN";
  const label = isEntrada ? "Fichar ENTRADA" : "Fichar SALIDA";
  const busy = pending || locating;

  async function onClick() {
    setLocating(true);
    const geo = await getGeolocation(); // null si se deniega → se ficha igual
    setLocating(false);

    const fd = new FormData();
    fd.set("employeeId", employeeId);
    fd.set("type", nextType);
    if (geo) {
      fd.set("lat", String(geo.lat));
      fd.set("lng", String(geo.lng));
      fd.set("accuracy", String(geo.accuracy));
    }
    action(fd);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={
          "rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60 " +
          (isEntrada
            ? "bg-ficha text-navy hover:bg-ficha/90"
            : "bg-amber-500 text-white hover:bg-amber-600")
        }
      >
        {locating
          ? "Ubicando…"
          : pending
            ? "Registrando…"
            : label}
      </button>
      {state.error && <span className="text-xs text-red-600">{state.error}</span>}
    </div>
  );
}
