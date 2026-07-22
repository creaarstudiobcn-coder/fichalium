import type { MetadataRoute } from "next";
import { MUNICIPIOS } from "@/lib/maresme";

const BASE = "https://www.fichalium.es";

// hreflang en sitemap: cada home apunta a sus dos variantes de idioma.
const HOME_ALTERNATES = { es: `${BASE}/`, ca: `${BASE}/ca` };

export default function sitemap(): MetadataRoute.Sitemap {
  const home: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/`,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: HOME_ALTERNATES },
    },
    {
      url: `${BASE}/ca`,
      changeFrequency: "monthly",
      priority: 0.9,
      alternates: { languages: HOME_ALTERNATES },
    },
  ];

  // Página hub de la comarca + una landing por municipio (SEO local).
  const hub: MetadataRoute.Sitemap = [
    {
      url: `${BASE}/control-horario`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Landings locales del Maresme (SEO): una por municipio.
  const municipios: MetadataRoute.Sitemap = MUNICIPIOS.map((m) => ({
    url: `${BASE}/control-horario/${m.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...home, ...hub, ...municipios];
}
