"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { withTenant } from "@/lib/tenant";
import { getStripe } from "@/lib/billing/stripe";
import { PRICE_ID, TRIAL_DAYS } from "@/lib/billing/plans";

const baseUrl = () => process.env.AUTH_URL ?? "http://localhost:3000";

/** Solo el OWNER gestiona la suscripción de la empresa. */
async function ownerSession() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") return null;
  return session.user;
}

/** Crea (o reutiliza) el Customer de Stripe de la empresa y lo guarda. */
async function ensureCustomer(user: {
  companyId: string;
  email?: string | null;
}): Promise<string> {
  const company = await withTenant(user.companyId, (tx) =>
    tx.company.findUnique({
      where: { id: user.companyId },
      select: { name: true, stripeCustomerId: true },
    }),
  );
  if (company?.stripeCustomerId) return company.stripeCustomerId;

  const customer = await getStripe().customers.create({
    name: company?.name,
    email: user.email ?? undefined,
    metadata: { companyId: user.companyId },
  });

  await withTenant(user.companyId, (tx) =>
    tx.company.update({
      where: { id: user.companyId },
      data: { stripeCustomerId: customer.id },
    }),
  );
  return customer.id;
}

/** Inicia el Checkout de suscripción (mode: subscription) y redirige a Stripe. */
export async function startCheckoutAction() {
  const user = await ownerSession();
  if (!user) redirect("/dashboard");

  const customerId = await ensureCustomer(user);
  const activeCount = await withTenant(user.companyId, (tx) =>
    tx.employee.count({ where: { active: true } }),
  );

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.companyId,
    // Sin payment_method_types: Stripe elige dinámicamente los métodos.
    line_items: [{ price: PRICE_ID, quantity: Math.max(activeCount, 1) }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { companyId: user.companyId },
    },
    success_url: `${baseUrl()}/dashboard/suscripcion?success=1`,
    cancel_url: `${baseUrl()}/dashboard/suscripcion?canceled=1`,
  });

  redirect(session.url ?? "/dashboard/suscripcion");
}

/** Abre el Customer Portal de Stripe para gestionar/cancelar la suscripción. */
export async function openPortalAction() {
  const user = await ownerSession();
  if (!user) redirect("/dashboard");

  const company = await withTenant(user.companyId, (tx) =>
    tx.company.findUnique({
      where: { id: user.companyId },
      select: { stripeCustomerId: true },
    }),
  );
  if (!company?.stripeCustomerId) redirect("/dashboard/suscripcion");

  const portal = await getStripe().billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${baseUrl()}/dashboard/suscripcion`,
  });
  redirect(portal.url);
}
