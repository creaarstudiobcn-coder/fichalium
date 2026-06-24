import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listEmployeeStatuses } from "@/lib/fichajes";
import { formatMadridTime, formatMadrid } from "@/lib/datetime";
import { FicharButton } from "./FicharButton";

export default async function FicharPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

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
          <h1 className="text-2xl font-bold text-slate-900">Fichar</h1>
          <p className="mt-1 text-sm text-slate-500">
            {dentro} de {statuses.length}{" "}
            {statuses.length === 1 ? "empleado" : "empleados"} dentro · {ahora}{" "}
            (hora de España)
          </p>
        </div>
      </header>

      {statuses.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No hay empleados activos.{" "}
          {session.user.role === "OWNER" ? (
            <Link href="/dashboard/empleados" className="font-medium underline">
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
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="font-semibold text-slate-900">
                  {s.employee.name}
                </p>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  {s.isIn ? (
                    <>
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Dentro
                      </span>
                      <span className="text-slate-500">
                        desde las {s.since ? formatMadridTime(s.since) : "—"}
                      </span>
                    </>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
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
