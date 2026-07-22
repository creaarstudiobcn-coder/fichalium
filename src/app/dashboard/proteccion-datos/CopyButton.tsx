"use client";

import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg bg-ficha px-3 py-1.5 text-sm font-semibold text-navy transition hover:bg-ficha/90"
    >
      {copied ? "¡Copiado!" : "Copiar texto"}
    </button>
  );
}
