import es from "./es.json";
import ca from "./ca.json";

/** Idiomas soportados en la parte pública (landing). */
export const LOCALES = ["es", "ca"] as const;
export type Lang = (typeof LOCALES)[number];
export const DEFAULT_LANG: Lang = "es";

/** Forma del diccionario (valores siempre string para que ambos JSON encajen). */
export interface Dictionary {
  meta: { title: string; description: string };
  banner: { main: string; sub: string };
  header: { login: string };
  hero: {
    pill: string;
    title: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  footer: {
    copyright: string;
    links: { legal: string; privacy: string; cookies: string; terms: string };
  };
  langSwitcher: { label: string; es: string; ca: string };
}

const DICTS: Record<Lang, Dictionary> = { es, ca };

export function getDictionary(lang: Lang): Dictionary {
  return DICTS[lang] ?? DICTS[DEFAULT_LANG];
}

/** Ruta de la home en cada idioma (para el selector y los hreflang). */
export const HOME_PATH: Record<Lang, string> = { es: "/", ca: "/ca" };
