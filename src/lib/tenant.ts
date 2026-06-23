import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Ejecuta `fn` dentro de una transacción con el contexto de tenant fijado.
 *
 * Hace `SET LOCAL app.current_company = <companyId>` (vía set_config, que sí
 * acepta parámetros y evita inyección) al inicio de la transacción. A partir de
 * ahí, las políticas RLS de Postgres filtran TODAS las queries por company_id.
 *
 * REGLA DEL PROYECTO: toda query con datos de cliente (employees, time_entries,
 * la propia company y users) pasa por aquí. Sin contexto de tenant, las tablas
 * de negocio devuelven 0 filas (fail-closed).
 *
 * `set_config(name, value, is_local=true)` => equivalente a SET LOCAL: el valor
 * solo vive durante esta transacción y en esta conexión (compatible con el
 * pooler PgBouncer de Neon en modo transacción).
 */
export async function withTenant<T>(
  companyId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (!companyId) {
    throw new Error("withTenant: falta companyId (contexto de tenant)");
  }
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_company', ${companyId}, true)`;
    return fn(tx);
  });
}

/**
 * Búsqueda de usuario por email para el LOGIN. Es la única operación
 * legítimamente cross-tenant (todavía no sabemos a qué empresa pertenece quien
 * intenta entrar). Activa el flag acotado `app.bootstrap` que SOLO abre la
 * lectura de la tabla `users` (nunca employees/time_entries). No se usa en
 * ningún otro sitio del runtime.
 */
export async function findUserForLogin(email: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.bootstrap', 'on', true)`;
    return tx.user.findUnique({ where: { email } });
  });
}
