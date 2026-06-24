import Link from "next/link";
import { Brand } from "@/components/Brand";
import esDict from "@/i18n/es.json";
import type { Dictionary } from "@/i18n";

type FooterDict = Dictionary["footer"];

// Las rutas legales son únicas (ES) en Fase 1; solo cambian las etiquetas.
const LEGAL_HREFS = {
  legal: "/aviso-legal",
  privacy: "/privacidad",
  cookies: "/cookies",
  terms: "/terminos",
} as const;

/**
 * Footer del sitio. `dict` es opcional y por defecto usa el español, de modo que
 * las páginas que lo montan sin props (p. ej. las legales) siguen funcionando.
 */
export function SiteFooter({ dict = esDict.footer }: { dict?: FooterDict }) {
  const links = [
    { href: LEGAL_HREFS.legal, label: dict.links.legal },
    { href: LEGAL_HREFS.privacy, label: dict.links.privacy },
    { href: LEGAL_HREFS.cookies, label: dict.links.cookies },
    { href: LEGAL_HREFS.terms, label: dict.links.terms },
  ];

  return (
    <footer className="border-t border-navy/10 bg-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Brand size={24} textClassName="text-base text-navy" />
          <p className="text-navy/50">
            {dict.copyright.replace("{year}", String(new Date().getFullYear()))}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-navy/70 transition hover:text-pulse"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
