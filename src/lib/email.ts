import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Envío de email. Cliente Resend LAZY (no se construye al importar → tests y
 * builds sin clave no fallan). Si NO hay RESEND_API_KEY (dev), escribe el correo
 * a `.emails/` y lo loguea, para poder probar el flujo entero sin proveedor ni
 * dominio verificado. En prod hay que fijar RESEND_API_KEY + RESEND_FROM con un
 * remitente de dominio verificado en Resend.
 */

const FROM = process.env.RESEND_FROM ?? "Fichalium <no-reply@fichalium.es>";

export type EmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(email: EmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    await previewToDisk(email);
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM,
    to: email.to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) {
    throw new Error(`Resend: ${error.message ?? "envío fallido"}`);
  }
}

async function previewToDisk(email: EmailInput): Promise<void> {
  try {
    const dir = path.join(process.cwd(), ".emails");
    await mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeTo = email.to.replace(/[^a-z0-9]/gi, "_");
    const file = path.join(dir, `${stamp}-${safeTo}.html`);
    await writeFile(
      file,
      `<!-- to: ${email.to} | subject: ${email.subject} -->\n${email.html}`,
      "utf8",
    );
    console.log(`[email:preview] Sin RESEND_API_KEY → ${file}`);
    console.log(`[email:preview] "${email.subject}" → ${email.to}`);
  } catch (err) {
    console.log(
      `[email:preview] "${email.subject}" → ${email.to} (no se pudo escribir el fichero: ${String(err)})`,
    );
  }
}

/** Plantilla del email de recuperación de contraseña. */
export function passwordResetEmail(link: string): Omit<EmailInput, "to"> {
  return {
    subject: "Recupera tu contraseña de Fichalium",
    text:
      `Has pedido restablecer tu contraseña de Fichalium.\n\n` +
      `Abre este enlace para elegir una nueva (caduca en 1 hora):\n${link}\n\n` +
      `Si no has sido tú, ignora este correo: tu contraseña no cambiará.`,
    html: `<!doctype html><html lang="es"><body style="margin:0;background:#f3f4f6;padding:24px;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb">
    <tr><td style="padding:32px">
      <h1 style="font-size:20px;margin:0 0 8px">Recupera tu contraseña</h1>
      <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px">
        Has pedido restablecer la contraseña de tu cuenta de Fichalium.
        El enlace caduca en <strong>1 hora</strong> y solo puede usarse una vez.
      </p>
      <a href="${link}" style="display:inline-block;background:#34d399;color:#052e16;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px">
        Elegir nueva contraseña
      </a>
      <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:24px 0 0">
        Si no has sido tú, ignora este correo: tu contraseña no cambiará.
        Si el botón no funciona, copia y pega esta dirección:<br>
        <span style="color:#64748b;word-break:break-all">${link}</span>
      </p>
    </td></tr>
  </table>
</body></html>`,
  };
}
