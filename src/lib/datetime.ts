// Los timestamps se guardan SIEMPRE en UTC (timestamptz). Aquí los formateamos
// para mostrarlos en hora de España. Intl + zona "Europe/Madrid" aplica solo el
// cambio verano/invierno (CET/CEST) automáticamente.
const MADRID = "Europe/Madrid";

/** Fecha + hora, p. ej. "23 jun 2026, 14:05". */
export function formatMadrid(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: MADRID,
  }).format(date);
}

/** Solo la hora, p. ej. "14:05". */
export function formatMadridTime(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: MADRID,
  }).format(date);
}

/** Solo la fecha, p. ej. "23 jun 2026". */
export function formatMadridDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeZone: MADRID,
  }).format(date);
}

/**
 * Clave de día natural en Madrid, formato "YYYY-MM-DD". Se usa para agrupar
 * fichajes por día: dos instantes UTC distintos que caen en el mismo día
 * español comparten clave (el locale en-CA produce ISO yyyy-mm-dd).
 */
export function madridDayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: MADRID,
  }).format(date);
}

/**
 * Convierte una hora "de pared" española (sin zona, p. ej. "2026-06-01T00:00:00")
 * al instante UTC equivalente. Lo usamos para traducir los filtros de fecha
 * (que el usuario piensa en hora local) a los límites UTC con que se comparan
 * los timestamps guardados. Aplica el offset CET/CEST vigente en esa fecha.
 */
export function madridWallTimeToUtc(wall: string): Date {
  // Interpretamos la pared como si fuese UTC, medimos cuánto se desvía esa
  // misma marca al mostrarse en Madrid, y restamos ese offset.
  const asIfUtc = new Date(`${wall}Z`);
  const shown = new Date(asIfUtc.toLocaleString("en-US", { timeZone: MADRID }));
  const utc = new Date(asIfUtc.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = shown.getTime() - utc.getTime();
  return new Date(asIfUtc.getTime() - offsetMs);
}

/** Minutos → "7h 30min" (o "45min" / "0min"). */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}min`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}min`;
}
