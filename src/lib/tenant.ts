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

/**
 * Búsqueda de invitación por hash de token para la ACEPTACIÓN (alta de cuenta
 * del empleado). Igual que el login, es legítimamente cross-tenant: aún no hay
 * sesión, así que no conocemos la empresa hasta leer la invitación. Activa el
 * flag acotado `app.invite_accept`, que SOLO abre la lectura de `invitations`
 * (nunca users/employees/time_entries). No se usa en ningún otro sitio del
 * runtime. Las escrituras posteriores van por `withTenant(companyId)`.
 */
export async function findInvitationByToken(tokenHash: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.invite_accept', 'on', true)`;
    return tx.invitation.findUnique({ where: { tokenHash } });
  });
}

/**
 * Resuelve la empresa de una suscripción para el WEBHOOK de Stripe, que llega
 * sin sesión (cross-tenant). Activa el flag acotado `app.stripe_sync`, que SOLO
 * abre la lectura de `subscriptions`. Camino de respaldo: el webhook prioriza
 * `metadata.companyId`/`client_reference_id`; esto cubre eventos que solo traen
 * el customer/subscription id (p. ej. facturas). No se usa fuera del webhook.
 */
export async function findCompanyIdByStripe(args: {
  customerId?: string;
  subscriptionId?: string;
}): Promise<string | null> {
  if (!args.customerId && !args.subscriptionId) return null;
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.stripe_sync', 'on', true)`;
    const sub = await tx.subscription.findFirst({
      where: args.subscriptionId
        ? { stripeSubscriptionId: args.subscriptionId }
        : { stripeCustomerId: args.customerId },
      select: { companyId: true },
    });
    return sub?.companyId ?? null;
  });
}
