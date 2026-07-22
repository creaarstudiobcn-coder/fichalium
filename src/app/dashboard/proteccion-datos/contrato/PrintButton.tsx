"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy/90 print:hidden"
    >
      Imprimir / Guardar PDF
    </button>
  );
}
