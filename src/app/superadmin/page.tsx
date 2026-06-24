import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/superadmin/auth";
import { getMetrics, listCompanies } from "@/lib/superadmin/companies";
import { formatMadrid } from "@/lib/datetime";
import { isActive } from "@/lib/billing/plans";
import { ActionButton } from "./ActionButton";
import { ConfirmarPurga } from "./ConfirmarPurga";
import { suspendAction, unsuspendAction, closeAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Activa", cls: "bg-green-100 text-green-700" },
  SUSPENDED: { label: "Suspendida", cls: "bg-amber-100 text-amber-800" },
  CLOSED: { label: "Baja", cls: "bg-red-100 text-red-700" },
};

export default async function SuperadminPage() {
  // Defensa en profundidad (además del layout).
  if (!(await requireSuperadmin())) notFound();

  const [metrics, companies] = await Promise.all([getMetrics(), listCompanies()]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Plataforma</h1>

      {/* Métricas */}
      <section className="mt-6 grid gap-4 sm:grid-cols-4">
        <Metric label="Empresas" value={`${metrics.totalCompanies}`} />
        <Metric label="Empresas que pagan" value={`${metrics.payingCompanies}`} />
        <Metric
          label="MRR estimado"
          value={`${metrics.mrrEur} €`}
          sub="ver Stripe para el exacto"
        />
        <Metric label="Altas (30 días)" value={`${metrics.recentSignups}`} />
      </section>

      {/* Empresas */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Empresas</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Suscripción</th>
                <th className="px-4 py-3 font-medium">Empleados</th>
                <th className="px-4 py-3 font-medium">Alta</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No hay empresas.
                  </td>
                </tr>
              )}
              {companies.map((c) => {
                const st = STATUS[c.status] ?? STATUS.ACTIVE;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {c.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}
                      >
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.subscription ? (
                        <>
                          {c.subscription.status}
                          {isActive(c.subscription.status) ? " ✓" : ""}
                        </>
                      ) : (
                        <span className="text-slate-400">sin suscripción</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.activeEmployeeCount} / {c.employeeCount}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatMadrid(c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-start gap-2">
                        {c.status === "SUSPENDED" ? (
                          <ActionButton
                            action={unsuspendAction}
                            companyId={c.id}
                            label="Reactivar"
                          />
                        ) : c.status === "ACTIVE" ? (
                          <ActionButton
                            action={suspendAction}
                            companyId={c.id}
                            label="Suspender"
                          />
                        ) : null}
                        {c.status !== "CLOSED" && (
                          <ActionButton
                            action={closeAction}
                            companyId={c.id}
                            label="Dar de baja"
                            confirm="¿Dar de baja? Se cancelará la suscripción en Stripe."
                          />
                        )}
                        <ConfirmarPurga companyId={c.id} name={c.name} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
