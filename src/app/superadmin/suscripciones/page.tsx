import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/superadmin/auth";
import { listSubscriptions } from "@/lib/superadmin/companies";
import { formatMadrid } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function SuscripcionesPage() {
  if (!(await requireSuperadmin())) notFound();

  const subs = await listSubscriptions();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl text-navy">Suscripciones</h1>
      <p className="mt-1 text-sm text-navy/60">
        Para cambios de cobro, abre el cliente en Stripe (no se editan importes
        aquí, para no descuadrar con Stripe).
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-navy/10 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-navy/10 bg-offwhite text-left text-xs uppercase tracking-wide text-navy/60">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Empleados</th>
              <th className="px-4 py-3 font-medium">Tramo</th>
              <th className="px-4 py-3 font-medium">Periodo</th>
              <th className="px-4 py-3 font-medium">Stripe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5">
            {subs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-navy/40">
                  No hay suscripciones.
                </td>
              </tr>
            )}
            {subs.map((s, i) => (
              <tr key={i}>
                <td className="px-4 py-3 font-medium text-navy">
                  {s.companyName}
                </td>
                <td className="px-4 py-3 text-navy/70">
                  {s.status}
                  {s.cancelAtPeriodEnd ? " (cancela al final)" : ""}
                </td>
                <td className="px-4 py-3 text-navy/70 font-mono">{s.quantity}</td>
                <td className="px-4 py-3 text-navy/70 font-mono">{s.tramoEur} €/mes</td>
                <td className="px-4 py-3 text-navy/60 font-mono">
                  {s.currentPeriodEnd ? formatMadrid(s.currentPeriodEnd) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <a
                      href={s.customerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-pulse underline"
                    >
                      Cliente
                    </a>
                    <a
                      href={s.subscriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-pulse underline"
                    >
                      Suscripción
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
