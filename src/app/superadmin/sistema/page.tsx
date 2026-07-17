import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/superadmin/auth";
import { getSystemHealth } from "@/lib/superadmin/health";

export const dynamic = "force-dynamic";

export default async function SistemaPage() {
  if (!(await requireSuperadmin())) notFound();
  const checks = await getSystemHealth();
  const failing = checks.filter((c) => !c.ok);
  const criticalFailing = failing.filter((c) => c.critical);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl text-navy">Sistema</h1>
      <p className="mt-1 text-sm text-navy/50">
        Comprobaciones en vivo contra la base de datos y el entorno. Existen
        porque los fallos peligrosos de este sistema son silenciosos: si la RLS
        deja de aplicar, nada lo grita en los logs.
      </p>

      <div
        className={`mt-6 rounded-xl border p-5 ${
          criticalFailing.length > 0
            ? "border-red-300 bg-red-50"
            : failing.length > 0
              ? "border-amber-300 bg-amber-50"
              : "border-ficha/30 bg-ficha/5"
        }`}
      >
        <p className="font-medium text-navy">
          {criticalFailing.length > 0
            ? `⚠ ${criticalFailing.length} comprobación(es) crítica(s) fallando`
            : failing.length > 0
              ? `${failing.length} aviso(s) no crítico(s)`
              : "✓ Todo correcto"}
        </p>
      </div>

      <ul className="mt-6 space-y-3">
        {checks.map((c) => (
          <li
            key={c.label}
            className="flex gap-3 rounded-xl border border-navy/10 bg-white p-4"
          >
            <span
              aria-hidden
              className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                c.ok ? "bg-ficha" : c.critical ? "bg-red-500" : "bg-amber-500"
              }`}
            />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-navy">
                {c.label}
                {!c.ok && c.critical && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    crítico
                  </span>
                )}
                <span className="sr-only">{c.ok ? "correcto" : "fallando"}</span>
              </p>
              <p className="mt-0.5 break-words text-sm text-navy/60">{c.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
