import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSwitcher } from "@/components/LangSwitcher";
import { HowItWorksArt } from "@/components/HowItWorksArt";
import { PaymentBadges } from "@/components/PaymentBadges";
import { getDictionary, type Lang } from "@/i18n";
import { TRAMOS } from "@/lib/billing/plans";

/**
 * Vista de la landing pública, parametrizada por idioma. Todo el texto sale del
 * diccionario (es/ca); el markup es único para no duplicar la home. No toca la
 * lógica de pago ni la de sesión (eso vive en las páginas que la montan).
 *
 * Los precios se derivan de `TRAMOS` (única fuente, compartida con Stripe): la
 * tabla de precios no repite importes, así no se desincroniza del cobro real.
 */
export function LandingView({
  lang,
  local,
}: {
  lang: Lang;
  /** Variante localizada por municipio (SEO): hero + sección propia. */
  local?: {
    nombre: string;
    intro: string;
    cuerpo: string;
    sectores: string[];
  };
}) {
  const dict = getDictionary(lang);

  // Etiqueta del rango de cada tramo, resuelta con el diccionario del idioma.
  const tramoRange = (upTo: number | null, prev: number, index: number) => {
    if (index === 0) return dict.pricing.employeesUpTo.replace("{n}", String(upTo));
    if (upTo === null) return dict.pricing.employeesFrom.replace("{n}", String(prev));
    return dict.pricing.employeesRange
      .replace("{from}", String(prev + 1))
      .replace("{to}", String(upTo));
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Banner de prueba gratuita (solo texto/diseño). */}
      <div className="bg-ficha text-navy">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-x-2.5 gap-y-0.5 px-6 py-2.5 text-center sm:flex-row">
          <span className="text-sm font-bold tracking-tight sm:text-[0.95rem]">
            {dict.banner.main}
          </span>
          <span aria-hidden className="hidden text-navy/40 sm:inline">
            ·
          </span>
          <span className="text-xs font-medium text-navy/70">
            {dict.banner.sub}
          </span>
        </div>
      </div>

      <header className="sticky top-0 z-10 border-b border-navy/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Brand size={30} textClassName="text-lg text-navy" href={null} />
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="#precios"
              className="hidden text-sm font-medium text-navy/70 transition hover:text-navy sm:inline"
            >
              {dict.pricing.pill}
            </Link>
            <LangSwitcher current={lang} />
            <Link
              href="/login"
              className="rounded-lg border border-navy/15 px-4 py-2 text-sm font-medium text-navy/80 transition hover:bg-navy/5"
            >
              {dict.header.login}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-6 py-20 text-center sm:py-28">
          <div className="space-y-4">
            <span className="inline-block rounded-full bg-pulse/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pulse">
              {local ? `Control horario · ${local.nombre}` : dict.hero.pill}
            </span>
            <h1 className="text-4xl text-navy sm:text-5xl">
              {local
                ? `Control horario para empresas en ${local.nombre}`
                : dict.hero.title}
            </h1>
            <p className="text-lg text-navy/70">
              {local ? local.intro : dict.hero.subtitle}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="rounded-lg bg-ficha px-6 py-3 font-semibold text-navy transition hover:bg-ficha/90"
            >
              {dict.hero.ctaPrimary}
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-navy/15 px-6 py-3 font-medium text-navy transition hover:bg-navy/5"
            >
              {dict.hero.ctaSecondary}
            </Link>
          </div>

          {/* Features: destacan el fichaje con geolocalización opcional. */}
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-navy/70">
            {dict.hero.features.map((f) => (
              <li key={f} className="flex items-center gap-1.5">
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                  className="h-4 w-4 text-pulse"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z"
                    clipRule="evenodd"
                  />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* Sección local propia (contenido único por municipio, SEO). */}
        {local && (
          <section className="border-t border-navy/10 bg-white">
            <div className="mx-auto max-w-3xl px-6 py-16">
              <h2 className="text-2xl text-navy sm:text-3xl">
                El control horario en {local.nombre}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-navy/70">
                {local.cuerpo}
              </p>
              <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-pulse">
                Sectores donde más se usa en {local.nombre}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {local.sectores.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-navy/10 bg-offwhite px-3 py-1 text-sm text-navy/75"
                  >
                    {s}
                  </li>
                ))}
              </ul>
              <p className="mt-8 text-base leading-relaxed text-navy/70">
                Desde 2019, toda empresa está obligada a llevar un registro
                diario de la jornada de su plantilla y conservarlo cuatro años.
                Fichalium te lo pone fácil en {local.nombre}: cada persona ficha
                su entrada y salida desde su cuenta, tú lo ves en tiempo real y
                puedes activar la geolocalización opcional del fichaje. Si el
                empleado no da permiso de ubicación, ficha igualmente.
              </p>
            </div>
          </section>
        )}

        {/* Cómo funciona */}
        <section className="border-t border-navy/10 bg-white">
          <div className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-ficha/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-navy">
                {dict.how.pill}
              </span>
              <h2 className="mt-4 text-3xl text-navy sm:text-4xl">{dict.how.title}</h2>
              <p className="mt-3 text-lg text-navy/70">{dict.how.subtitle}</p>
            </div>

            <ol className="mt-14 grid gap-8 sm:grid-cols-3">
              {dict.how.steps.map((step, i) => (
                <li
                  key={i}
                  className="flex flex-col rounded-2xl border border-navy/10 bg-offwhite p-5"
                >
                  <div className="rounded-xl bg-white p-4">
                    <HowItWorksArt step={(i + 1) as 1 | 2 | 3} />
                  </div>
                  <div className="mt-5 flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <h3 className="text-lg font-semibold text-navy">{step.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-navy/70">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="border-t border-navy/10 scroll-mt-20">
          <div className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-block rounded-full bg-pulse/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pulse">
                {dict.pricing.pill}
              </span>
              <h2 className="mt-4 text-3xl text-navy sm:text-4xl">{dict.pricing.title}</h2>
              <p className="mt-3 text-lg text-navy/70">{dict.pricing.subtitle}</p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {TRAMOS.map((tramo, i) => {
                const prev = i === 0 ? 0 : (TRAMOS[i - 1].upTo ?? 0);
                const popular = i === 1; // el tramo intermedio, el más elegido
                return (
                  <div
                    key={i}
                    className={`relative flex flex-col rounded-2xl border p-6 ${
                      popular
                        ? "border-ficha bg-navy text-white shadow-xl"
                        : "border-navy/10 bg-white"
                    }`}
                  >
                    {popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-ficha px-3 py-1 text-xs font-bold text-navy">
                        {dict.pricing.popular}
                      </span>
                    )}
                    <p
                      className={`text-sm font-medium ${popular ? "text-white/70" : "text-navy/60"}`}
                    >
                      {tramoRange(tramo.upTo, prev, i)}
                    </p>
                    <p className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold tracking-tight">{tramo.eur}€</span>
                      <span className={popular ? "text-white/60" : "text-navy/50"}>
                        {dict.pricing.perMonth}
                      </span>
                    </p>
                    <Link
                      href="/register"
                      className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition ${
                        popular
                          ? "bg-ficha text-navy hover:bg-ficha/90"
                          : "bg-navy/5 text-navy hover:bg-navy/10"
                      }`}
                    >
                      {dict.pricing.cta}
                    </Link>
                  </div>
                );
              })}
            </div>

            <p className="mt-8 text-center text-sm text-navy/60">{dict.pricing.trialNote}</p>

            <PaymentBadges
              title={dict.pricing.paymentsTitle}
              secure={dict.pricing.paymentsSecure}
            />
          </div>
        </section>
      </main>

      <SiteFooter dict={dict.footer} />
    </div>
  );
}
