import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { RegisterInput } from "@/lib/validation";

/** Error de negocio del registro (p. ej. email ya en uso). */
export class RegisterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegisterError";
  }
}

/**
 * Registra una nueva empresa y su usuario propietario en una sola transacción.
 *
 * Bajo RLS forzada, crear un tenant es un caso especial: NO hay contexto de
 * tenant previo. Lo resolvemos generando el `companyId` en código y fijándolo
 * como contexto ANTES de insertar; así el WITH CHECK de las políticas de
 * `companies` (id = ctx) y `users` (company_id = ctx) pasa. No hay bypass de
 * RLS: solo puedes "bootstrapear" exactamente la empresa que estás creando.
 *
 * La unicidad de email se delega al índice único de la BD (P2002): bajo RLS un
 * pre-check por email no vería filas de otros tenants.
 */
export async function registerCompany(input: RegisterInput) {
  const email = input.email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(input.password, 12);
  const companyId = randomUUID();

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.current_company', ${companyId}, true)`;

      const company = await tx.company.create({
        data: { id: companyId, name: input.companyName.trim() },
      });

      const user = await tx.user.create({
        data: {
          email,
          name: input.name.trim(),
          passwordHash,
          companyId,
          role: "OWNER",
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          companyId: true,
        },
      });

      return { company, user };
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new RegisterError("Ya existe una cuenta con ese email");
    }
    throw err;
  }
}
