import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { IntroSplash } from "@/components/IntroSplash";
import { LandingView } from "@/components/LandingView";
import { getDictionary } from "@/i18n";
import { esAppMovil } from "@/lib/app-movil";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary("es");
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: "/",
      languages: { es: "/", ca: "/ca", "x-default": "/" },
    },
    openGraph: { locale: "es_ES", alternateLocale: ["ca_ES"] },
  };
}

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  // En la app no se enseña la portada (tiene precios y botones de contratar).
  if (await esAppMovil()) redirect("/login");

  return (
    <>
      {/* Intro animada en la primera visita (skippable, se recuerda). */}
      <IntroSplash enterHref="/login" />
      <LandingView lang="es" />
    </>
  );
}
