import { renderOgImage } from "@/lib/og-image";

export const alt = "Fichalium · Fichaje sencillo y conforme a la ley";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Imagen Open Graph global (1200×630): logo y titular real de la portada. */
export default async function OpengraphImage() {
  return renderOgImage({
    pill: "Control horario",
    title: "Fichaje sencillo y conforme a la ley",
    features: ["Fichaje con geolocalización opcional", "Registro conforme a la ley", "Sin biometría"],
  });
}
