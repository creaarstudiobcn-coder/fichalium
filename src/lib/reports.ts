import type { Prisma, TimeEntryType } from "@prisma/client";
import { withTenant } from "@/lib/tenant";
import { madridDayKey, madridWallTimeToUtc } from "@/lib/datetime";

/** Filtros del informe. Las fechas son días naturales españoles ("YYYY-MM-DD"). */
export type ReportFilters = {
  employeeId?: string;
  from?: string;
  to?: string;
};

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normaliza filtros provenientes de la URL (searchParams). Ignora valores vacíos
 * o con formato de fecha inválido para no romper el rango (y evitar inyección
 * de cadenas raras en `madridWallTimeToUtc`).
 */
export function parseReportFilters(
  params: Record<string, string | string[] | undefined>,
): ReportFilters {
  const pick = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

  const employeeId = pick(params.employeeId);
  const from = pick(params.from);
  const to = pick(params.to);

  return {
    employeeId,
    from: from && ISO_DAY.test(from) ? from : undefined,
    to: to && ISO_DAY.test(to) ? to : undefined,
  };
}

/** Una fila del historial, ya resuelta con el nombre del empleado. */
export type ReportEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: TimeEntryType;
  timestamp: Date;
  /** true si este registro corrige a otro (tiene corrects_id). */
  isCorrection: boolean;
};

/** Lo mínimo que necesita el emparejado de horas. */
export type PairableEntry = Pick<
  ReportEntry,
  "employeeId" | "employeeName" | "type" | "timestamp"
>;

/** Un tramo trabajado (entrada→salida). `out` null = turno aún en curso. */
export type WorkPair = { in: Date; out: Date | null; ongoing: boolean };

/** Horas trabajadas por un empleado en un día natural español. */
export type DayHours = {
  employeeId: string;
  employeeName: string;
  /** Clave de día "YYYY-MM-DD" en Europe/Madrid. */
  day: string;
  minutes: number;
  pairs: WorkPair[];
};

/**
 * Empareja entradas con salidas y suma minutos trabajados por empleado y día.
 * FUNCIÓN PURA (sin BD): recibe los fichajes y devuelve el desglose. El día se
 * imputa al de la ENTRADA (un turno que cruza medianoche cuenta en su inicio).
 *
 * - Recorre los fichajes de cada empleado en orden cronológico ascendente.
 * - Una ENTRADA abre un tramo; la siguiente SALIDA lo cierra.
 * - ENTRADA con un tramo ya abierto → se ignora (no debería ocurrir; el
 *   servidor impide dos entradas seguidas). SALIDA sin entrada previa → se
 *   ignora (no se puede medir).
 * - Si al final queda un tramo abierto y se pasa `openEnd` (p. ej. "ahora"),
 *   se cuenta hasta ahí y se marca `ongoing`; sin `openEnd`, cuenta 0 minutos.
 */
export function computeDailyHours(
  entries: PairableEntry[],
  opts: { openEnd?: Date } = {},
): DayHours[] {
  // Agrupamos por empleado conservando el nombre.
  const byEmployee = new Map<string, { name: string; rows: PairableEntry[] }>();
  for (const e of entries) {
    const g = byEmployee.get(e.employeeId);
    if (g) g.rows.push(e);
    else byEmployee.set(e.employeeId, { name: e.employeeName, rows: [e] });
  }

  // Acumulador por (empleado|día).
  const days = new Map<string, DayHours>();
  const keyOf = (employeeId: string, day: string) => `${employeeId}|${day}`;

  for (const [employeeId, { name, rows }] of byEmployee) {
    const sorted = [...rows].sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );

    let openIn: Date | null = null;
    const pushPair = (start: Date, end: Date | null, ongoing: boolean) => {
      const day = madridDayKey(start);
      const k = keyOf(employeeId, day);
      let bucket = days.get(k);
      if (!bucket) {
        bucket = { employeeId, employeeName: name, day, minutes: 0, pairs: [] };
        days.set(k, bucket);
      }
      bucket.pairs.push({ in: start, out: end, ongoing });
      if (end) {
        bucket.minutes += Math.max(0, (end.getTime() - start.getTime()) / 60000);
      }
    };

    for (const row of sorted) {
      if (row.type === "CLOCK_IN") {
        if (openIn === null) openIn = row.timestamp;
        // si ya había uno abierto, ignoramos esta entrada espuria
      } else {
        // CLOCK_OUT
        if (openIn !== null) {
          pushPair(openIn, row.timestamp, false);
          openIn = null;
        }
        // salida sin entrada → se ignora
      }
    }

    // Tramo que quedó abierto al final del periodo.
    if (openIn !== null) {
      pushPair(openIn, opts.openEnd ?? null, true);
    }
  }

  // Orden estable: por nombre de empleado y luego por día.
  return [...days.values()].sort(
    (a, b) =>
      a.employeeName.localeCompare(b.employeeName, "es") ||
      a.day.localeCompare(b.day),
  );
}

