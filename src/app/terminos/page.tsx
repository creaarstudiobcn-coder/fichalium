import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { renderMarkdown } from "@/lib/markdown";
import { loadLegal } from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Términos y condiciones · Fichalium",
  description: "Términos y condiciones del servicio Fichalium.",
};

export default function TerminosPage() {
  return <LegalShell>{renderMarkdown(loadLegal("terminos"))}</LegalShell>;
}
