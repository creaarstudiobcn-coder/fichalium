import { auth } from "@/auth";
import { isSuperadmin, parseWhitelist, type SuperadminActor } from "./guard";

export type { SuperadminActor } from "./guard";
export { isSuperadmin, parseWhitelist } from "./guard";

/**
 * Verifica la sesión actual contra las dos capas (rol SUPERADMIN + lista blanca).
 * Devuelve el actor si es válido, o `null` (los llamantes hacen `notFound()` para
 * no revelar la existencia del panel). Importa NextAuth → solo uso en servidor.
 */
export async function requireSuperadmin(): Promise<SuperadminActor | null> {
  const session = await auth();
  const user = session?.user;
  if (!user) return null;
  const whitelist = parseWhitelist(process.env.SUPERADMIN_EMAILS);
  if (!isSuperadmin(user.role, user.email, whitelist)) return null;
  return { userId: user.id, email: user.email ?? "" };
}
