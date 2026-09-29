import { renderOgImage } from "@/lib/og-image";
import { getDictionary } from "@/i18n";

const { hero } = getDictionary("ca");

export const alt = `Fichalium · ${hero.title}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imatge Open Graph de la portada catalana: mateix disseny, titular en català. */
export default async function OpengraphImageCa() {
  return renderOgImage({ pill: hero.pill, title: hero.title, features: hero.features, featureSize: 24 });
}
