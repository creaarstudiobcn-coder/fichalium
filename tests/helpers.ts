import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { registerCompany } from "@/lib/auth/register";

/** ¿Hay una BD real configurada? (no el placeholder de .env.example) */
const url = process.env.DATABASE_URL ?? "";
export const hasDb =
  url.length > 0 && !url.includes("USER:PASSWORD") && !url.includes("@HOST/");

/**
 * Borra por completo un tenant (empresa + usuarios + empleados + fichajes).
 *
 * ⚠️ Activa `app.allow_purge` — el ÚNICO momento en que time_entries admite
 * DELETE. Esto NO se usa en el runtime de la app; solo aquí (teardown de tests)
 * y, en el futuro, para el borrado RGPD. Borra los hijos antes que los padres
 * para no chocar con las FK Restrict.
 */
export async function purgeTenant(companyId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_company', ${companyId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.allow_purge', 'on', true)`;
    await tx.timeEntry.deleteMany({ where: { companyId } });
    await tx.employee.deleteMany({ where: { companyId } });
    await tx.user.deleteMany({ where: { companyId } });
    await tx.company.delete({ where: { id: companyId } });
  });
}

/** Crea una empresa con un empleado y dos fichajes (entrada/salida). */
export async function seedTenant(label: string) {
  const email = `${label}.${crypto.randomUUID()}@example.com`;
  const { company, user } = await registerCompany({
    companyName: `Empresa ${label}`,
    name: `Owner ${label}`,
    email,
    password: "secret123",
  });

  const data = await withTenant(company.id, async (tx) => {
    const employee = await tx.employee.create({
      data: {
        companyId: company.id,
        name: `Empleado ${label}`,
        email: `emp.${crypto.randomUUID()}@example.com`,
      },
    });

    const clockIn = await tx.timeEntry.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "CLOCK_IN",
        timestamp: new Date(),
        createdBy: user.id,
      },
    });

    const clockOut = await tx.timeEntry.create({
      data: {
        companyId: company.id,
        employeeId: employee.id,
        type: "CLOCK_OUT",
        timestamp: new Date(),
        createdBy: user.id,
      },
    });

    return { employee, clockIn, clockOut };
  });

  return { companyId: company.id, ownerId: user.id, ...data };
}
