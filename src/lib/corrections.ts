import type { TimeEntryType } from "@prisma/client";
import { withTenant } from "@/lib/tenant";
import { madridWallTimeToUtc } from "@/lib/datetime";

export class CorreccionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CorreccionError";
  }
}

export type CorreccionInput = {
  employeeId: string;
  type: TimeEntryType;
  /** Hora de pared española del `datetime-local`: "YYYY-MM-DDTHH:mm". */
  timestampLocal: string;
  reason: string;
  /**
   * Id del fichaje que se corrige. Si viene, esta corrección SUSTITUYE a ese
   * registro (y `getReport` lo excluye del cálculo de horas). Si es null, es un
   * fichaje añadido a mano (p. ej. la salida que se olvidó) que no sustituye a
   * ninguno.
   */
  correctsId?: string | null;
};

const WALL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Registra una corrección o un fichaje manual. Es un INSERT append-only: nunca
 * se toca el registro original (el trigger lo impide); la corrección es un nuevo
 * time_entry con `correctsId`, `reason`, `createdBy` (el gestor) y el momento
 * elegido. Sin ubicación (es una edición manual, no un fichaje con GPS).
 *
 * Reglas: motivo obligatorio; hora válida y no futura; si `correctsId` viene, el
 * fichaje debe existir, ser del mismo empleado y NO estar ya corregido (se
 * corrige siempre el registro vigente). El aislamiento por empresa lo da la RLS.
 */
export async function registrarCorreccion(
  companyId: string,
  createdBy: string,
  input: CorreccionInput,
) {
  const reason = input.reason.trim();
  if (reason.length < 3) {
    throw new CorreccionError("Indica el motivo de la corrección.");
  }
  if (input.type !== "CLOCK_IN" && input.type !== "CLOCK_OUT") {
    throw new CorreccionError("Tipo de fichaje no válido.");
  }
  if (!WALL.test(input.timestampLocal)) {
    throw new CorreccionError("Fecha y hora no válidas.");
  }

  const timestamp = madridWallTimeToUtc(`${input.timestampLocal}:00`);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new CorreccionError("Fecha y hora no válidas.");
  }
  // Tolerancia de 1 min para relojes desincronizados; nunca fichajes futuros.
  if (timestamp.getTime() > Date.now() + 60_000) {
    throw new CorreccionError("La fecha y hora no pueden ser futuras.");
  }

  return withTenant(companyId, async (tx) => {
    const employee = await tx.employee.findUnique({
      where: { id: input.employeeId },
    });
    if (!employee) {
      throw new CorreccionError("Empleado no encontrado en esta empresa.");
    }

    let correctsId: string | null = null;
    if (input.correctsId) {
      const target = await tx.timeEntry.findUnique({
        where: { id: input.correctsId },
      });
      if (!target || target.employeeId !== input.employeeId) {
        throw new CorreccionError("El fichaje a corregir no existe.");
      }
      const alreadyCorrected = await tx.timeEntry.findFirst({
        where: { correctsId: input.correctsId },
        select: { id: true },
      });
      if (alreadyCorrected) {
        throw new CorreccionError(
          "Ese fichaje ya se corrigió; corrige el registro vigente.",
        );
      }
      correctsId = input.correctsId;
    }

    return tx.timeEntry.create({
      data: {
        companyId,
        employeeId: input.employeeId,
        type: input.type,
        timestamp,
        reason,
        correctsId,
        createdBy,
        // Sin geo: es una corrección manual, no un fichaje con ubicación.
      },
    });
  });
}
