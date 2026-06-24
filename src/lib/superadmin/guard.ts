// Lógica PURA de autorización de superadmin. Sin imports de NextAuth para que
// sea testeable en Node (vitest) y reutilizable desde edge si hiciera falta.

export type SuperadminActor = { userId: string; email: string };

/** Normaliza la lista blanca de emails de `SUPERADMIN_EMAILS` (coma-separada). */
export function parseWhitelist(env: string | undefined): string[] {
  return (env ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Predicado de superadmin: requiere AMBOS, rol SUPERADMIN en BD Y email en la
 * lista blanca. Si la lista está vacía, NADIE es superadmin (fail-closed).
 */
export function isSuperadmin(
  role: string | null | undefined,
  email: string | null | undefined,
  whitelist: string[],
): boolean {
  if (role !== "SUPERADMIN") return false;
  if (!email) return false;
  if (whitelist.length === 0) return false;
  return whitelist.includes(email.toLowerCase());
}
