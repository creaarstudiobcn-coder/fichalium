import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { handleStripeEvent } from "@/lib/billing/subscription";

// El webhook es público (el middleware excluye /api). La autenticidad se verifica
// con la firma `stripe-signature` + STRIPE_WEBHOOK_SECRET, no con sesión.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Falta STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const body = await req.text(); // cuerpo CRUDO: necesario para verificar la firma

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error("Firma de webhook no válida:", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    // Devolvemos 500 para que Stripe reintente el evento.
    console.error(`Error procesando ${event.type}:`, err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
