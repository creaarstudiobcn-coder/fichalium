import type { MetadataRoute } from "next";

const BASE = "https://www.fichalium.es";

// hreflang en sitemap: cada home apunta a sus dos variantes de idioma.
const HOME_ALTERNATES = { es: `${BASE}/`, ca: `${BASE}/ca` };

export default function sitemap(): MetadataRoute.Sitemap {
  return [
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
}
