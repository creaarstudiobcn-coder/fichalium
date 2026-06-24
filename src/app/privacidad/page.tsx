import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { renderMarkdown } from "@/lib/markdown";
import { loadLegal } from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Política de privacidad · Fichalium",
  description:
    "Cómo Dependalium Global Services S.L. trata los datos personales en Fichalium.",
};

export default function PrivacidadPage() {
  return <LegalShell>{renderMarkdown(loadLegal("privacidad"))}</LegalShell>;
}
