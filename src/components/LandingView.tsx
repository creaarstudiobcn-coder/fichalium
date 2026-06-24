import Link from "next/link";
import { Brand } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";
import { LangSwitcher } from "@/components/LangSwitcher";
import { getDictionary, type Lang } from "@/i18n";

/**
 * Vista de la landing pública, parametrizada por idioma. Todo el texto sale del
 * diccionario (es/ca); el markup es único para no duplicar la home. No toca la
 * lógica de pago ni la de sesión (eso vive en las páginas que la montan).
 */
export function LandingView({ lang }: { lang: Lang }) {
  const dict = getDictionary(lang);

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

      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Brand size={30} textClassName="text-lg text-navy" href={null} />
          <div className="flex items-center gap-4">
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

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
        <div className="space-y-4">
          <span className="inline-block rounded-full bg-pulse/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pulse">
            {dict.hero.pill}
          </span>
          <h1 className="text-4xl text-navy sm:text-5xl">{dict.hero.title}</h1>
          <p className="text-lg text-navy/70">{dict.hero.subtitle}</p>
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
      </main>

      <SiteFooter dict={dict.footer} />
    </div>
  );
}
