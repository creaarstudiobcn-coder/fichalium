import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Brand } from "@/components/Brand";
import { IntroSplash } from "@/components/IntroSplash";
import { SiteFooter } from "@/components/SiteFooter";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      {/* Intro animada en la primera visita (skippable, se recuerda). */}
      <IntroSplash enterHref="/login" />

      <div className="flex min-h-screen flex-col">
        {/* Banner de prueba gratuita (solo texto/diseño; no toca la lógica de pago). */}
        <div className="bg-ficha text-navy">
          <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-x-2.5 gap-y-0.5 px-6 py-2.5 text-center sm:flex-row">
            <span className="text-sm font-bold tracking-tight sm:text-[0.95rem]">
              14 días de prueba gratis
            </span>
            <span aria-hidden className="hidden text-navy/40 sm:inline">·</span>
            <span className="text-xs font-medium text-navy/70">
              Sin compromiso. Cancela cuando quieras.
            </span>
          </div>
        </div>

        <header className="border-b border-navy/10 bg-white">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <Brand size={30} textClassName="text-lg text-navy" href={null} />
            <Link
              href="/login"
              className="rounded-lg border border-navy/15 px-4 py-2 text-sm font-medium text-navy/80 transition hover:bg-navy/5"
            >
              Iniciar sesión
            </Link>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
          <div className="space-y-4">
            <span className="inline-block rounded-full bg-pulse/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pulse">
              Control horario
            </span>
            <h1 className="text-4xl text-navy sm:text-5xl">
              Fichaje sencillo y conforme a la ley
            </h1>
            <p className="text-lg text-navy/70">
              Fichalium registra la jornada de tu empresa con cada cliente y sus
              datos aislados. Sin biometría, sin complicaciones.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-ficha px-6 py-3 font-semibold text-navy transition hover:bg-ficha/90"
            >
              Crear cuenta de empresa
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-navy/15 px-6 py-3 font-medium text-navy transition hover:bg-navy/5"
            >
              Iniciar sesión
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
