import Link from "next/link";
import type { ReactNode } from "react";
import { Brand } from "@/components/Brand";
import { SiteFooter } from "@/components/SiteFooter";

/** Marco común de las páginas legales: cabecera con marca, contenido y footer. */
export function LegalShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-offwhite">
      <header className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Brand size={30} textClassName="text-lg text-navy" />
          <Link
            href="/login"
            className="rounded-lg bg-ficha px-4 py-2 text-sm font-semibold text-navy transition hover:bg-ficha/90"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <article className="text-sm">{children}</article>
        <div className="mt-12">
          <Link href="/" className="text-sm font-medium text-pulse hover:underline">
            ← Volver al inicio
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
