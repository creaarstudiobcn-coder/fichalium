import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/superadmin/auth";
import {
  getMetrics,
  listCompanies,
  listBillingDrift,
} from "@/lib/superadmin/companies";
import { formatMadrid } from "@/lib/datetime";
import { ActionButton } from "./ActionButton";
import { ConfirmarPurga } from "./ConfirmarPurga";
import { suspendAction, unsuspendAction, closeAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "Activa", cls: "bg-ficha/15 text-ficha" },
  SUSPENDED: { label: "Suspendida", cls: "bg-amber-100 text-amber-800" },
  CLOSED: { label: "Baja", cls: "bg-red-100 text-red-700" },
};

const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "Pagando", cls: "bg-ficha/15 text-ficha" },
  trialing: { label: "En prueba", cls: "bg-sky-100 text-sky-800" },
  past_due: { label: "Impago", cls: "bg-amber-100 text-amber-800" },
  unpaid: { label: "Impago", cls: "bg-amber-100 text-amber-800" },
  canceled: { label: "Cancelada", cls: "bg-red-100 text-red-700" },
  incomplete: { label: "Incompleta", cls: "bg-navy/10 text-navy/60" },
};

export default async function SuperadminPage() {
  // Defensa en profundidad (además del layout).
  if (!(await requireSuperadmin())) notFound();

  const [metrics, companies, drift] = await Promise.all([
    getMetrics(),
    listCompanies(),
    listBillingDrift(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl text-navy">Plataforma</h1>

      {/* Deriva de facturación: dinero mal cobrado. Nada lo reconcilia solo. */}
      {drift.length > 0 && (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900">
            ⚠ Facturación desincronizada ({drift.length})
          </h2>
          <p className="mt-1 text-sm text-amber-900/80">
            Estas empresas facturan un número de empleados distinto del real. No
            se corrige solo: si el envío a Stripe falló, Stripe no emite webhook.
          </p>
          <ul className="mt-3 space-y-2">
            {drift.map((d) => (
              <li key={d.companyId} className="text-sm text-amber-950">
                <Link
                  href={`/superadmin/empresas/${d.companyId}`}
                  className="font-medium underline underline-offset-2"
                >
                  {d.companyName}
                </Link>{" "}
                — factura {d.billedQuantity} ({d.billedEur} €) y tiene{" "}
                {d.actualActive} activos ({d.correctEur} €).{" "}
                <strong>
                  {d.correctEur > d.billedEur
                    ? `Cobras ${d.correctEur - d.billedEur} € de menos.`
                    : `Cobras ${d.billedEur - d.correctEur} € de más.`}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Ingresos */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="MRR"
          value={`${metrics.mrrEur} €`}
          sub={`${metrics.payingCompanies} empresas pagando`}
        />
        <Metric
          label="En prueba"
          value={`${metrics.trialingCompanies}`}
          sub={`${metrics.mrrInTrialEur} € si convierten`}
        />
        <Metric
          label="En riesgo"
          value={`${metrics.mrrAtRiskEur} €`}
          sub={`${metrics.atRiskCompanies} con impago`}
          alert={metrics.atRiskCompanies > 0}
        />
        <Metric
          label="Altas (30 días)"
          value={`${metrics.recentSignups}`}
          sub={`${metrics.totalCompanies} empresas en total`}
        />
      </section>

      {/* Estado de la cartera */}
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Activas" value={`${metrics.activeCompanies}`} />
        <Metric label="Suspendidas" value={`${metrics.suspendedCompanies}`} />
        <Metric label="De baja" value={`${metrics.closedCompanies}`} />
        <Metric
          label="Sin suscripción"
          value={`${metrics.withoutSubscription}`}
          sub="registradas pero bloqueadas"
        />
      </section>

      <p className="mt-3 text-xs text-navy/40">
        El MRR cuenta solo suscripciones <code>active</code> (las pruebas facturan
        0 €) y se calcula sobre la cantidad cacheada y la tabla local de tramos.
        Para el importe exacto, Stripe manda.
      </p>

      {/* Empresas */}
      <section className="mt-8">
        <h2 className="text-lg text-navy">Empresas</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-navy/10 bg-white">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="border-b border-navy/10 bg-offwhite text-left text-xs uppercase tracking-wide text-navy/60">
              <tr className="whitespace-nowrap">
                <th className="px-4 py-3 font-medium">Empresa</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Suscripción</th>
                <th className="px-4 py-3 font-medium">MRR</th>
                <th className="px-4 py-3 font-medium">Empleados</th>
                <th className="px-4 py-3 font-medium">Última actividad</th>
                <th className="px-4 py-3 font-medium">Alta</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {companies.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-navy/40">
                    No hay empresas.
                  </td>
                </tr>
              )}
              {companies.map((c) => {
                const st = STATUS[c.status] ?? STATUS.ACTIVE;
                const sub = c.subscription
                  ? (SUB_STATUS[c.subscription.status] ?? {
                      label: c.subscription.status,
                      cls: "bg-navy/10 text-navy/60",
                    })
                  : null;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/superadmin/empresas/${c.id}`}
                        className="font-medium text-navy underline-offset-2 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.ownerEmail && (
                        <p className="text-xs text-navy/40">{c.ownerEmail}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge cls={st.cls}>{st.label}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {sub ? (
                        <Badge cls={sub.cls}>{sub.label}</Badge>
                      ) : (
                        <span className="text-xs text-navy/40">sin suscripción</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-navy/70">
                      {c.mrrEur > 0 ? `${c.mrrEur} €` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-navy/70">
                      {c.activeEmployeeCount} / {c.employeeCount}
                      {c.pendingInvitations > 0 && (
                        <span className="ml-1 text-xs text-navy/40">
                          (+{c.pendingInvitations} inv.)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-navy/60">
                      {c.lastEntryAt ? (
                        formatMadrid(c.lastEntryAt)
                      ) : (
                        <span className="text-navy/30">nunca fichó</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-navy/60">
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

function Badge({ cls, children }: { cls: string; children: React.ReactNode }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

function Metric({
  label,
  value,
  sub,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-5 ${
        alert ? "border-amber-300" : "border-navy/10"
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-navy/40">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-2xl font-bold ${
          alert ? "text-amber-700" : "text-navy"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-navy/40">{sub}</p>}
    </div>
  );
}
