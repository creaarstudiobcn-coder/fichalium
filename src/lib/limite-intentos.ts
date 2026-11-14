// Escudo creaar · límite de intentos de acceso, compartido por todas las instancias (vive en la base).
// 5 fallos seguidos con un mismo email, o 20 desde una misma IP, en 15 min → 15 min fuera.
// Guarda solo un hash (sha256) del email y de la IP, nunca el dato en claro. Si la base falla, NO bloquea.
// La tabla `login_intentos` NO está en el esquema de Prisma a propósito: la crea este módulo. Si un
// `prisma db push` propusiera borrarla, se puede aceptar: solo son contadores y se vuelve a crear sola.
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

const MAX_EMAIL = 5;
const MAX_IP = 20;

const h = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 40);
const claves = (email: string, ip: string) => ({ e: `e:${h(email.trim().toLowerCase())}`, i: `i:${h(ip || "sin-ip")}` });

let tablaLista = false;
async function tabla() {
  if (tablaLista) return;
  await prisma.$executeRawUnsafe(
    `CREATE TABLE IF NOT EXISTS login_intentos (
       clave TEXT PRIMARY KEY, fallos INT NOT NULL DEFAULT 0,
       primero TIMESTAMPTZ NOT NULL DEFAULT now(), bloqueado_hasta TIMESTAMPTZ)`,
  );
  tablaLista = true;
}

/** IP de quien entra (Vercel la pone en x-forwarded-for). Acepta un Request o las cabeceras de NextAuth v4. */
export function ipDe(req: unknown): string {
  const r = req as { headers?: Headers | Record<string, string | string[] | undefined> } | undefined;
  const hd = r?.headers;
  let v: string | string[] | null | undefined;
  if (hd && typeof (hd as Headers).get === "function") v = (hd as Headers).get("x-forwarded-for");
  else if (hd) v = (hd as Record<string, string | string[] | undefined>)["x-forwarded-for"];
  const s = Array.isArray(v) ? v[0] : v;
  return (s ?? "").split(",")[0].trim();
}

/** ¿Está bloqueado este email o esta IP? */
export async function accesoBloqueado(email: string, ip: string): Promise<boolean> {
  try {
    await tabla();
    const { e, i } = claves(email, ip);
    const filas = await prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM login_intentos
      WHERE clave IN (${e}, ${i}) AND bloqueado_hasta > now()`;
    return (filas[0]?.n ?? 0) > 0;
  } catch (err) {
    console.error("[limite-intentos] sin comprobar (no bloquea):", err instanceof Error ? err.message : err);
    return false;
  }
}

/** Apunta un fallo para el email y para la IP. */
export async function apuntarFallo(email: string, ip: string): Promise<void> {
  try {
    await tabla();
    const { e, i } = claves(email, ip);
    for (const [clave, max] of [[e, MAX_EMAIL], [i, MAX_IP]] as const) {
      await prisma.$executeRaw`
        INSERT INTO login_intentos (clave, fallos, primero) VALUES (${clave}, 1, now())
        ON CONFLICT (clave) DO UPDATE SET
          fallos = CASE WHEN login_intentos.primero < now() - interval '15 minutes' THEN 1 ELSE login_intentos.fallos + 1 END,
          primero = CASE WHEN login_intentos.primero < now() - interval '15 minutes' THEN now() ELSE login_intentos.primero END,
          bloqueado_hasta = CASE
            WHEN (CASE WHEN login_intentos.primero < now() - interval '15 minutes' THEN 1 ELSE login_intentos.fallos + 1 END) >= ${max}
            THEN now() + interval '15 minutes' ELSE login_intentos.bloqueado_hasta END`;
    }
  } catch (err) {
    console.error("[limite-intentos] no se pudo apuntar el fallo:", err instanceof Error ? err.message : err);
  }
}

/** Contraseña correcta: se borra el contador de ese email. */
export async function borrarFallos(email: string): Promise<void> {
  try {
    await prisma.$executeRaw`DELETE FROM login_intentos WHERE clave = ${claves(email, "").e}`;
  } catch {
    /* no importa */
  }
}
