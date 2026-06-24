import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";
import { renderMarkdown } from "@/lib/markdown";
import { loadLegal } from "@/lib/legal";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Aviso legal · Fichalium",
  description: "Aviso legal de Fichalium (Dependalium Global Services S.L.).",
};

export default function AvisoLegalPage() {
  return <LegalShell>{renderMarkdown(loadLegal("aviso-legal"))}</LegalShell>;
}
