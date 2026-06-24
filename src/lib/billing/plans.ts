// Configuración de la suscripción "por tramos". Stripe es la fuente de verdad
// del cobro (el Price escalonado vive en Stripe); esta tabla es SOLO para la UI.

/** Price escalonado (volume tiered) creado en Stripe. */
export const PRICE_ID = process.env.STRIPE_PRICE_TRAMOS ?? "";

/** Días de prueba al suscribirse. */
export const TRIAL_DAYS = 14;

/**
 * Tramos para mostrar en la página de precios. Deben coincidir con los tiers
 * del Price de Stripe (volume: el total de empleados cae en UN tramo y se cobra
 * su `eur`). `upTo: null` = tramo final sin límite.
 */
export const TRAMOS: { upTo: number | null; eur: number }[] = [
  { upTo: 5, eur: 29 },
  { upTo: 20, eur: 79 },
  { upTo: 50, eur: 149 },
  { upTo: null, eur: 249 },
];

/** Estados de Stripe que dan acceso a las acciones de admin (gating). */
export function isActive(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/** Tramo (importe €/mes) en el que cae una plantilla de `count` empleados. */
export function tramoFor(count: number): { eur: number; label: string } {
  let prev = 0;
  for (const t of TRAMOS) {
    if (t.upTo === null || count <= t.upTo) {
      const label =
        t.upTo === null ? `${prev + 1}+ empleados` : `${prev + 1}–${t.upTo} empleados`;
      return { eur: t.eur, label };
    }
    prev = t.upTo;
  }
  // Inalcanzable (el último tramo es upTo:null), pero TS necesita un retorno.
  const last = TRAMOS[TRAMOS.length - 1];
  return { eur: last.eur, label: `${prev}+ empleados` };
}
