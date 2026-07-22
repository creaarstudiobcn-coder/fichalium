import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCompanyStatus, canManage } from "@/lib/access";
import { listEmployees } from "@/lib/employees";
import {
  getReport,
  parseReportFilters,
  scopeReportToViewer,
} from "@/lib/reports";
import {
  formatMadrid,
  formatMadridDate,
  formatDuration,
  madridDatetimeLocalValue,
} from "@/lib/datetime";
import { CorreccionDialog } from "./CorreccionDialog";

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
  // El EMPLOYEE solo ve SU jornada: el alcance sale de la sesión, no de la URL.
  const isEmployee = session.user.role === "EMPLOYEE";
  const scope = scopeReportToViewer(parseReportFilters(params), session.user);
  const filters = scope ?? {};

  const [employees, report, status] = await Promise.all([
    // El selector de compañeros solo tiene sentido para quien puede verlos.
    isEmployee ? Promise.resolve([]) : listEmployees(session.user.companyId),
    scope
      ? getReport(session.user.companyId, scope)
      : Promise.resolve({ entries: [], dailyHours: [] }),
    getCompanyStatus(session.user.companyId),
  ]);

  // Corregir/añadir fichajes: solo la empresa (OWNER/ADMIN) y con la cuenta activa.
  const canCorrect = !isEmployee && canManage(status);

  // Query string para los enlaces de exportación (mismos filtros aplicados).
  const exportQuery = new URLSearchParams();
  if (filters.employeeId) exportQuery.set("employeeId", filters.employeeId);
  if (filters.from) exportQuery.set("from", filters.from);
  if (filters.to) exportQuery.set("to", filters.to);
  const qs = exportQuery.toString();
  const exportHref = (format: "pdf" | "csv") =>
    `/dashboard/informes/export?format=${format}${qs ? `&${qs}` : ""}`;

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl text-navy">
            Informes e historial
          </h1>
          <p className="mt-1 text-sm text-navy/60">
            {isEmployee
              ? "Tu historial de fichajes, con tus horas trabajadas por día."
              : "Historial de fichajes de la empresa, con horas trabajadas por día. Listo para presentar a la Inspección de Trabajo."}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={exportHref("pdf")}
            className="rounded-lg bg-ficha px-4 py-2 text-sm font-semibold text-navy transition hover:bg-ficha/90"
          >
            Exportar PDF
          </a>
          <a
            href={exportHref("csv")}
            className="rounded-lg border border-navy/15 px-4 py-2 text-sm font-semibold text-navy/80 transition hover:bg-navy/5"
          >
            Exportar Excel/CSV
          </a>
        </div>
      </header>

      {/* ───────── Filtros (GET → viven en la URL, exportación los reutiliza) ───────── */}
      <form
        method="get"
        className="mt-8 flex flex-col flex-wrap gap-4 rounded-xl border border-navy/10 bg-white p-4 sm:flex-row sm:items-end"
      >
        {/* Filtrar por compañero no se ofrece al EMPLOYEE: solo se ve a sí mismo. */}
        {!isEmployee && (
          <label className="flex w-full flex-col gap-1 text-sm sm:w-auto">
            <span className="font-medium text-navy/70">Empleado</span>
            <select
              name="employeeId"
              defaultValue={filters.employeeId ?? ""}
              className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm sm:w-auto"
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
        )}
        <label className="flex w-full flex-col gap-1 text-sm sm:w-auto">
          <span className="font-medium text-navy/70">Desde</span>
          <input
            type="date"
            name="from"
            defaultValue={filters.from ?? ""}
            className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm sm:w-auto"
          />
        </label>
        <label className="flex w-full flex-col gap-1 text-sm sm:w-auto">
          <span className="font-medium text-navy/70">Hasta</span>
          <input
            type="date"
            name="to"
            defaultValue={filters.to ?? ""}
            className="w-full rounded-lg border border-navy/15 px-3 py-2 text-sm sm:w-auto"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-ficha px-4 py-2 text-sm font-semibold text-navy transition hover:bg-ficha/90 sm:w-auto"
        >
          Filtrar
        </button>
        {/* Al EMPLOYEE su propio employeeId le viene siempre impuesto: no cuenta
            como filtro que se pueda limpiar. */}
        {((!isEmployee && filters.employeeId) || filters.from || filters.to) && (
          <a
            href="/dashboard/informes"
            className="rounded-lg px-3 py-2 text-center text-sm font-medium text-pulse underline-offset-2 hover:underline"
          >
            Limpiar filtros
          </a>
        )}
      </form>

      {/* ───────── Horas trabajadas por día ───────── */}
      <section className="mt-8">
        <h2 className="text-lg text-navy">
          Horas trabajadas por día
        </h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-navy/10 bg-white">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="border-b border-navy/10 bg-offwhite text-left text-xs uppercase tracking-wide text-navy/60">
              <tr className="whitespace-nowrap">
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Día</th>
                <th className="px-4 py-3 text-right font-medium">
                  Horas trabajadas
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {report.dailyHours.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-navy/40"
                  >
                    No hay tramos completos para calcular horas en este periodo.
                  </td>
                </tr>
              )}
              {report.dailyHours.map((d) => {
                const ongoing = d.pairs.some((p) => p.ongoing);
                return (
                  <tr key={`${d.employeeId}-${d.day}`}>
                    <td className="px-4 py-3 font-medium text-navy">
                      {d.employeeName}
                    </td>
                    <td className="px-4 py-3 text-navy/70 font-mono">
                      {formatMadridDate(new Date(`${d.day}T12:00:00Z`))}
                      {ongoing && (
                        <span className="ml-2 rounded-full bg-pulse/15 px-2 py-0.5 text-xs font-medium text-pulse">
                          en curso
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-navy font-mono">
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg text-navy">Detalle de fichajes</h2>
            <p className="mt-1 text-sm text-navy/60">
              {report.entries.length}{" "}
              {report.entries.length === 1 ? "registro" : "registros"}, del más
              reciente al más antiguo.
            </p>
          </div>
          {canCorrect && employees.length > 0 && (
            <CorreccionDialog
              mode="manual"
              empleados={employees.map((e) => ({ id: e.id, name: e.name }))}
            />
          )}
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-navy/10 bg-white">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-navy/10 bg-offwhite text-left text-xs uppercase tracking-wide text-navy/60">
              <tr className="whitespace-nowrap">
                <th className="px-4 py-3 font-medium">Empleado</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Fecha y hora (España)</th>
                {/* Ubicación: dato de terceros, solo para el empleador. */}
                {!isEmployee && (
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                )}
                <th className="px-4 py-3 font-medium">Corrección</th>
                {canCorrect && (
                  <th className="px-4 py-3 font-medium">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5">
              {report.entries.length === 0 && (
                <tr>
                  <td
                    colSpan={4 + (isEmployee ? 0 : 1) + (canCorrect ? 1 : 0)}
                    className="px-4 py-8 text-center text-navy/40"
                  >
                    No hay fichajes con los filtros seleccionados.
                  </td>
                </tr>
              )}
              {report.entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 font-medium text-navy">
                    {e.employeeName}
                  </td>
                  <td className="px-4 py-3">
                    {e.type === "CLOCK_IN" ? (
                      <span className="rounded-full bg-ficha/15 px-2 py-0.5 text-xs font-medium text-ficha">
                        Entrada
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Salida
                      </span>
                    )}
                  </td>
                  <td
                    className={
                      "px-4 py-3 font-mono " +
                      (e.superseded
                        ? "text-navy/40 line-through"
                        : "text-navy/70")
                    }
                  >
                    {formatMadrid(e.timestamp)}
                  </td>
                  {!isEmployee && (
                    <td className="px-4 py-3 text-sm">
                      {e.lat !== null && e.lng !== null ? (
                        <a
                          href={`https://www.google.com/maps?q=${e.lat},${e.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-pulse underline-offset-2 hover:underline"
                          title={
                            e.accuracy !== null
                              ? `Precisión ≈ ${Math.round(e.accuracy)} m`
                              : undefined
                          }
                        >
                          Ver mapa
                        </a>
                      ) : (
                        <span className="text-navy/30">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {e.superseded ? (
                      <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-medium text-navy/50">
                        Sustituida
                      </span>
                    ) : e.isCorrection ? (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                        Corrección
                      </span>
                    ) : null}
                  </td>
                  {canCorrect && (
                    <td className="px-4 py-3">
                      {!e.superseded && (
                        <CorreccionDialog
                          mode="correct"
                          employeeId={e.employeeId}
                          employeeName={e.employeeName}
                          defaultType={e.type}
                          defaultLocal={madridDatetimeLocalValue(e.timestamp)}
                          correctsId={e.id}
                        />
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
