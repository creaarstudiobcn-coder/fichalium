import { readFileSync } from "node:fs";
import { join } from "node:path";
import { GA_ID } from "@/lib/ga";

/**
 * Lee un documento legal en Markdown desde src/content/legal. Las páginas que
 * lo usan son estáticas (force-static), así que la lectura ocurre en build.
 *
 * Los bloques <!--si-analitica-->…<!--/si-analitica--> solo salen si hay
 * Google Analytics configurado (GA_ID), y <!--no-analitica-->…<!--/no-analitica-->
 * solo si no lo hay: lo que la política dice va atado a lo que la web hace.
 */
export function loadLegal(slug: string): string {
  const md = readFileSync(
    join(process.cwd(), "src/content/legal", `${slug}.md`),
    "utf8",
  );
  const quitar = GA_ID ? "no-analitica" : "si-analitica";
  const dejar = GA_ID ? "si-analitica" : "no-analitica";
  return md
    .replace(new RegExp(`<!--${quitar}-->[\\s\\S]*?<!--/${quitar}-->\\n?`, "g"), "")
    .replace(new RegExp(`<!--/?${dejar}-->\\n?`, "g"), "");
}
