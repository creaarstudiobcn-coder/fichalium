import type { MetadataRoute } from "next";

// La app de Android (Trusted Web Activity) abre la web con este manifiesto.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fichalium · Control horario",
    short_name: "Fichalium",
    description: "Ficha la entrada y la salida y consulta tu registro de jornada.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es",
    background_color: "#0F1339",
    theme_color: "#0F1339",
    icons: [
      { src: "/app/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/app/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/app/icono-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/app/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
