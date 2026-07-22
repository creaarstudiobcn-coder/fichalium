import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { registerCompany } from "@/lib/auth/register";
import {
  createPasswordReset,
  getResetTokenState,
  consumePasswordReset,
  PasswordResetError,
} from "@/lib/password-reset";
import { hasDb, purgeTenant } from "./helpers";

const d = hasDb ? describe : describe.skip;

async function newOwner(label: string) {
  const email = `${label}.${crypto.randomUUID()}@example.com`;
  const { company, user } = await registerCompany({
    companyName: `Empresa ${label}`,
    name: `Owner ${label}`,
    email,
    password: "claveVieja1",
  });
  return { companyId: company.id, userId: user.id, email };
}

/** Lee el password_hash actual del usuario (bajo su contexto de tenant). */
async function currentHash(companyId: string, userId: string) {
  const u = await withTenant(companyId, (tx) =>
    tx.user.findUnique({ where: { id: userId } }),
  );
  return u!.passwordHash;
}

d("SLICE 8 — recuperación de contraseña", () => {
  let A: { companyId: string; userId: string; email: string };

  beforeAll(async () => {
    A = await newOwner("A8");
  });

  afterAll(async () => {
    if (A) await purgeTenant(A.companyId);
    await prisma.$disconnect();
  });

  it("email desconocido no crea token ni revela existencia (null)", async () => {
    const res = await createPasswordReset(
      `desconocido.${crypto.randomUUID()}@example.com`,
    );
    expect(res).toBeNull();
  });

  it("email conocido crea un token válido", async () => {
    const res = await createPasswordReset(A.email);
    expect(res).not.toBeNull();
    expect(res!.token).toMatch(/^[0-9a-f]{64}$/);
    expect(await getResetTokenState(res!.token)).toBe("valid");
  });

  it("consumir el token cambia la contraseña de verdad y lo marca usado", async () => {
    const before = await currentHash(A.companyId, A.userId);
    const { token } = (await createPasswordReset(A.email))!;

    await consumePasswordReset(token, "claveNueva9");

    const after = await currentHash(A.companyId, A.userId);
    expect(after).not.toBe(before);
    expect(await bcrypt.compare("claveNueva9", after)).toBe(true);
    expect(await bcrypt.compare("claveVieja1", after)).toBe(false);

    // El token queda inservible tras el uso.
    expect(await getResetTokenState(token)).toBe("used");
    await expect(consumePasswordReset(token, "otra12345")).rejects.toThrow(
      PasswordResetError,
    );
  });

  it("un token nuevo invalida los pendientes anteriores", async () => {
    const first = (await createPasswordReset(A.email))!;
    const second = (await createPasswordReset(A.email))!;

    expect(await getResetTokenState(first.token)).toBe("used"); // invalidado
    expect(await getResetTokenState(second.token)).toBe("valid");

    // El caducado/invalidado no sirve para consumir.
    await expect(
      consumePasswordReset(first.token, "loQueSea12"),
    ).rejects.toThrow(PasswordResetError);
  });

  it("un token caducado no es válido ni consumible", async () => {
    const { token } = (await createPasswordReset(A.email))!;

    // Lo caducamos a mano (bajo el contexto de la empresa: la política UPDATE
    // de password_reset_tokens lo permite dentro del tenant).
    await withTenant(A.companyId, async (tx) => {
      await tx.passwordResetToken.updateMany({
        where: { userId: A.userId, usedAt: null },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
    });

    expect(await getResetTokenState(token)).toBe("expired");
    await expect(consumePasswordReset(token, "loQueSea12")).rejects.toThrow(
      PasswordResetError,
    );
  });

  it("token inexistente → not_found", async () => {
    expect(await getResetTokenState("deadbeef".repeat(8))).toBe("not_found");
  });

  it("la RLS deniega el UPDATE de users SIN el flag app.password_reset", async () => {
    // Dentro del tenant pero sin activar el flag: la política users_password_reset_update
    // no aplica → 0 filas → Prisma lanza P2025. Prueba que el flag es el gate real.
    await expect(
      withTenant(A.companyId, (tx) =>
        tx.user.update({
          where: { id: A.userId },
          data: { passwordHash: "no-deberia-escribirse" },
        }),
      ),
    ).rejects.toThrow();
  });
});
