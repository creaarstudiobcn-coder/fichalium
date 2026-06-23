import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "@/lib/validation";

// Tests puros (sin BD): siempre se ejecutan.
describe("registerSchema", () => {
  it("acepta datos válidos y normaliza el email a minúsculas", () => {
    const parsed = registerSchema.parse({
      companyName: "  Acme SL ",
      name: "Ana",
      email: "ANA@Acme.com",
      password: "secret123",
    });
    expect(parsed.email).toBe("ana@acme.com");
    expect(parsed.companyName).toBe("Acme SL");
  });

  it("rechaza contraseñas de menos de 8 caracteres", () => {
    const res = registerSchema.safeParse({
      companyName: "Acme",
      name: "Ana",
      email: "ana@acme.com",
      password: "corta",
    });
    expect(res.success).toBe(false);
  });

  it("rechaza emails inválidos", () => {
    const res = registerSchema.safeParse({
      companyName: "Acme",
      name: "Ana",
      email: "no-es-email",
      password: "secret123",
    });
    expect(res.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("exige email y contraseña", () => {
    expect(loginSchema.safeParse({ email: "", password: "" }).success).toBe(
      false,
    );
  });
});
