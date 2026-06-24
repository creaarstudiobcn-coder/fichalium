import type Stripe from "stripe";
import { withTenant, findCompanyIdByStripe } from "@/lib/tenant";
import { getStripe } from "./stripe";
import { isActive } from "./plans";

/** Lee la suscripción cacheada de una empresa (o null si no tiene). */
export function getSubscription(companyId: string) {
  return withTenant(companyId, (tx) =>
    tx.subscription.findUnique({ where: { companyId } }),
  );
}

/** Periodo de facturación: en la API actual vive en el item, con fallback al sub. */
function periodEnd(sub: Stripe.Subscription): Date | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const secs =
    item?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof secs === "number" ? new Date(secs * 1000) : null;
}

/** Normaliza un Stripe.Subscription a las columnas que cacheamos. */
function fieldsFrom(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return {
    stripeSubscriptionId: sub.id,
    stripeCustomerId:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripeItemId: item?.id ?? "",
    status: sub.status,
    priceId: item?.price.id ?? "",
    quantity: item?.quantity ?? 0,
    currentPeriodEnd: periodEnd(sub),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
  };
}

/** Resuelve el companyId de un evento de suscripción (metadata → fallback BD). */
async function resolveCompanyId(sub: Stripe.Subscription): Promise<string | null> {
  const fromMeta = sub.metadata?.companyId;
  if (fromMeta) return fromMeta;
  return findCompanyIdByStripe({
    subscriptionId: sub.id,
    customerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
  });
}

/** Upsert de la suscripción cacheada, fijando el contexto de tenant. */
async function upsert(companyId: string, sub: Stripe.Subscription) {
  const data = fieldsFrom(sub);
  await withTenant(companyId, (tx) =>
    tx.subscription.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    }),
  );
}

/**
 * Aplica un evento de Stripe a nuestra caché de suscripción. PURO respecto a la
 * red y a la verificación de firma (eso lo hace la ruta del webhook): recibe el
 * evento ya parseado y solo escribe en BD. Por eso es testeable sin tocar Stripe.
 *
 * Nos basamos en `customer.subscription.*`, que traen el objeto completo y
 * `metadata.companyId` (lo fijamos en el Checkout). `checkout.session.completed`
 * es un no-op: la creación llega por `customer.subscription.created`.
 */
export async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = await resolveCompanyId(sub);
      if (!companyId) return; // no es una suscripción nuestra
      await upsert(companyId, sub);
      return;
    }
    default:
      return; // resto de eventos: ignorados
  }
}

/**
 * Sincroniza el `quantity` de la suscripción con el nº de empleados activos
 * (cobro por tramos). Best-effort: la BD es la fuente de verdad de la plantilla;
 * si Stripe falla, el webhook de `customer.subscription.updated` reconcilia.
 */
export async function syncQuantity(companyId: string): Promise<void> {
  const [count, sub] = await Promise.all([
    withTenant(companyId, (tx) => tx.employee.count({ where: { active: true } })),
    getSubscription(companyId),
  ]);
  if (!sub || !isActive(sub.status) || sub.quantity === count) return;

  try {
    await getStripe().subscriptionItems.update(sub.stripeItemId, {
      quantity: count,
      proration_behavior: "create_prorations",
    });
    await withTenant(companyId, (tx) =>
      tx.subscription.update({ where: { companyId }, data: { quantity: count } }),
    );
  } catch (err) {
    console.error("syncQuantity falló (se reconciliará por webhook):", err);
  }
}
