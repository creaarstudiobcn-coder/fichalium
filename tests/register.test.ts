import { describe, it, expect, afterAll } from "vitest";
import { registerCompany, RegisterError } from "@/lib/auth/register";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { hasDb, purgeTenant } from "./helpers";

// Integración: requiere BD real con RLS aplicada (npm run db:setup).
const d = hasDb ? describe : describe.skip;

const TEST_EMAIL = `owner.${crypto.randomUUID()}@example.com`;

d("registerCompany (integración con BD)", () => {
  let companyId: string | null = null;

  afterAll(async () => {
    if (companyId) await purgeTenant(companyId);
    await prisma.$disconnect();
  });

  it("crea una empresa y un usuario OWNER atado a ella", async () => {
    const { company, user } = await registerCompany({
      companyName: "Empresa Test SL",
      name: "Owner Test",
      email: TEST_EMAIL,
      password: "secret123",
    });
    companyId = company.id;

    expect(company.id).toBeTruthy();
    expect(user.companyId).toBe(company.id);
    expect(user.role).toBe("OWNER");
    expect(user.email).toBe(TEST_EMAIL);
  });

  it("no guarda la contraseña en claro (hash bcrypt)", async () => {
    const stored = await withTenant(companyId!, (tx) =>
      tx.user.findUnique({
        where: { email: TEST_EMAIL },
        select: { passwordHash: true },
      }),
    );
    expect(stored?.passwordHash).toBeTruthy();
    expect(stored?.passwordHash).not.toBe("secret123");
    expect(stored?.passwordHash?.startsWith("$2")).toBe(true); // prefijo bcrypt
  });

  it("rechaza un segundo registro con el mismo email", async () => {
    await expect(
      registerCompany({
        companyName: "Otra SL",
        name: "Duplicado",
        email: TEST_EMAIL,
        password: "secret123",
      }),
    ).rejects.toBeInstanceOf(RegisterError);
  });
});
