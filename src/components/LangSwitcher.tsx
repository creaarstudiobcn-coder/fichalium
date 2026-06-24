import Link from "next/link";
import { LOCALES, HOME_PATH, type Lang } from "@/i18n";

const SHORT: Record<Lang, string> = { es: "ES", ca: "CA" };

/**
 * Selector de idioma ES | CA. Server component: solo enlaza a la home del
 * otro idioma; el idioma actual se muestra resaltado y sin enlace.
 */
export function LangSwitcher({ current }: { current: Lang }) {
  return (
    <div
      className="flex items-center gap-1.5 text-xs font-semibold"
      aria-label="Idioma / Idioma"
    >
      {LOCALES.map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">
          {i > 0 && (
            <span aria-hidden className="text-navy/25">
              /
            </span>
          )}
          {l === current ? (
            <span className="text-navy" aria-current="true">
              {SHORT[l]}
            </span>
          ) : (
            <Link
              href={HOME_PATH[l]}
              hrefLang={l}
              className="text-navy/50 transition hover:text-pulse"
            >
              {SHORT[l]}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
