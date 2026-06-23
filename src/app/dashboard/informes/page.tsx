import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listEmployees } from "@/lib/employees";
import { getReport, parseReportFilters } from "@/lib/reports";
import {
  formatMadrid,
  formatMadridDate,
  formatDuration,
} from "@/lib/datetime";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const filters = parseReportFilters(params);

  const [employees, report] = await Promise.all([
    listEmployees(session.user.companyId),
    getReport(session.user.companyId, filters),
  ]);

  // Query string para los enlaces de exportación (mismos filtros aplicados).
  const exportQuery = new URLSearchParams();
  if (filters.employeeId) exportQuery.set("employeeId", filters.employeeId);
  if (filters.from) exportQuery.set("from", filters.from);
  if (filters.to) exportQuery.set("to", filters.to);
  const qs = exportQuery.toString();
  const exportHref = (format: "pdf" | "csv") =>
    `/dashboard/informes/export?format=${format}${qs ? `&${qs}` : ""}`;

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Informes e historial
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Historial de fichajes de la empresa, con horas trabajadas por día.
            Listo para presentar a la Inspección de Trabajo.
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={exportHref("pdf")}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Exportar PDF
          </a>
          <a
            href={exportHref("csv")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Exportar Excel/CSV
          </a>
        </div>
      </header>

      {/* ───────── Filtros (GET → viven en la URL, exportación los reutiliza) ───────── */}
      <form
        method="get"
        className="mt-8 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-white p-4"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">Empleado</span>
          <select
            name="employeeId"
            defaultValue={filters.employeeId ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Todos los empleados</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
                {e.active ? "" : " (inactivo)"}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">Desde</span>
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-600">Hasta</span>
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Filtrar
        </button>
        {(filters.employeeId || filters.from || filters.to) && (
          <a
            href="/dashboard/informes"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
          >
            Limpiar filtros
          </a>
        )}
      </form>

      {/* ───────── Horas trabajadas por día ───────── */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">
          Horas trabajadas por día
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Día</th>
                <th className="px-4 py-3 text-right font-medium">
                  Horas trabajadas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.dailyHours.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No hay tramos completos para calcular horas en este periodo.
                  </td>
                </tr>
              )}
              {report.dailyHours.map((d) => {
                const ongoing = d.pairs.some((p) => p.ongoing);
                return (
                  <tr key={`${d.employeeId}-${d.day}`}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {d.employeeName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatMadridDate(new Date(`${d.day}T12:00:00Z`))}
                      {ongoing && (
                        <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          en curso
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatDuration(d.minutes)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ───────── Detalle de fichajes ───────── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">
          Detalle de fichajes
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {report.entries.length}{" "}
          {report.entries.length === 1 ? "registro" : "registros"}, del más
          reciente al más antiguo.
        </p>
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Fecha y hora (España)</th>
                <th className="px-4 py-3 font-medium">Corrección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {report.entries.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-slate-400"
                  >
                    No hay fichajes con los filtros seleccionados.
                  </td>
                </tr>
              )}
              {report.entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {e.employeeName}
                  </td>
                  <td className="px-4 py-3">
                    {e.type === "CLOCK_IN" ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Entrada
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Salida
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatMadrid(e.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    {e.isCorrection && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        Corrección
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
