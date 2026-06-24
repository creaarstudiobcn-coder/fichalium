import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Ejecuta `fn` con acceso GLOBAL de superadmin (lectura cross-tenant controlada).
 *
 * Activa el flag acotado `app.superadmin='on'` (SET LOCAL por transacción), que
 * las políticas RLS reconocen para abrir SELECT de `companies`/`subscriptions`,
 * UPDATE de `companies.status` y SELECT/INSERT de `audit_logs`. NO abre filas de
 * `employees`/`time_entries` (los conteos van por la función agregada
 * `superadmin_company_stats`, SECURITY DEFINER).
 *
 * MECANISMO de BD únicamente: la verificación de identidad (rol + lista blanca)
 * se hace SIEMPRE antes con `requireSuperadmin()`.
 */
export async function withSuperadmin<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.superadmin', 'on', true)`;
    return fn(tx);
  });
}
