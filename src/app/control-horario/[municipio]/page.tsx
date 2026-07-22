import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingView } from "@/components/LandingView";
import { MUNICIPIOS } from "@/lib/maresme";

/** Genera las 30 landings del Maresme en build (SSG). */
export function generateStaticParams() {
  return MUNICIPIOS.map((m) => ({ municipio: m.slug }));
}

// Slug desconocido → 404 (no renderizamos páginas fuera de la lista).
export const dynamicParams = false;

function find(slug: string) {
  return MUNICIPIOS.find((m) => m.slug === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ municipio: string }>;
}): Promise<Metadata> {
  const { municipio } = await params;
  const m = find(municipio);
  if (!m) return {};

  const title = `Control horario para empresas en ${m.nombre} | Fichalium`;
  const description = `Software de fichaje y registro de jornada para empresas de ${m.nombre} (Maresme). Cumple la ley del control horario, con informes y prueba gratis. ${m.intro}`.slice(
    0,
    300,
  );
  const path = `/control-horario/${m.slug}`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      locale: "es_ES",
      type: "website",
    },
  };
}

export default async function MunicipioPage({
  params,
}: {
  params: Promise<{ municipio: string }>;
}) {
  const { municipio } = await params;
  const m = find(municipio);
  if (!m) notFound();

  return <LandingView lang="es" local={{ nombre: m.nombre, intro: m.intro }} />;
}
