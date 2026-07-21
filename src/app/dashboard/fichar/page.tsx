import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCompanyStatus, canManage } from "@/lib/access";
import { listEmployeeStatuses } from "@/lib/fichajes";
import { formatMadridTime, formatMadrid } from "@/lib/datetime";
import { FicharButton } from "./FicharButton";

export default async function FicharPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Empresa suspendida/de baja: no se admiten fichajes nuevos (son append-only:
  // lo que entre aquí no se puede deshacer).
  if (!canManage(await getCompanyStatus(session.user.companyId))) {
    redirect("/dashboard/informes");
  }

  // El EMPLOYEE solo se ve a sí mismo; OWNER/ADMIN ven a todo el equipo (híbrido).
  // Un EMPLOYEE sin employeeId (no debería ocurrir) no ve a nadie: nunca a todos.
  const isEmployee = session.user.role === "EMPLOYEE";
  const statuses =
    isEmployee && !session.user.employeeId
      ? []
      : await listEmployeeStatuses(
          session.user.companyId,
          isEmployee && session.user.employeeId
            ? { onlyEmployeeId: session.user.employeeId }
            : undefined,
        );
  const dentro = statuses.filter((s) => s.isIn).length;

  // Hora actual mostrada en zona de España (los datos se guardan en UTC).
  const ahora = formatMadrid(new Date());

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl text-navy">Fichar</h1>
          <p className="mt-1 text-sm text-navy/60">
            {dentro} de {statuses.length}{" "}
            {statuses.length === 1 ? "empleado" : "empleados"} dentro ·{" "}
            <span className="font-mono">{ahora}</span> (hora de España)
          </p>
        </div>
      </header>

      {/* Aviso de transparencia (art. 90 LOPDGDD): informar ANTES de fichar de
          que se registra la ubicación y quién puede verla. El texto legal
          completo vive en la política de privacidad. */}
      <p className="mt-4 flex items-start gap-2 rounded-lg border border-navy/10 bg-offwhite px-3 py-2 text-xs text-navy/60">
        <svg
          viewBox="0 0 24 24"
          className="mt-0.5 h-4 w-4 shrink-0 text-navy/40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span>
          Al fichar se registra tu ubicación en ese momento, visible solo para la
          empresa y con fines de control horario. Si tu navegador no da permiso,
          el fichaje se guarda igualmente sin ubicación.
        </span>
      </p>

      {statuses.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-navy/20 bg-white p-8 text-center text-sm text-navy/60">
          No hay empleados activos.{" "}
          {session.user.role === "OWNER" ? (
            <Link
              href="/dashboard/empleados"
              className="font-medium text-pulse underline"
            >
              Da de alta a tu equipo
            </Link>
          ) : (
            "Pide al propietario que dé de alta el equipo."
          )}
          .
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {statuses.map((s) => (
            <li
              key={s.employee.id}
              className="flex items-center justify-between rounded-xl border border-navy/10 bg-white p-4"
            >
              <div>
                <p className="font-semibold text-navy">{s.employee.name}</p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  {s.isIn ? (
                    <>
                      <span className="rounded-full bg-ficha/15 px-2 py-0.5 text-xs font-medium text-ficha">
                        Dentro
                      </span>
                      <span className="font-mono text-navy/50">
                        desde las {s.since ? formatMadridTime(s.since) : "—"}
                      </span>
                    </>
                  ) : (
                    <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium text-navy/60">
                      Fuera
                    </span>
                  )}
                </div>
              </div>
              <FicharButton employeeId={s.employee.id} nextType={s.nextType} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
