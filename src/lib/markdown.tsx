import type { ReactNode } from "react";

/**
 * Renderizador de Markdown mínimo y sin dependencias para las páginas legales.
 * Cubre exactamente la sintaxis usada en los documentos de marca:
 * encabezados (#, ##, ###), **negrita**, enlaces [txt](url), listas (-),
 * citas (>), tablas GFM (| … |), regla horizontal (---) y párrafos.
 *
 * No pretende ser un parser completo de CommonMark: es un convertidor acotado
 * a un contenido controlado (los .md de src/content/legal).
 */

// ---- Inline: **negrita** y [texto](url) ----
function renderInline(text: string, keyBase: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Tokeniza negrita y enlaces en una sola pasada.
  const regex = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-navy">
          {match[1]}
        </strong>,
      );
    } else if (match[2] !== undefined) {
      const href = match[3];
      const external = /^https?:\/\//.test(href);
      nodes.push(
        <a
          key={`${keyBase}-a${i}`}
          href={href}
          className="font-medium text-pulse hover:underline"
          {...(external
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
        >
          {match[2]}
        </a>,
      );
    }
    last = regex.lastIndex;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function splitRow(line: string): string[] {
  // "| a | b |" → ["a", "b"]
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

export function renderMarkdown(md: string): ReactNode {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Línea en blanco
    if (trimmed === "") {
      i++;
      continue;
    }

    // Regla horizontal
    if (trimmed === "---") {
      blocks.push(<hr key={key++} className="my-8 border-navy/10" />);
      i++;
      continue;
    }

    // Encabezados
    if (trimmed.startsWith("### ")) {
      blocks.push(
        <h3 key={key++} className="mt-6 text-lg text-navy">
          {renderInline(trimmed.slice(4), `h3-${key}`)}
        </h3>,
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("## ")) {
      blocks.push(
        <h2 key={key++} className="mt-8 text-xl text-navy">
          {renderInline(trimmed.slice(3), `h2-${key}`)}
        </h2>,
      );
      i++;
      continue;
    }
    if (trimmed.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className="text-3xl text-navy">
          {renderInline(trimmed.slice(2), `h1-${key}`)}
        </h1>,
      );
      i++;
      continue;
    }

    // Cita (blockquote): líneas consecutivas que empiezan por ">"
    if (trimmed.startsWith(">")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="my-4 rounded-r-lg border-l-4 border-pulse bg-pulse/5 px-4 py-3 text-navy/80"
        >
          {renderInline(buf.join(" "), `bq-${key}`)}
        </blockquote>,
      );
      continue;
    }

    // Tabla GFM: líneas consecutivas que empiezan por "|"
    if (trimmed.startsWith("|")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        buf.push(lines[i].trim());
        i++;
      }
      const [headerLine, , ...bodyLines] = buf; // 2ª línea = separador
      const headers = splitRow(headerLine);
      blocks.push(
        <div
          key={key++}
          className="my-4 overflow-x-auto rounded-xl border border-navy/10"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-navy/10 bg-offwhite text-left text-xs uppercase tracking-wide text-navy/60">
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="px-4 py-2 font-medium">
                    {renderInline(h, `th-${key}-${hi}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {bodyLines.map((row, ri) => {
                const cells = splitRow(row);
                return (
                  <tr key={ri}>
                    {cells.map((c, ci) => (
                      <td key={ci} className="px-4 py-2 text-navy/80">
                        {renderInline(c, `td-${key}-${ri}-${ci}`)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Lista no ordenada: líneas consecutivas que empiezan por "- "
    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} className="my-3 list-disc space-y-1.5 pl-5 text-navy/80">
          {items.map((it, ii) => (
            <li key={ii}>{renderInline(it, `li-${key}-${ii}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Párrafo (los documentos tienen cada párrafo en una sola línea)
    blocks.push(
      <p key={key++} className="my-3 leading-relaxed text-navy/80">
        {renderInline(trimmed, `p-${key}`)}
      </p>,
    );
    i++;
  }

  return blocks;
}
