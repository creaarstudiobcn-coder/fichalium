import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listEmployees } from "@/lib/employees";
import { formatMadrid } from "@/lib/datetime";
import { NuevoEmpleadoForm } from "./NuevoEmpleadoForm";
import { setActiveAction } from "./actions";

export default async function EmpleadosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  // Gestión de empleados: solo OWNER.
  if (session.user.role !== "OWNER") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Empleados</h1>
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Solo el propietario de la empresa puede gestionar empleados.
        </p>
      </main>
    );
  }

  const employees = await listEmployees(session.user.companyId);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Empleados</h1>
      <p className="mt-1 text-sm text-slate-500">
        Da de alta a tu equipo. Al desactivar, se conserva su histórico de
        fichajes.
      </p>

      <div className="mt-6">
        <NuevoEmpleadoForm />
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Alta</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Aún no hay empleados. Añade el primero arriba.
                </td>
              </tr>
            )}
            {employees.map((e) => (
              <tr key={e.id} className={e.active ? "" : "bg-slate-50/60"}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {e.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{e.email}</td>
                <td className="px-4 py-3">
                  {e.active ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                      Desactivado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
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
                    <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100">
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
