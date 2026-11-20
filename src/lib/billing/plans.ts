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

/**
 * Empresas internas (las nuestras): usan Fichalium sin suscripción.
 * - 5663b033… = Dependalium Global Services (propietario dependalium@gmail.com).
 * - 5013627e… = segunda empresa «dependalium» (ivanlopez1981@hotmail.es), para
 *   pruebas y la cuenta de los revisores de Google Play.
 * La variable `FICHALIUM_EMPRESAS_INTERNAS` (ids separados por comas), si existe,
 * sustituye a esta lista. Los ids no son secretos.
 */
export const EMPRESAS_INTERNAS =
  "5663b033-90c9-4e95-8db0-442a49be36e7,5013627e-2071-433f-a3ca-181ed86de263";

export function esEmpresaInterna(
  companyId: string,
  lista: string | undefined = process.env.FICHALIUM_EMPRESAS_INTERNAS ?? EMPRESAS_INTERNAS,
): boolean {
  if (!lista || !companyId) return false;
  return lista
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .includes(companyId);
}

/** ¿Puede la empresa gestionar empleados? Interna, o suscripción activa/en prueba. */
export function tieneAcceso(
  companyId: string,
  status: string | null | undefined,
  lista?: string,
): boolean {
  return esEmpresaInterna(companyId, lista) || isActive(status);
}

/** Tramo (importe €/mes) en el que cae una plantilla de `count` empleados. */
export function tramoFor(count: number): { eur: number; label: string } {
  // Sin plantilla no hay tramo: `count: 0` es el default del schema y aparece
  // entre el checkout y el primer alta. Cobrar el primer tramo por 0 empleados
  // inflaba el MRR con importes fantasma.
  if (count <= 0) return { eur: 0, label: "sin empleados" };
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

/**
 * MRR real que aporta una suscripción HOY, en €/mes.
 *
 * OJO con la diferencia frente a `isActive`: una suscripción en `trialing` da
 * acceso al producto pero factura 0 €. Contarla como ingreso inflaba el MRR
 * justo en el segmento más volátil. Aquí solo cuenta lo que se cobra de verdad.
 */
export function mrrEurFor(
  status: string | null | undefined,
  quantity: number,
): number {
  if (status !== "active") return 0;
  return tramoFor(quantity).eur;
}
