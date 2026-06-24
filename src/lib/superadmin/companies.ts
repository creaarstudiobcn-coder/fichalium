import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/billing/stripe";
import { tramoFor, isActive } from "@/lib/billing/plans";
import { withSuperadmin } from "./db";
import type { SuperadminActor } from "./guard";

export class SuperadminError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SuperadminError";
  }
}

type AuditAction = "SUSPEND" | "UNSUSPEND" | "CLOSE" | "PURGE";

/** Inserta una entrada de auditoría (debe ir dentro de un withSuperadmin). */
async function writeAudit(
  tx: Prisma.TransactionClient,
  actor: SuperadminActor,
  action: AuditAction,
  targetCompanyId: string | null,
  details: Prisma.InputJsonValue,
) {
  await tx.auditLog.create({
    data: {
      actorUserId: actor.userId,
      actorEmail: actor.email,
      action,
      targetCompanyId,
      details,
    },
  });
}

/** Base del dashboard de Stripe según el modo de la clave (test/live). */
export function stripeDashboardBase(): string {
  return (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test")
    ? "https://dashboard.stripe.com/test"
    : "https://dashboard.stripe.com";
}

type StatsRow = {
  company_id: string;
  employee_count: bigint;
  active_employee_count: bigint;
  user_count: bigint;
};

/** Lista todas las empresas con estado, su suscripción y conteos agregados. */
export async function listCompanies() {
  return withSuperadmin(async (tx) => {
    const companies = await tx.company.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        stripeCustomerId: true,
        subscription: {
          select: {
            status: true,
            quantity: true,
            currentPeriodEnd: true,
            cancelAtPeriodEnd: true,
            stripeSubscriptionId: true,
          },
        },
      },
    });

    // Conteos por empresa sin exponer filas de empleados (función agregada).
    const stats =
      await tx.$queryRaw<StatsRow[]>`SELECT * FROM superadmin_company_stats()`;
    const byId = new Map(stats.map((s) => [s.company_id, s]));

    return companies.map((c) => {
      const s = byId.get(c.id);
      return {
        ...c,
        employeeCount: Number(s?.employee_count ?? 0),
        activeEmployeeCount: Number(s?.active_employee_count ?? 0),
        userCount: Number(s?.user_count ?? 0),
      };
    });
  });
}

/** Métricas de plataforma. El MRR es ESTIMADO (tramo × subs activas). */
export async function getMetrics() {
  return withSuperadmin(async (tx) => {
    const totalCompanies = await tx.company.count();
    const subs = await tx.subscription.findMany({
      select: { status: true, quantity: true },
    });
    const paying = subs.filter((s) => isActive(s.status));
    const mrrEur = paying.reduce((sum, s) => sum + tramoFor(s.quantity).eur, 0);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSignups = await tx.company.count({
      where: { createdAt: { gte: since } },
    });

    return {
      totalCompanies,
      payingCompanies: paying.length,
      mrrEur, // estimado — ver Stripe para el importe exacto
      recentSignups,
    };
  });
}

/** Suscripciones globales con enlace a Stripe (sin edición de importes). */
export async function listSubscriptions() {
  const base = stripeDashboardBase();
  return withSuperadmin(async (tx) => {
    const subs = await tx.subscription.findMany({
      orderBy: { updatedAt: "desc" },
      include: { company: { select: { name: true, status: true } } },
    });
    return subs.map((s) => ({
      companyName: s.company.name,
      companyStatus: s.company.status,
      status: s.status,
      quantity: s.quantity,
      tramoEur: tramoFor(s.quantity).eur,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      customerUrl: `${base}/customers/${s.stripeCustomerId}`,
      subscriptionUrl: `${base}/subscriptions/${s.stripeSubscriptionId}`,
    }));
  });
}

/** Suspende una empresa (bloquea TODO su panel). No toca Stripe. */
export async function suspendCompany(companyId: string, actor: SuperadminActor) {
  await withSuperadmin(async (tx) => {
    const c = await tx.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (!c) throw new SuperadminError("Empresa no encontrada.");
    await tx.company.update({
      where: { id: companyId },
      data: { status: "SUSPENDED" },
    });
    await writeAudit(tx, actor, "SUSPEND", companyId, { name: c.name });
  });
}

/** Reactiva una empresa suspendida. */
export async function unsuspendCompany(
  companyId: string,
  actor: SuperadminActor,
) {
  await withSuperadmin(async (tx) => {
    const c = await tx.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (!c) throw new SuperadminError("Empresa no encontrada.");
    await tx.company.update({
      where: { id: companyId },
      data: { status: "ACTIVE" },
    });
    await writeAudit(tx, actor, "UNSUSPEND", companyId, { name: c.name });
  });
}

/** Da de baja: cancela la suscripción en Stripe y marca CLOSED (conserva datos). */
export async function closeCompany(companyId: string, actor: SuperadminActor) {
  const sub = await withSuperadmin((tx) =>
    tx.subscription.findUnique({
      where: { companyId },
      select: { stripeSubscriptionId: true },
    }),
  );

  // Cancela en Stripe (best-effort): el webhook reflejará el canceled.
  let stripeCanceled = false;
  if (sub?.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.cancel(sub.stripeSubscriptionId);
      stripeCanceled = true;
    } catch (err) {
      console.error("closeCompany: fallo al cancelar en Stripe:", err);
    }
  }

  await withSuperadmin(async (tx) => {
    const c = await tx.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });
    if (!c) throw new SuperadminError("Empresa no encontrada.");
    await tx.company.update({
      where: { id: companyId },
      data: { status: "CLOSED" },
    });
    await writeAudit(tx, actor, "CLOSE", companyId, {
      name: c.name,
      stripeCanceled,
    });
  });
}

/**
 * Borrado físico RGPD (irreversible). Audita ANTES (con el nombre en details,
 * que sobrevive porque el FK del log es SetNull) y luego purga en orden FK-safe
 * con `app.allow_purge` (única vía de DELETE sobre time_entries append-only).
 */
export async function purgeCompany(
  companyId: string,
  actor: SuperadminActor,
  expectedName: string,
) {
  const company = await withSuperadmin((tx) =>
    tx.company.findUnique({ where: { id: companyId }, select: { name: true } }),
  );
  if (!company) throw new SuperadminError("Empresa no encontrada.");
  // Doble confirmación también en servidor: el nombre escrito debe coincidir.
  if (expectedName.trim() !== company.name) {
    throw new SuperadminError("El nombre no coincide. Purga cancelada.");
  }

  await withSuperadmin((tx) =>
    writeAudit(tx, actor, "PURGE", companyId, { name: company.name }),
  );

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_company', ${companyId}, true)`;
    await tx.$executeRaw`SELECT set_config('app.allow_purge', 'on', true)`;
    await tx.timeEntry.deleteMany({ where: { companyId } });
    await tx.employee.deleteMany({ where: { companyId } });
    await tx.user.deleteMany({ where: { companyId } });
    // Borrar la empresa cascadea subscriptions/invitations; el FK del audit_log
    // es SetNull, así que la entrada de PURGE se conserva (con el nombre).
    await tx.company.delete({ where: { id: companyId } });
  });
}
