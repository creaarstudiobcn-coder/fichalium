import { describe, it, expect } from "vitest";
import { esEmpresaInterna, tieneAcceso } from "@/lib/billing/plans";

describe("Empresas internas (sin suscripción)", () => {
  const lista = " cmp_dependalium , cmp_otra ,";

  it("reconoce los ids de la lista, con espacios y comas sobrantes", () => {
    expect(esEmpresaInterna("cmp_dependalium", lista)).toBe(true);
    expect(esEmpresaInterna("cmp_otra", lista)).toBe(true);
  });

  it("fail-closed: sin lista, lista vacía o id vacío, nadie es interno", () => {
    expect(esEmpresaInterna("cmp_dependalium", undefined)).toBe(false);
    expect(esEmpresaInterna("cmp_dependalium", "")).toBe(false);
    expect(esEmpresaInterna("", lista)).toBe(false);
    expect(esEmpresaInterna("cmp_depend", lista)).toBe(false); // sin coincidencias parciales
  });

  it("tieneAcceso: interna sin suscripción sí; cliente sin suscripción no", () => {
    expect(tieneAcceso("cmp_dependalium", null, lista)).toBe(true);
    expect(tieneAcceso("cmp_cliente", null, lista)).toBe(false);
    expect(tieneAcceso("cmp_cliente", "canceled", lista)).toBe(false);
    expect(tieneAcceso("cmp_cliente", "active", lista)).toBe(true);
    expect(tieneAcceso("cmp_cliente", "trialing", lista)).toBe(true);
  });
});