/** Construye el `where` Prisma a partir de los filtros (rango en UTC ya resuelto). */
function buildWhere(
  filters: ReportFilters,
  range: { gte?: Date; lte?: Date },
): Prisma.TimeEntryWhereInput {
  const where: Prisma.TimeEntryWhereInput = {};
  if (filters.employeeId) where.employeeId = filters.employeeId;
  if (range.gte || range.lte) {
    where.timestamp = {};
    if (range.gte) where.timestamp.gte = range.gte;
    if (range.lte) where.timestamp.lte = range.lte;
  }
  return where;
}

/** Traduce los filtros de día español a límites UTC para comparar timestamps. */
function resolveRange(filters: ReportFilters): { gte?: Date; lte?: Date } {
  const range: { gte?: Date; lte?: Date } = {};
  if (filters.from) range.gte = madridWallTimeToUtc(`${filters.from}T00:00:00`);
  if (filters.to) range.lte = madridWallTimeToUtc(`${filters.to}T23:59:59.999`);
  return range;
}

export type Report = {
  entries: ReportEntry[];
  dailyHours: DayHours[];
};

/**
 * Historial de fichajes de la empresa (filtrado) + horas por día.
 *
 * Pasa por `withTenant`: la RLS garantiza que solo se ven los fichajes de esta
 * empresa. Las filas se devuelven del más reciente al más antiguo para la
 * tabla; el cálculo de horas reordena por su cuenta.
 *
 * Correcciones: un registro corregido (al que apunta otro vía corrects_id) se
 * EXCLUYE del cálculo de horas para no contar doble; la corrección lo sustituye.
 * En la tabla se muestran todos, marcando las correcciones.
 */
export async function getReport(
  companyId: string,
  filters: ReportFilters = {},
): Promise<Report> {
  const range = resolveRange(filters);
  const where = buildWhere(filters, range);

  return withTenant(companyId, async (tx) => {
    const rows = await tx.timeEntry.findMany({
      where,
      orderBy: [{ timestamp: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        employeeId: true,
        type: true,
        timestamp: true,
        correctsId: true,
        employee: { select: { name: true } },
      },
    });

    const entries: ReportEntry[] = rows.map((r) => ({
      id: r.id,
      employeeId: r.employeeId,
      employeeName: r.employee.name,
      type: r.type,
      timestamp: r.timestamp,
      isCorrection: r.correctsId !== null,
    }));

    // Ids que han sido corregidos por otro registro → se sustituyen.
    const supersededIds = new Set(
      rows.map((r) => r.correctsId).filter((id): id is string => id !== null),
    );
    const forHours: PairableEntry[] = rows
      .filter((r) => !supersededIds.has(r.id))
      .map((r) => ({
        employeeId: r.employeeId,
        employeeName: r.employee.name,
        type: r.type,
        timestamp: r.timestamp,
      }));

    return { entries, dailyHours: computeDailyHours(forHours) };
  });
}

/** Resumen de hoy por empleado: minutos trabajados (turno abierto hasta `now`). */
export type TodaySummary = {
  employeeId: string;
  employeeName: string;
  minutes: number;
  ongoing: boolean;
};

/**
 * Minutos trabajados HOY (día natural español) por cada empleado. Cuenta los
 * tramos cerrados y, si hay un turno abierto, hasta el instante `now`. Pensado
 * para el resumen rápido del panel.
 */
export async function todayHoursByEmployee(
  companyId: string,
  now: Date = new Date(),
): Promise<TodaySummary[]> {
  const todayKey = madridDayKey(now);
  const report = await getReport(companyId, { from: todayKey, to: todayKey });
  const today = computeDailyHours(
    report.entries.map((e) => ({
      employeeId: e.employeeId,
      employeeName: e.employeeName,
      type: e.type,
      timestamp: e.timestamp,
    })),
    { openEnd: now },
  );
  return today.map((d) => ({
    employeeId: d.employeeId,
    employeeName: d.employeeName,
    minutes: d.minutes,
    ongoing: d.pairs.some((p) => p.ongoing),
  }));
}
