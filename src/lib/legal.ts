import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Lee un documento legal en Markdown desde src/content/legal. Las páginas que
 * lo usan son estáticas (force-static), así que la lectura ocurre en build.
 */
export function loadLegal(slug: string): string {
  return readFileSync(
    join(process.cwd(), "src/content/legal", `${slug}.md`),
    "utf8",
  );
}
