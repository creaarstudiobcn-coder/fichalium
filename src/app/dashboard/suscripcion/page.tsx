import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withTenant } from "@/lib/tenant";
import { getSubscription } from "@/lib/billing/subscription";
import { isActive, tramoFor, TRAMOS } from "@/lib/billing/plans";
import { formatMadrid } from "@/lib/datetime";
import { startCheckoutAction, openPortalAction } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  trialing: "En prueba",
  active: "Activa",
  past_due: "Pago pendiente",
  canceled: "Cancelada",
  unpaid: "Impagada",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
};

export default async function SuscripcionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "OWNER") {
    return (
      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Suscripción</h1>
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Solo el propietario de la empresa gestiona la suscripción.
        </p>
      </main>
    );
  }

  const [sub, activeCount] = await Promise.all([
    getSubscription(session.user.companyId),
    withTenant(session.user.companyId, (tx) =>
      tx.employee.count({ where: { active: true } }),
    ),
  ]);
  const active = isActive(sub?.status);
  const tramo = tramoFor(activeCount);

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Suscripción</h1>
      <p className="mt-1 text-sm text-slate-500">
        El precio es por tramos según el nº de empleados activos.
      </p>

      {/* Estado actual */}
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6">
        {sub ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Estado
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {STATUS_LABEL[sub.status] ?? sub.status}
                </p>
              </div>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-medium " +
                  (active
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700")
                }
              >
                {active ? "Acceso activo" : "Acceso restringido"}
              </span>
            </div>

            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Info
                label="Tramo actual"
                value={`${tramo.eur} €/mes`}
                sub={tramo.label}
              />
              <Info
                label="Empleados facturados"
                value={`${sub.quantity}`}
                sub={`${activeCount} activos ahora`}
              />
              <Info
                label={sub.cancelAtPeriodEnd ? "Cancela el" : "Renueva el"}
                value={
                  sub.currentPeriodEnd ? formatMadrid(sub.currentPeriodEnd) : "—"
                }
              />
            </dl>

            {sub.cancelAtPeriodEnd && (
              <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                La suscripción se cancelará al final del periodo actual.
              </p>
            )}

            <form action={openPortalAction} className="mt-6">
              <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700">
                Gestionar suscripción
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-slate-900">
              Aún no tienes suscripción
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Suscríbete para dar de alta e invitar a tu equipo. Incluye 14 días
              de prueba.
            </p>
            <form action={startCheckoutAction} className="mt-6">
              <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700">
                Suscribirse
              </button>
            </form>
          </>
        )}
      </section>

      {/* Tabla de tramos */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Tramos</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Empleados</th>
                <th className="px-4 py-3 font-medium">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {TRAMOS.map((t, i) => {
                const from = (TRAMOS[i - 1]?.upTo ?? 0) + 1;
                const range = t.upTo === null ? `${from}+` : `${from}–${t.upTo}`;
                const isCurrent = tramo.eur === t.eur;
                return (
                  <tr key={i} className={isCurrent ? "bg-slate-50" : ""}>
                    <td className="px-4 py-3 text-slate-900">{range}</td>
                    <td className="px-4 py-3 text-slate-600">{t.eur} €/mes</td>
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

function Info({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
