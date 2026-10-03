"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GA_ID, esRutaPrivada } from "@/lib/ga";

/**
 * Estadísticas con consentimiento y el aviso que lo pide.
 *
 * Reglas (guía de cookies de la AEPD):
 *  1. Nada de Google existe en la página hasta que se pulsa «Aceptar»: ni el
 *     script ni `window.gtag`. No vale cargarlo «desactivado».
 *  2. Aceptar y rechazar cuestan lo mismo: dos botones iguales.
 *  3. Sin aspa: cerrar o seguir navegando no es consentir.
 *  4. Retirar el consentimiento es un botón (`BotonPreferencias`, en el pie), y
 *     al retirarlo se borran las cookies de Google y se recarga.
 *
 * Solo en la parte pública: en el panel, el fichaje y el acceso no se pregunta
 * ni se mide (si gtag ya estaba cargado, se apaga con `ga-disable-<ID>`).
 * Sin GA_ID no hay nada que consentir y el aviso no aparece.
 */

const GA = GA_ID;
const CLAVE = "fichalium-cookies";
const VERSION = 1;
const EVENTO_REABRIR = "fichalium:preferencias-cookies";

type Eleccion = "si" | "no" | null;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    [clave: `ga-disable-${string}`]: boolean | undefined;
  }
}

function leer(): Eleccion {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
    return d?.v === VERSION && (d.e === "si" || d.e === "no") ? d.e : null;
  } catch {
    return null; // almacenamiento bloqueado: «sin decidir», nunca un sí
  }
}

function guardar(e: "si" | "no") {
  try {
    localStorage.setItem(CLAVE, JSON.stringify({ v: VERSION, e, f: new Date().toISOString() }));
  } catch {}
}

function borrarCookiesDeGoogle() {
  const nombres = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((n) => n === "_ga" || n.startsWith("_ga_") || n === "_gid");
  const partes = location.hostname.split(".");
  for (const n of nombres) {
    for (const d of ["", location.hostname, `.${partes.slice(-2).join(".")}`]) {
      document.cookie = `${n}=; Max-Age=0; path=/${d ? `; domain=${d}` : ""}`;
    }
  }
}

function vista() {
  window.gtag?.("event", "page_view", { page_location: location.href, page_title: document.title });
}

/** Inyecta gtag. `arguments` y no un array: con array carga pero no mide. */
function cargarGoogle() {
  if (!GA || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  // eslint-disable-next-line prefer-rest-params
  window.gtag = function gtag() { window.dataLayer!.push(arguments); };
  window.gtag("js", new Date());
  // send_page_view false: las vistas se mandan a mano (solo en páginas públicas).
  window.gtag("config", GA, { anonymize_ip: true, send_page_view: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA}`;
  document.head.appendChild(s);
}

export function CookieBanner() {
  const ruta = usePathname();
  const privada = esRutaPrivada(ruta);
  const [eleccion, setEleccion] = useState<Eleccion | "sin-leer">("sin-leer");
  const ultimaVista = useRef<string | null>(null);

  useEffect(() => {
    if (!GA) return;
    const e = leer();
    setEleccion(e);
    if (e === "no") borrarCookiesDeGoogle(); // Google reescribe _ga_* al salir: se borra también al cargar
    const reabrir = () => setEleccion(null);
    const otraPestana = (ev: StorageEvent) => ev.key === CLAVE && setEleccion(leer());
    window.addEventListener(EVENTO_REABRIR, reabrir);
    window.addEventListener("storage", otraPestana);
    return () => {
      window.removeEventListener(EVENTO_REABRIR, reabrir);
      window.removeEventListener("storage", otraPestana);
    };
  }, []);

  // Carga y vista por página pública; en la zona privada, GA apagado.
  useEffect(() => {
    if (!GA || eleccion !== "si") return;
    window[`ga-disable-${GA}`] = privada;
    if (privada) return;
    cargarGoogle();
    if (ultimaVista.current !== ruta) {
      ultimaVista.current = ruta;
      vista();
    }
  }, [eleccion, ruta, privada]);

  if (!GA || privada || eleccion !== null) return null;

  const decidir = (valor: "si" | "no") => {
    const antes = leer();
    guardar(valor);
    if (antes === "si" && valor === "no") {
      borrarCookiesDeGoogle();
      location.reload();
      return;
    }
    setEleccion(valor);
  };

  return (
    <div
      role="dialog"
      aria-labelledby="cookies-titulo"
      aria-describedby="cookies-texto"
      className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-xl border border-navy/10 bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p id="cookies-texto" className="text-sm text-navy/70">
          <strong id="cookies-titulo" className="font-semibold text-navy">Cookies. </strong>
          Usamos Google Analytics para saber cuántas personas visitan la web y qué páginas leen. Solo se
          instala si lo aceptas. Más información en la{" "}
          <Link href="/cookies" className="font-medium text-pulse hover:underline">
            política de cookies
          </Link>
          .
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => decidir("no")}
            className="rounded-lg border border-navy/20 px-5 py-2 text-sm font-semibold text-navy transition hover:bg-navy/5"
          >
            Rechazar
          </button>
          <button
            type="button"
            onClick={() => decidir("si")}
            className="rounded-lg border border-navy/20 px-5 py-2 text-sm font-semibold text-navy transition hover:bg-navy/5"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

/** «Configurar cookies»: solo existe si hay algo que configurar. */
export function BotonPreferencias({ className = "" }: { className?: string }) {
  if (!GA) return null;
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(EVENTO_REABRIR))} className={className}>
      Configurar cookies
    </button>
  );
}
