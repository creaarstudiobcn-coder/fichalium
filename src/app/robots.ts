import type { MetadataRoute } from "next";

const BASE = "https://www.fichalium.es";

/**
 * robots.txt (ruta de metadatos de Next). Deja rastrear el contenido público
 * (home es/ca, landings del Maresme, páginas legales) y bloquea lo privado o sin
 * valor de indexación: panel, superadmin, API y las URLs con token de un solo
 * uso (invitaciones y recuperación de contraseña). Referencia al sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/superadmin",
        "/api/",
        "/invitacion/",
        "/recuperar/",
      ],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
