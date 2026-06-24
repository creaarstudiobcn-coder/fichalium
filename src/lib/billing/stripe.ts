import Stripe from "stripe";

// Cliente Stripe del servidor, instanciado de forma PEREZOSA: importar este
// módulo no construye nada (así los tests que solo usan la lógica de eventos no
// necesitan STRIPE_SECRET_KEY). El cliente se crea la primera vez que se usa de
// verdad (Checkout, Portal, webhook, sync). La clave NUNCA llega al cliente web.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Falta STRIPE_SECRET_KEY");
    // API version fijada a la última soportada por el SDK instalado.
    client = new Stripe(key, { apiVersion: "2026-05-27.dahlia" });
  }
  return client;
}
