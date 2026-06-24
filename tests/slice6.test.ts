import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { withTenant, findCompanyIdByStripe } from "@/lib/tenant";
import { registerCompany } from "@/lib/auth/register";
import { handleStripeEvent, getSubscription } from "@/lib/billing/subscription";
import { isActive, tramoFor } from "@/lib/billing/plans";
import { hasDb, purgeTenant } from "./helpers";

const d = hasDb ? describe : describe.skip;

async function newTenant(label: string) {
  const { company, user } = await registerCompany({
    companyName: `Empresa ${label}`,
    name: `Owner ${label}`,
    email: `${label}.${crypto.randomUUID()}@example.com`,
    password: "secret123",
  });
  return { companyId: company.id, ownerId: user.id };
}

// Construye un objeto con la forma de Stripe.Subscription (lo justo que lee
// `handleStripeEvent`); `metadata.companyId` evita cualquier llamada de red.
function fakeSub(
  companyId: string,
  o: {
    id?: string;
    customer?: string;
    itemId?: string;
    status?: string;
    quantity?: number;
    cancelAtPeriodEnd?: boolean;
  } = {},
) {
  return {
    id: o.id ?? `sub_${crypto.randomUUID()}`,
    customer: o.customer ?? `cus_${crypto.randomUUID()}`,
    status: o.status ?? "trialing",
    cancel_at_period_end: o.cancelAtPeriodEnd ?? false,
    metadata: { companyId },
    items: {
      data: [
        {
          id: o.itemId ?? `si_${crypto.randomUUID()}`,
          price: { id: "price_test" },
          quantity: o.quantity ?? 1,
          current_period_end: 1893456000, // 2030-01-01
        },
      ],
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const event = (type: string, object: unknown): any => ({
  type,
  data: { object },
});

d("SLICE 6 — suscripción por tramos (Stripe)", () => {
  let A: { companyId: string; ownerId: string };
  let B: { companyId: string; ownerId: string };

  beforeAll(async () => {
    A = await newTenant("A6");
    B = await newTenant("B6");
  });

  afterAll(async () => {
    if (A) await purgeTenant(A.companyId);
    if (B) await purgeTenant(B.companyId);
    await prisma.$disconnect();
  });

  describe("isActive / tramoFor (lógica pura)", () => {
    it("isActive: active y trialing dan acceso; el resto no", () => {
      expect(isActive("active")).toBe(true);
      expect(isActive("trialing")).toBe(true);
      expect(isActive("past_due")).toBe(false);
      expect(isActive("canceled")).toBe(false);
      expect(isActive(null)).toBe(false);
      expect(isActive(undefined)).toBe(false);
    });

    it("tramoFor cae en el bracket correcto", () => {
      expect(tramoFor(1).eur).toBe(29);
      expect(tramoFor(5).eur).toBe(29);
      expect(tramoFor(6).eur).toBe(79);
      expect(tramoFor(20).eur).toBe(79);
      expect(tramoFor(50).eur).toBe(149);
      expect(tramoFor(500).eur).toBe(249);
    });
  });

  describe("handleStripeEvent escribe la caché por tenant", () => {
    it("created → trialing; updated → status/quantity; deleted → canceled", async () => {
      const subId = `sub_${crypto.randomUUID()}`;
      const custId = `cus_${crypto.randomUUID()}`;

      await handleStripeEvent(
        event(
          "customer.subscription.created",
          fakeSub(A.companyId, {
            id: subId,
            customer: custId,
            quantity: 3,
            status: "trialing",
          }),
        ),
      );

      let sub = await getSubscription(A.companyId);
      expect(sub?.stripeSubscriptionId).toBe(subId);
      expect(sub?.status).toBe("trialing");
      expect(sub?.quantity).toBe(3);

      await handleStripeEvent(
        event(
          "customer.subscription.updated",
          fakeSub(A.companyId, {
            id: subId,
            customer: custId,
            quantity: 7,
            status: "active",
          }),
        ),
      );
      sub = await getSubscription(A.companyId);
      expect(sub?.status).toBe("active");
      expect(sub?.quantity).toBe(7);

      await handleStripeEvent(
        event(
          "customer.subscription.deleted",
          fakeSub(A.companyId, { id: subId, customer: custId, status: "canceled" }),
        ),
      );
      sub = await getSubscription(A.companyId);
      expect(sub?.status).toBe("canceled");
    });

    it("ignora eventos sin companyId resoluble (no crea filas)", async () => {
      const orphan = fakeSub(B.companyId, { id: `sub_${crypto.randomUUID()}` });
      // Borra el metadata para que no se pueda resolver (y aún no está en BD).
      orphan.metadata = {} as { companyId: string };
      await handleStripeEvent(event("customer.subscription.created", orphan));
      expect(await getSubscription(B.companyId)).toBeNull();
    });
  });

  describe("aislamiento por empresa", () => {
    it("la suscripción de A no es visible desde B", async () => {
      const subId = `sub_${crypto.randomUUID()}`;
      await handleStripeEvent(
        event(
          "customer.subscription.created",
          fakeSub(A.companyId, { id: subId, status: "active" }),
        ),
      );

      // Desde B, RLS no muestra la suscripción de A.
      const fromB = await withTenant(B.companyId, (tx) =>
        tx.subscription.findFirst({ where: { stripeSubscriptionId: subId } }),
      );
      expect(fromB).toBeNull();
    });

    it("findCompanyIdByStripe resuelve por flag; sin contexto es fail-closed", async () => {
      const subId = `sub_${crypto.randomUUID()}`;
      const custId = `cus_${crypto.randomUUID()}`;
      await handleStripeEvent(
        event(
          "customer.subscription.created",
          fakeSub(A.companyId, { id: subId, customer: custId, status: "active" }),
        ),
      );

      // Con el flag (vía helper) resuelve la empresa.
      expect(await findCompanyIdByStripe({ subscriptionId: subId })).toBe(
        A.companyId,
      );
      expect(await findCompanyIdByStripe({ customerId: custId })).toBe(
        A.companyId,
      );

      // Sin contexto de tenant NI flag, la tabla es invisible (0 filas).
      const raw = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId: subId },
      });
      expect(raw).toBeNull();
    });
  });
});
