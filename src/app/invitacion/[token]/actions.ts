"use server";

import { acceptInvitationSchema } from "@/lib/validation";
import { acceptInvitation, InvitationError } from "@/lib/invitations";

export type AcceptState = { error?: string; ok?: boolean };

/** Crea la cuenta del empleado a partir de la invitación + contraseña. */
export async function acceptAction(
  _prev: AcceptState,
  formData: FormData,
): Promise<AcceptState> {
  const token = String(formData.get("token") ?? "");
  if (!token) return { error: "Invitación no válida." };

  const parsed = acceptInvitationSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await acceptInvitation(token, parsed.data.password);
  } catch (err) {
    if (err instanceof InvitationError) return { error: err.message };
    throw err;
  }

  return { ok: true };
}
