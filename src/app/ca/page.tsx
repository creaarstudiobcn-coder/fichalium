import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { HtmlLang } from "@/components/HtmlLang";
import { LandingView } from "@/components/LandingView";
import { getDictionary } from "@/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary("ca");
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    alternates: {
      canonical: "/ca",
      languages: { es: "/", ca: "/ca", "x-default": "/" },
    },
    openGraph: { locale: "ca_ES", alternateLocale: ["es_ES"] },
  };
}

export default async function HomePageCa() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <>
      <HtmlLang lang="ca" />
      <LandingView lang="ca" />
    </>
  );
}
