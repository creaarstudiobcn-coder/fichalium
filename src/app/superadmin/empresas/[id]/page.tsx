import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/superadmin/auth";
import { getCompanyDetail } from "@/lib/superadmin/companies";
import { formatMadrid } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const STATUS: Record<string, string> = {
  ACTIVE: "Activa",
  SUSPENDED: "Suspendida",
  CLOSED: "De baja",
};

export default async function EmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await requireSuperadmin())) notFound();
  const { id } = await params;
  const c = await getCompanyDetail(id);
  if (!c) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/superadmin"
        className="text-sm text-navy/50 underline-offset-2 hover:underline"
      >
        ← Plataforma
      </Link>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl text-navy">{c.name}</h1>
        <span className="font-mono text-xs text-navy/40">{c.id}</span>
      </div>

      {/* Ficha */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card title="Cuenta">
          <Row label="Estado" value={STATUS[c.status] ?? c.status} />
          <Row label="Contacto (owner)" value={c.ownerEmail ?? "—"} />
          <Row label="Alta" value={formatMadrid(c.createdAt)} />
          <Row label="Cuentas de usuario" value={`${c.userCount}`} />
        </Card>

        <Card title="Plantilla y uso">
          <Row
            label="Empleados"
            value={`${c.activeEmployeeCount} activos / ${c.employeeCount} totales`}
          />
          <Row label="Invitaciones pendientes" value={`${c.pendingInvitations}`} />
          <Row label="Fichajes registrados" value={`${c.timeEntryCount}`} />
          <Row
            label="Última actividad"
            value={c.lastEntryAt ? formatMadrid(c.lastEntryAt) : "Nunca fichó"}
          />
        </Card>

        <Card title="Suscripción">
          {c.subscription ? (
            <>
              <Row label="Estado" value={c.subscription.status} />
              <Row
                label="Factura"
                value={`${c.subscription.quantity} empleados · ${c.tramoLabel}`}
              />
              <Row
                label="MRR"
                value={c.mrrEur > 0 ? `${c.mrrEur} €/mes` : "0 € (no cobra hoy)"}
              />
              <Row
                label="Periodo hasta"
                value={
                  c.subscription.currentPeriodEnd
                    ? formatMadrid(c.subscription.currentPeriodEnd)
                    : "—"
                }
              />
              <Row
                label="Cancela al final"
                value={c.subscription.cancelAtPeriodEnd ? "Sí" : "No"}
              />
            </>
          ) : (
            <p className="text-sm text-navy/50">
              Sin suscripción. La empresa está registrada pero no puede dar de
              alta empleados.
            </p>
          )}
        </Card>

        <Card title="Stripe">
          {c.customerUrl || c.subscriptionUrl ? (
            <div className="flex flex-col gap-2 text-sm">
              {c.customerUrl && (
                <a
                  className="text-ficha underline underline-offset-2"
                  href={c.customerUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver cliente en Stripe ↗
                </a>
              )}
              {c.subscriptionUrl && (
                <a
                  className="text-ficha underline underline-offset-2"
                  href={c.subscriptionUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver suscripción en Stripe ↗
                </a>
              )}
            </div>
          ) : (
            <p className="text-sm text-navy/50">Sin cliente de Stripe.</p>
          )}
        </Card>
      </section>

      {/* Historial de acciones sobre esta empresa */}
      <section className="mt-8">
        <h2 className="text-lg text-navy">Historial de plataforma</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-navy/10 bg-white">
          {c.audit.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-navy/40">
              Sin acciones registradas.
            </p>
          ) : (
            <ul className="divide-y divide-navy/5">
              {c.audit.map((a) => (
                <li key={a.id} className="flex flex-wrap gap-x-3 px-4 py-3 text-sm">
                  <span className="font-mono text-xs text-navy/50">
                    {formatMadrid(a.createdAt)}
                  </span>
                  <span className="font-medium text-navy">{a.action}</span>
                  <span className="text-navy/50">por {a.actorEmail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <p className="mt-6 text-xs text-navy/40">
        Los nombres de los empleados y sus fichajes no se muestran aquí a
        propósito: son datos personales de terceros y esta cuenta solo ve
        agregados.
      </p>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white p-5">
      <h2 className="text-xs font-medium uppercase tracking-wide text-navy/40">
        {title}
      </h2>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-navy/50">{label}</span>
      <span className="text-right font-medium text-navy">{value}</span>
    </div>
  );
}
