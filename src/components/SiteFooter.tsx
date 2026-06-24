import Link from "next/link";
import { Brand } from "@/components/Brand";

const LEGAL_LINKS = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terminos", label: "Términos" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-navy/10 bg-white">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Brand size={24} textClassName="text-base text-navy" />
          <p className="text-navy/50">
            © {new Date().getFullYear()} Dependalium Global Services S.L.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {LEGAL_LINKS.map((l) => (
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
