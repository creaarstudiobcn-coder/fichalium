"use server";

import { confirmPasswordResetSchema } from "@/lib/validation";
import { consumePasswordReset, PasswordResetError } from "@/lib/password-reset";

export type ResetState = { error?: string; ok?: boolean };

export async function resetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = confirmPasswordResetSchema.safeParse({
    token: String(formData.get("token") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.password?.[0] ?? "Datos no válidos.";
    return { error: msg };
  }

  try {
    await consumePasswordReset(parsed.data.token, parsed.data.password);
    return { ok: true };
  } catch (err) {
    if (err instanceof PasswordResetError) return { error: err.message };
    console.error("Error en resetAction:", err);
    return { error: "Error del servidor. Inténtalo de nuevo." };
  }
}
