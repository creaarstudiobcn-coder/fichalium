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
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl text-navy">Suscripción</h1>
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
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl text-navy">Suscripción</h1>
      <p className="mt-1 text-sm text-navy/60">
        El precio es por tramos según el nº de empleados activos.
      </p>

      {/* Estado actual */}
      <section className="mt-6 rounded-xl border border-navy/10 bg-white p-6">
        {sub ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-navy/40">
                  Estado
                </p>
                <p className="mt-1 text-lg font-semibold text-navy">
                  {STATUS_LABEL[sub.status] ?? sub.status}
                </p>
              </div>
              <span
                className={
                  "w-fit rounded-full px-3 py-1 text-xs font-medium " +
                  (active
                    ? "bg-ficha/15 text-ficha"
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
              <button className="rounded-lg bg-ficha px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-ficha/90">
                Gestionar suscripción
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="text-lg font-semibold text-navy">
              Aún no tienes suscripción
            </p>
            <p className="mt-1 text-sm text-navy/60">
              Suscríbete para dar de alta e invitar a tu equipo. Incluye 14 días
              de prueba.
            </p>
            <form action={startCheckoutAction} className="mt-6">
              <button className="rounded-lg bg-ficha px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-ficha/90">
                Suscribirse
              </button>
            </form>
          </>
        )}
      </section>

      {/* Tabla de tramos */}
      <section className="mt-8">
        <h2 className="text-lg text-navy">Tramos</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-navy/10 bg-white">
          <table className="w-full min-w-[320px] text-sm">
            <thead className="border-b border-navy/10 bg-offwhite text-left text-xs uppercase tracking-wide text-navy/60">
              <tr className="whitespace-nowrap">
                <th className="px-4 py-3 font-medium">Empleados</th>
                <th className="px-4 py-3 font-medium">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {TRAMOS.map((t, i) => {
                const from = (TRAMOS[i - 1]?.upTo ?? 0) + 1;
                const range = t.upTo === null ? `${from}+` : `${from}–${t.upTo}`;
                const isCurrent = tramo.eur === t.eur;
                return (
                  <tr key={i} className={isCurrent ? "bg-offwhite" : ""}>
                    <td className="px-4 py-3 text-navy font-mono">{range}</td>
                    <td className="px-4 py-3 text-navy/70 font-mono">{t.eur} €/mes</td>
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
      <dt className="text-xs font-medium uppercase tracking-wide text-navy/40">
        {label}
      </dt>
      <dd className="mt-1 text-lg font-semibold text-navy font-mono">{value}</dd>
      {sub && <p className="text-xs text-navy/40">{sub}</p>}
    </div>
  );
}
