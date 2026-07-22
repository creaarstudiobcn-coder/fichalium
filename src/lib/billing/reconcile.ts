import { withSuperadmin } from "@/lib/superadmin/db";
import { withTenant } from "@/lib/tenant";
import { getStripe } from "./stripe";
import { isActive } from "./plans";

/**
 * Reconciliación periódica del `quantity` facturado en Stripe con el número real
 * de empleados activos (cobro por tramos).
 *
 * POR QUÉ EXISTE: `syncQuantity()` es best-effort. Si su PATCH a Stripe falla,
 * Stripe no cambia nada y por tanto NO emite webhook, así que nada reconcilia
 * solo → infrafacturación (o sobrefacturación) permanente. Este trabajo cierra
 * ese hueco: recorre las suscripciones activas, compara contra Stripe (la fuente
 * de verdad del cobro) y corrige tanto Stripe como la caché local.
 */

/** Decisión PURA por suscripción: qué hay que tocar. Testeable sin red ni BD. */
export function reconcileDecision(
  actualActive: number,
  stripeQuantity: number,
  cachedQuantity: number,
): { targetQuantity: number; updateStripe: boolean; updateCache: boolean } {
  const target = Math.max(0, actualActive);
  return {
    targetQuantity: target,
    updateStripe: stripeQuantity !== target,
    updateCache: cachedQuantity !== target,
  };
}

export type ReconcileRow = {
  companyId: string;
  companyName: string;
  actualActive: number;
  stripeBefore: number;
  cachedBefore: number;
  targetQuantity: number;
  stripeUpdated: boolean;
  cacheUpdated: boolean;
  error?: string;
};

export type ReconcileSummary = {
  checked: number;
  changed: number;
  errors: number;
  rows: ReconcileRow[];
};

/**
 * Reconcilia TODAS las suscripciones activas/trialing. Devuelve un resumen con
 * lo que cambió. Best-effort por empresa: un fallo en una no aborta el resto.
 *
 * Debe llamarse desde un contexto de plataforma (cron con secreto, o acción de
 * superadmin ya verificada): abre lectura global con `withSuperadmin`.
 */
export async function reconcileSubscriptionQuantities(): Promise<ReconcileSummary> {
  const subs = await withSuperadmin((tx) =>
    tx.subscription.findMany({
      select: {
        companyId: true,
        stripeItemId: true,
        status: true,
        quantity: true,
        company: { select: { name: true } },
      },
    }),
  );
  const active = subs.filter((s) => isActive(s.status) && s.stripeItemId);

  const stripe = getStripe();
  const rows: ReconcileRow[] = [];

  for (const s of active) {
    const row: ReconcileRow = {
      companyId: s.companyId,
      companyName: s.company.name,
      actualActive: 0,
      stripeBefore: s.quantity,
      cachedBefore: s.quantity,
      targetQuantity: s.quantity,
      stripeUpdated: false,
      cacheUpdated: false,
    };
    try {
      const actual = await withTenant(s.companyId, (tx) =>
        tx.employee.count({ where: { active: true } }),
      );
      const item = await stripe.subscriptionItems.retrieve(s.stripeItemId);
      const stripeQty = item.quantity ?? 0;

      row.actualActive = actual;
      row.stripeBefore = stripeQty;

      const d = reconcileDecision(actual, stripeQty, s.quantity);
      row.targetQuantity = d.targetQuantity;

      if (d.updateStripe) {
        await stripe.subscriptionItems.update(s.stripeItemId, {
          quantity: d.targetQuantity,
          proration_behavior: "create_prorations",
        });
        row.stripeUpdated = true;
      }
      if (d.updateCache) {
        await withTenant(s.companyId, (tx) =>
          tx.subscription.update({
            where: { companyId: s.companyId },
            data: { quantity: d.targetQuantity },
          }),
        );
        row.cacheUpdated = true;
      }
    } catch (err) {
      row.error = err instanceof Error ? err.message : String(err);
    }

    if (row.stripeUpdated || row.cacheUpdated || row.error) rows.push(row);
  }

  return {
    checked: active.length,
    changed: rows.filter((r) => (r.stripeUpdated || r.cacheUpdated) && !r.error)
      .length,
    errors: rows.filter((r) => r.error).length,
    rows,
  };
}
