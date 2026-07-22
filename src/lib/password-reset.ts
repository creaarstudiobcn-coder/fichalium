import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  withTenant,
  findUserForLogin,
  findResetTokenByHash,
} from "@/lib/tenant";

export class PasswordResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetError";
  }
}

/** Validez de un enlace de recuperación desde que se crea. Corta a propósito. */
const RESET_TTL_MS = 60 * 60 * 1000; // 1 hora

/** El token crudo viaja en la URL del email; en BD solo su SHA-256. */
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Pide un token de recuperación para el email dado. Devuelve el TOKEN CRUDO
 * (solo aquí existe en claro) para construir el enlace, o `null` si no hay
 * ninguna cuenta con ese email. El llamante SIEMPRE responde igual al usuario
 * (no revela si el email existe); solo envía correo si esto devuelve token.
 *
 * Invalida los tokens pendientes anteriores del usuario para que solo el último
 * enlace funcione (igual que las invitaciones).
 */
export async function createPasswordReset(
  email: string,
): Promise<{ token: string; email: string; name: string } | null> {
  const normalized = email.toLowerCase().trim();
  const user = await findUserForLogin(normalized);
  if (!user) return null;

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await withTenant(user.companyId, async (tx) => {
    // Caduca de inmediato los pendientes previos (solo el último enlace vale).
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: {
        companyId: user.companyId,
        userId: user.id,
        email: user.email,
        tokenHash,
        expiresAt,
      },
    });
  });

  return { token: rawToken, email: user.email, name: user.name };
}

export type ResetTokenState = "valid" | "not_found" | "used" | "expired";

/**
 * Resuelve un token crudo para pintar la página de reset, sin revelar de más.
 */
export async function getResetTokenState(
  rawToken: string,
): Promise<ResetTokenState> {
  const row = await findResetTokenByHash(hashToken(rawToken));
  if (!row) return "not_found";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() < Date.now()) return "expired";
  return "valid";
}

/**
 * Consume el token y fija la nueva contraseña. Transacción bajo el contexto de
 * la empresa del token con `app.password_reset='on'` (única vía que abre el
 * UPDATE de `users` para escribir el password_hash). Marca el token como usado
 * y caduca cualquier otro pendiente del mismo usuario. Guard de carrera:
 * re-lee el token dentro de la transacción.
 */
export async function consumePasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<{ email: string }> {
  const row = await findResetTokenByHash(hashToken(rawToken));
  if (!row) throw new PasswordResetError("El enlace no es válido.");
  if (row.usedAt) {
    throw new PasswordResetError("Este enlace ya se ha utilizado.");
  }
  if (row.expiresAt.getTime() < Date.now()) {
    throw new PasswordResetError("El enlace ha caducado. Pide uno nuevo.");
  }

  // Hash fuera de la transacción (trabajo de CPU), como registro/invitación.
  const passwordHash = await bcrypt.hash(newPassword, 12);

  await withTenant(row.companyId, async (tx) => {
    // Abre el UPDATE de users solo para este flujo (política acotada por flag).
    await tx.$executeRaw`SELECT set_config('app.password_reset', 'on', true)`;

    // Re-lectura bajo contexto: guard de carrera (usado/caducado entre medias).
    const fresh = await tx.passwordResetToken.findUnique({
      where: { id: row.id },
    });
    if (!fresh || fresh.usedAt || fresh.expiresAt.getTime() < Date.now()) {
      throw new PasswordResetError("El enlace ya no es válido.");
    }

    await tx.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    });

    // Marca este token como usado y caduca el resto de pendientes del usuario.
    await tx.passwordResetToken.updateMany({
      where: { userId: row.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });

  return { email: row.email };
}
