import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { renderMarkdown } from "@/lib/markdown";
import { loadLegal } from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Borrar tu cuenta · Fichalium",
  description:
    "Cómo pedir que se borre una cuenta de Fichalium y qué datos se borran.",
  alternates: { canonical: "/borrar-cuenta" },
};

export default function BorrarCuentaPage() {
  return <LegalShell>{renderMarkdown(loadLegal("borrar-cuenta"))}</LegalShell>;
}
