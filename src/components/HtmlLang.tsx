"use client";

import { useEffect } from "react";

/**
 * Ajusta `document.documentElement.lang` en cliente para rutas cuyo idioma
 * difiere del `<html lang="es">` del layout raíz (p. ej. /ca). El SEO de idioma
 * se cubre con los `hreflang`/canonical de `generateMetadata`; esto corrige el
 * atributo para lectores de pantalla y el idioma efectivo en el navegador.
 */
export function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    const prev = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = prev;
    };
  }, [lang]);

  return null;
}
