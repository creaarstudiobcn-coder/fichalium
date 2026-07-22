import { describe, it, expect } from "vitest";
import { reconcileDecision } from "@/lib/billing/reconcile";

describe("reconcileDecision (pura)", () => {
  it("todo cuadra → no toca nada", () => {
    expect(reconcileDecision(3, 3, 3)).toEqual({
      targetQuantity: 3,
      updateStripe: false,
      updateCache: false,
    });
  });

  it("infrafacturación (el PATCH de syncQuantity falló) → corrige Stripe y caché", () => {
    // 5 activos reales, pero Stripe y la caché siguen en 3.
    expect(reconcileDecision(5, 3, 3)).toEqual({
      targetQuantity: 5,
      updateStripe: true,
      updateCache: true,
    });
  });

  it("Stripe correcto pero caché obsoleta → solo corrige la caché", () => {
    expect(reconcileDecision(5, 5, 3)).toEqual({
      targetQuantity: 5,
      updateStripe: false,
      updateCache: true,
    });
  });

  it("caché correcta pero Stripe obsoleto → solo corrige Stripe", () => {
    expect(reconcileDecision(5, 3, 5)).toEqual({
      targetQuantity: 5,
      updateStripe: true,
      updateCache: false,
    });
  });

  it("sobrefacturación (más facturado que real) → baja a lo real", () => {
    expect(reconcileDecision(2, 4, 4)).toEqual({
      targetQuantity: 2,
      updateStripe: true,
      updateCache: true,
    });
  });

  it("nunca pide una cantidad negativa", () => {
    expect(reconcileDecision(-1, 0, 0).targetQuantity).toBe(0);
  });
});
