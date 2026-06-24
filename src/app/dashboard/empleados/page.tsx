import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listEmployeesWithAccountStatus } from "@/lib/employees";
import { getSubscription } from "@/lib/billing/subscription";
import { isActive } from "@/lib/billing/plans";
import { formatMadrid } from "@/lib/datetime";
import { NuevoEmpleadoForm } from "./NuevoEmpleadoForm";
import { InvitarEmpleado } from "./InvitarEmpleado";
import { setActiveAction } from "./actions";

export default async function EmpleadosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Gestión de empleados: solo OWNER.
  if (session.user.role !== "OWNER") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl text-navy">Empleados</h1>
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Solo el propietario de la empresa puede gestionar empleados.
        </p>
      </main>
    );
  }

  const [employees, sub] = await Promise.all([
    listEmployeesWithAccountStatus(session.user.companyId),
    getSubscription(session.user.companyId),
  ]);
  const subActive = isActive(sub?.status);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl text-navy">Empleados</h1>
      <p className="mt-1 text-sm text-navy/60">
        Da de alta a tu equipo. Al desactivar, se conserva su histórico de
        fichajes.
      </p>

      {!subActive && (
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Tu suscripción no está activa. El alta e invitación de empleados están
          bloqueadas (fichar e informes siguen disponibles).{" "}
          <Link href="/dashboard/suscripcion" className="font-medium underline text-pulse">
            Gestionar suscripción
          </Link>
          .
        </p>
      )}

      <div className="mt-6">
        <NuevoEmpleadoForm />
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-navy/10 bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-navy/10 bg-offwhite text-left text-xs uppercase tracking-wide text-navy/60">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Cuenta</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5">
            {employees.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-navy/40">
                  Aún no hay empleados. Añade el primero arriba.
                </td>
              </tr>
            )}
            {employees.map((e) => (
              <tr key={e.id} className={e.active ? "" : "bg-offwhite/60"}>
                <td className="px-4 py-3 font-medium text-navy">
                  {e.name}
                </td>
                <td className="px-4 py-3 text-navy/70">{e.email}</td>
                <td className="px-4 py-3">
                  {e.active ? (
                    <span className="rounded-full bg-ficha/15 px-2 py-0.5 text-xs font-medium text-ficha">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium text-navy/60">
                      Desactivado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {e.active ? (
                    <InvitarEmpleado
                      employeeId={e.id}
                      accountStatus={e.accountStatus}
                    />
                  ) : (
                    <span className="text-xs text-navy/40">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-navy/60">
                  {formatMadrid(e.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <form action={setActiveAction}>
                    <input type="hidden" name="employeeId" value={e.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={e.active ? "false" : "true"}
                    />
                    <button className="rounded-lg border border-navy/15 px-3 py-1.5 text-xs font-medium text-navy/80 transition hover:bg-navy/5">
                      {e.active ? "Desactivar" : "Reactivar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
