import { Prisma } from "@prisma/client";
import { withTenant } from "@/lib/tenant";
import type { EmployeeInput } from "@/lib/validation";

export class EmployeeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmployeeError";
  }
}

/** Lista todos los empleados de la empresa (activos primero, luego por nombre). */
export function listEmployees(companyId: string) {
  return withTenant(companyId, (tx) =>
    tx.employee.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] }),
  );
}

/** Crea un empleado. Email único dentro de la empresa (constraint compuesta). */
export async function createEmployee(companyId: string, input: EmployeeInput) {
  try {
    return await withTenant(companyId, (tx) =>
      tx.employee.create({
        data: { companyId, name: input.name, email: input.email, active: true },
      }),
    );
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new EmployeeError(
        "Ya existe un empleado con ese email en esta empresa.",
      );
    }
    throw err;
  }
}

/**
 * Activa o desactiva un empleado. NO se borra para conservar su histórico de
 * fichajes. Usamos updateMany para detectar (count=0) un id que no pertenece a
 * la empresa: la RLS lo hace invisible, así que no se tocaría nada.
 */
export async function setEmployeeActive(
  companyId: string,
  employeeId: string,
  active: boolean,
) {
  return withTenant(companyId, async (tx) => {
    const res = await tx.employee.updateMany({
      where: { id: employeeId },
      data: { active },
    });
    if (res.count === 0) {
      throw new EmployeeError("Empleado no encontrado en esta empresa.");
    }
  });
}
