import { NextResponse } from "next/server";

import { requestPasswordResetSchema } from "@/lib/validation";
import { createPasswordReset } from "@/lib/password-reset";
import { sendEmail, passwordResetEmail } from "@/lib/email";

const baseUrl = () => process.env.AUTH_URL ?? "http://localhost:3000";

/**
 * Pide un enlace de recuperación. Respuesta SIEMPRE `{ ok: true }`, exista o no
 * la cuenta y falle o no el envío: no revelamos si un email está registrado
 * (anti-enumeración). El correo solo se envía si hay una cuenta con ese email.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestPasswordResetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }

  try {
    const result = await createPasswordReset(parsed.data.email);
    if (result) {
      const link = `${baseUrl()}/recuperar/${result.token}`;
      await sendEmail({ to: result.email, ...passwordResetEmail(link) });
    }
  } catch (err) {
    // No filtramos el fallo al cliente; queda en logs para diagnóstico.
    console.error("Error en /api/password-reset/request:", err);
  }

  return NextResponse.json({ ok: true });
}
