import type { Prisma, TimeEntryType } from "@prisma/client";
import { withTenant } from "@/lib/tenant";

export class FichajeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FichajeError";
  }
}

/** Dado el último fichaje, ¿cuál toca ahora? Sin fichajes → ENTRADA. */
export function nextType(lastType: TimeEntryType | null): TimeEntryType {
  return lastType === "CLOCK_IN" ? "CLOCK_OUT" : "CLOCK_IN";
}

/** Último fichaje de un empleado (por timestamp; desempate por created_at). */
function lastEntry(tx: Prisma.TransactionClient, employeeId: string) {
  return tx.timeEntry.findFirst({
    where: { employeeId },
    orderBy: [{ timestamp: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Registra un fichaje (INSERT append-only). Valida en servidor que el tipo
 * pedido es el que toca: impide dos ENTRADAS seguidas (o dos SALIDAS). El tipo
 * esperado se calcula a partir del último fichaje, no se confía en el cliente.
 */
export async function clock(
  companyId: string,
  employeeId: string,
  createdBy: string,
  requestedType: TimeEntryType,
) {
  return withTenant(companyId, async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new FichajeError("Empleado no encontrado en esta empresa.");
    }
    if (!employee.active) {
      throw new FichajeError("El empleado está desactivado.");
    }

    const last = await lastEntry(tx, employeeId);
    const expected = nextType(last?.type ?? null);
    if (requestedType !== expected) {
      throw new FichajeError(
        expected === "CLOCK_IN"
          ? "El empleado está fuera: el siguiente fichaje debe ser una ENTRADA."
          : "El empleado ya está dentro: el siguiente fichaje debe ser una SALIDA.",
      );
    }

    return tx.timeEntry.create({
      data: {
        companyId,
        employeeId,
        type: requestedType,
        timestamp: new Date(), // UTC
        createdBy,
      },
    });
  });
}

export type EmployeeStatus = {
  employee: { id: string; name: string; email: string };
  isIn: boolean;
  since: Date | null;
  nextType: TimeEntryType;
};

/** Estado actual (dentro/fuera + desde cuándo) de cada empleado activo. */
export async function listEmployeeStatuses(
  companyId: string,
): Promise<EmployeeStatus[]> {
  return withTenant(companyId, async (tx) => {
    const employees = await tx.employee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });

    const statuses: EmployeeStatus[] = [];
    for (const e of employees) {
      const last = await lastEntry(tx, e.id);
      const isIn = last?.type === "CLOCK_IN";
      statuses.push({
        employee: { id: e.id, name: e.name, email: e.email },
        isIn,
        since: isIn ? last!.timestamp : null,
        nextType: nextType(last?.type ?? null),
      });
    }
    return statuses;
  });
}
