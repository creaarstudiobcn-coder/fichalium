import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/superadmin/auth";
import { listSubscriptions } from "@/lib/superadmin/companies";
import { formatMadrid } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export default async function SuscripcionesPage() {
  if (!(await requireSuperadmin())) notFound();

  const subs = await listSubscriptions();

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Suscripciones</h1>
      <p className="mt-1 text-sm text-slate-500">
        Para cambios de cobro, abre el cliente en Stripe (no se editan importes
        aquí, para no descuadrar con Stripe).
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Empleados</th>
              <th className="px-4 py-3 font-medium">Tramo</th>
              <th className="px-4 py-3 font-medium">Periodo</th>
              <th className="px-4 py-3 font-medium">Stripe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No hay suscripciones.
                </td>
              </tr>
            )}
            {subs.map((s, i) => (
              <tr key={i}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {s.companyName}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {s.status}
                  {s.cancelAtPeriodEnd ? " (cancela al final)" : ""}
                </td>
                <td className="px-4 py-3 text-slate-600">{s.quantity}</td>
                <td className="px-4 py-3 text-slate-600">{s.tramoEur} €/mes</td>
                <td className="px-4 py-3 text-slate-500">
                  {s.currentPeriodEnd ? formatMadrid(s.currentPeriodEnd) : "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3">
                    <a
                      href={s.customerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-indigo-600 underline"
                    >
                      Cliente
                    </a>
                    <a
                      href={s.subscriptionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-indigo-600 underline"
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
