import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/billing/stripe";
import { tramoFor, mrrEurFor } from "@/lib/billing/plans";
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
  time_entry_count: bigint;
  last_entry_at: Date | null;
  pending_invitations: bigint;
  owner_email: string | null;
};

/** Aplana una fila de `superadmin_company_stats()` (bigint → number). */
function statsOf(s: StatsRow | undefined) {
  return {
    employeeCount: Number(s?.employee_count ?? 0),
    activeEmployeeCount: Number(s?.active_employee_count ?? 0),
    userCount: Number(s?.user_count ?? 0),
    timeEntryCount: Number(s?.time_entry_count ?? 0),
    lastEntryAt: s?.last_entry_at ?? null,
    pendingInvitations: Number(s?.pending_invitations ?? 0),
    ownerEmail: s?.owner_email ?? null,
  };
}

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

    return companies.map((c) => ({
      ...c,
      ...statsOf(byId.get(c.id)),
      mrrEur: mrrEurFor(c.subscription?.status, c.subscription?.quantity ?? 0),
    }));
  });
}

/** Ficha de UNA empresa: metadatos, suscripción y agregados. Sin PII de empleados. */
export async function getCompanyDetail(companyId: string) {
  const base = stripeDashboardBase();
  return withSuperadmin(async (tx) => {
    const company = await tx.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        stripeCustomerId: true,
        subscription: true,
      },
    });
    if (!company) return null;

    const stats =
      await tx.$queryRaw<StatsRow[]>`SELECT * FROM superadmin_company_stats()`;
    const s = stats.find((r) => r.company_id === companyId);

    const audit = await tx.auditLog.findMany({
      where: { targetCompanyId: companyId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const sub = company.subscription;
    return {
      ...company,
      ...statsOf(s),
      mrrEur: mrrEurFor(sub?.status, sub?.quantity ?? 0),
      tramoLabel: sub ? tramoFor(sub.quantity).label : null,
      customerUrl: company.stripeCustomerId
        ? `${base}/customers/${company.stripeCustomerId}`
        : null,
      subscriptionUrl: sub ? `${base}/subscriptions/${sub.stripeSubscriptionId}` : null,
      audit,
    };
  });
}

/** Log de auditoría de plataforma (acciones del superadmin). */
export async function listAuditLog(limit = 200) {
  return withSuperadmin((tx) =>
    tx.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { targetCompany: { select: { name: true } } },
    }),
  );
}

type DriftRow = {
  company_id: string;
  company_name: string;
  sub_status: string;
  billed_quantity: number;
  actual_active: bigint;
};

/**
 * Empresas cuya suscripción factura un número de empleados distinto del real.
 *
 * No es una alerta teórica: si el PATCH a Stripe de `syncQuantity` falla, Stripe
 * no cambia nada y por tanto NO emite webhook, así que nada reconcilia solo. Cada
 * fila aquí es dinero mal facturado hasta que alguien actúe.
 */
export async function listBillingDrift() {
  return withSuperadmin(async (tx) => {
    const rows =
      await tx.$queryRaw<DriftRow[]>`SELECT * FROM superadmin_billing_drift()`;
    return rows.map((r) => ({
      companyId: r.company_id,
      companyName: r.company_name,
      subStatus: r.sub_status,
      billedQuantity: r.billed_quantity,
      actualActive: Number(r.actual_active),
      billedEur: tramoFor(r.billed_quantity).eur,
      correctEur: tramoFor(Number(r.actual_active)).eur,
    }));
  });
}

/**
 * Métricas de plataforma. El MRR sigue siendo ESTIMADO (se calcula sobre el
 * `quantity` cacheado y la tabla local de tramos), pero ya no mezcla peras con
 * manzanas: `mrrEur` cuenta SOLO lo que se cobra hoy. Las pruebas van aparte en
 * `trialingCompanies` (facturan 0 €) y los impagos en `mrrAtRiskEur`.
 */
export async function getMetrics() {
  return withSuperadmin(async (tx) => {
    const [totalCompanies, byStatus, subs] = await Promise.all([
      tx.company.count(),
      tx.company.groupBy({ by: ["status"], _count: true }),
      tx.subscription.findMany({ select: { status: true, quantity: true } }),
    ]);

    const active = subs.filter((s) => s.status === "active");
    const trialing = subs.filter((s) => s.status === "trialing");
    const atRisk = subs.filter(
      (s) => s.status === "past_due" || s.status === "unpaid",
    );

    const sumMrr = (rows: typeof subs) =>
      rows.reduce((sum, s) => sum + tramoFor(s.quantity).eur, 0);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentSignups = await tx.company.count({
      where: { createdAt: { gte: since } },
    });

    const countOf = (status: string) =>
      byStatus.find((r) => r.status === status)?._count ?? 0;

    return {
      totalCompanies,
      activeCompanies: countOf("ACTIVE"),
      suspendedCompanies: countOf("SUSPENDED"),
      closedCompanies: countOf("CLOSED"),
      payingCompanies: active.length,
      mrrEur: sumMrr(active), // solo status "active"
      trialingCompanies: trialing.length,
      mrrInTrialEur: sumMrr(trialing), // lo que entraría si convierten
      atRiskCompanies: atRisk.length,
      mrrAtRiskEur: sumMrr(atRisk), // past_due / unpaid
      // Empresas sin suscripción: registradas pero que no pueden usar el producto.
      withoutSubscription: totalCompanies - subs.length,
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
