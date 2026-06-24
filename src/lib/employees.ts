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

/** Estado de la cuenta de autoservicio de un empleado. */
export type AccountStatus = "active" | "invited" | "none";

/**
 * Como `listEmployees`, pero anota el estado de cuenta de cada empleado:
 * "active" (ya tiene User), "invited" (invitación pendiente y vigente) o "none".
 * Lo usa la UI de gestión para decidir si ofrecer el botón de invitar.
 */
export async function listEmployeesWithAccountStatus(companyId: string) {
  return withTenant(companyId, async (tx) => {
    const employees = await tx.employee.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });
    const accounts = await tx.user.findMany({
      where: { employeeId: { not: null } },
      select: { employeeId: true },
    });
    const withAccount = new Set(accounts.map((a) => a.employeeId));
    const pending = await tx.invitation.findMany({
      where: { acceptedAt: null, expiresAt: { gt: new Date() } },
      select: { employeeId: true },
    });
    const invited = new Set(pending.map((p) => p.employeeId));

    return employees.map((e) => ({
      ...e,
      accountStatus: (withAccount.has(e.id)
        ? "active"
        : invited.has(e.id)
          ? "invited"
          : "none") as AccountStatus,
    }));
  });
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
