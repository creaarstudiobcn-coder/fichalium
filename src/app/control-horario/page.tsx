import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";
import { MUNICIPIOS } from "@/lib/maresme";

export const metadata: Metadata = {
  title: "Control horario para empresas del Maresme | Fichalium",
  description:
    "Software de fichaje y registro de jornada para empresas del Maresme. Elige tu municipio: Mataró, Premià de Mar, El Masnou, Vilassar, Arenys, Calella y toda la comarca.",
  alternates: { canonical: "/control-horario" },
};

export default function ControlHorarioIndex() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand size={30} textClassName="text-lg text-navy" />
          <Link
            href="/register"
            className="rounded-lg bg-ficha px-4 py-2 text-sm font-semibold text-navy transition hover:bg-ficha/90"
          >
            Prueba gratis
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <p className="text-xs font-semibold uppercase tracking-wide text-pulse">
          El Maresme
        </p>
        <h1 className="mt-3 text-3xl text-navy sm:text-4xl">
          Control horario para empresas del Maresme
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-navy/70">
          Fichalium ayuda a comercios, despachos, hostelería e industria de toda
          la comarca a cumplir el registro de jornada obligatorio, sin papeleo y
          con informes listos para la Inspección de Trabajo. Elige tu municipio:
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
          {MUNICIPIOS.map((m) => (
            <li key={m.slug}>
              <Link
                href={`/control-horario/${m.slug}`}
                className="text-navy/80 transition hover:text-pulse hover:underline"
              >
                Control horario en {m.nombre}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <Link
            href="/register"
            className="rounded-lg bg-ficha px-6 py-3 font-semibold text-navy transition hover:bg-ficha/90"
          >
            Empezar la prueba gratis
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
