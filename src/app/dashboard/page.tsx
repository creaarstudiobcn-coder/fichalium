import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withTenant } from "@/lib/tenant";
import { formatMadrid, formatMadridTime, formatDuration } from "@/lib/datetime";
import { listEmployeeStatuses } from "@/lib/fichajes";
import { todayHoursByEmployee } from "@/lib/reports";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  // El middleware ya protege la ruta; esto es defensa en profundidad.
  if (!session?.user) redirect("/login");

  const { companyId, role, name, email } = session.user;
  const isOwner = role === "OWNER";

  // Toda query con datos de cliente pasa por withTenant → RLS filtra por company.
  const [company, statuses, todayHours] = await Promise.all([
    withTenant(companyId, (tx) =>
      tx.company.findUnique({
        where: { id: companyId },
        select: { id: true, name: true, createdAt: true },
      }),
    ),
    listEmployeeStatuses(companyId),
    todayHoursByEmployee(companyId),
  ]);

  // Minutos trabajados hoy por empleado (para cruzar con el estado actual).
  const minutesToday = new Map(todayHours.map((t) => [t.employeeId, t.minutes]));
  const dentro = statuses.filter((s) => s.isIn).length;

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header>
        <p className="text-sm text-navy/50">Panel de</p>
        <h1 className="text-2xl text-navy">{company?.name ?? "Empresa"}</h1>
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/fichar"
          className="rounded-xl border border-navy bg-navy p-5 text-white transition hover:bg-navy/90"
        >
          <p className="text-lg font-semibold">Fichar →</p>
          <p className="mt-1 text-sm text-white/70">
            Registrar entradas y salidas y ver quién está dentro.
          </p>
        </Link>
        {isOwner && (
          <Link
            href="/dashboard/empleados"
            className="rounded-xl border border-navy/10 bg-white p-5 transition hover:bg-offwhite"
          >
            <p className="text-lg font-semibold text-navy">Empleados →</p>
            <p className="mt-1 text-sm text-navy/60">
              Dar de alta, listar y desactivar empleados.
            </p>
          </Link>
        )}
      </section>

      {/* ───────── Resumen rápido de hoy ───────── */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-lg text-navy">Resumen de hoy</h2>
          <p className="text-sm text-navy/50">
            {dentro} de {statuses.length}{" "}
            {statuses.length === 1 ? "empleado" : "empleados"} dentro ahora mismo
          </p>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-navy/10 bg-white">
          {statuses.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-navy/40">
              No hay empleados activos.
            </p>
          ) : (
            <ul className="divide-y divide-navy/5">
              {statuses.map((s) => (
                <li
                  key={s.employee.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    {s.isIn ? (
                      <span className="rounded-full bg-ficha/15 px-2 py-0.5 text-xs font-medium text-ficha">
                        Dentro
                      </span>
                    ) : (
                      <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium text-navy/60">
                        Fuera
                      </span>
                    )}
                    <div>
                      <p className="font-medium text-navy">{s.employee.name}</p>
                      {s.isIn && s.since && (
                        <p className="font-mono text-xs text-navy/50">
                          desde las {formatMadridTime(s.since)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold text-navy">
                      {formatDuration(minutesToday.get(s.employee.id) ?? 0)}
                    </p>
                    <p className="text-xs text-navy/40">hoy</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Card label="Usuario" value={name ?? "—"} sub={email ?? ""} />
        <Card label="Tu rol" value={role} />
        <Card
          label="Empresa (tenant)"
          value={company?.name ?? "—"}
          sub={`id: ${companyId}`}
          mono
        />
        <Card
          label="Alta de empresa"
          value={company ? formatMadrid(company.createdAt) : "—"}
          mono
        />
      </section>
    </main>
  );
}

function Card({
  label,
  value,
  sub,
  mono,
}: {
  label: string;
  value: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl border border-navy/10 bg-white p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-navy/40">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold text-navy ${mono ? "font-mono" : ""}`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 truncate font-mono text-xs text-navy/40">{sub}</p>
      )}
    </div>
  );
}
