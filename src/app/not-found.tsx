import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";

/* 404 propia, con la misma cabecera y pie que las páginas públicas. */
export const metadata: Metadata = {
  title: "Página no encontrada · Fichalium",
  robots: { index: false, follow: true },
};

const secciones = [
  { href: "/#precios", texto: "Precios" },
  { href: "/control-horario", texto: "Control horario en el Maresme" },
  { href: "/register", texto: "Prueba gratis" },
  { href: "/login", texto: "Entrar en tu cuenta" },
];

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand size={30} textClassName="text-lg text-navy" />
          <Link
            href="/login"
            className="rounded-lg border border-navy/15 px-4 py-2 text-sm font-medium text-navy/80 transition hover:bg-navy/5"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <span className="inline-block rounded-full bg-pulse/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pulse">
          Error 404
        </span>
        <h1 className="mt-4 text-3xl text-navy sm:text-4xl">
          Esta página no existe
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-navy/70">
          La dirección no es correcta o la página ha cambiado de sitio. Tus
          fichajes siguen a salvo: entra en tu cuenta o vuelve al inicio.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-block rounded-lg bg-ficha px-6 py-3 font-semibold text-navy transition hover:bg-ficha/90"
          >
            Volver al inicio
          </Link>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-2">
          {secciones.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="block rounded-xl border border-navy/10 bg-white px-4 py-3 text-navy/80 transition hover:text-pulse"
              >
                {s.texto} →
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <SiteFooter />
    </div>
  );
}
