// Salud de la plataforma para el panel de superadmin.
//
// Existe por una razón concreta: los fallos más peligrosos de este sistema son
// SILENCIOSOS. Si `APP_DATABASE_URL` falta, el runtime cae al rol propietario de
// Neon (BYPASSRLS) y la Row-Level Security deja de proteger sin un solo error en
// los logs. Esta comprobación lo pregunta a la propia base de datos.

import { prisma } from "@/lib/prisma";
import { PRICE_ID } from "@/lib/billing/plans";

export type Check = {
  label: string;
  ok: boolean;
  detail: string;
  /** Un fallo aquí compromete el aislamiento o el cobro. */
  critical: boolean;
};

/**
 * Verifica CONTRA LA BD con qué rol conecta el runtime y si ese rol se salta la
 * RLS. No basta con mirar la env var: lo que importa es el usuario efectivo.
 */
async function checkDatabaseRole(): Promise<Check[]> {
  try {
    const rows = await prisma.$queryRaw<
      { current_user: string; rolbypassrls: boolean; rolsuper: boolean }[]
    >`SELECT current_user,
             r.rolbypassrls,
             r.rolsuper
        FROM pg_roles r
       WHERE r.rolname = current_user`;
    const row = rows[0];
    if (!row) {
      return [
        {
          label: "Rol de base de datos",
          ok: false,
          detail: "No se pudo determinar el rol actual.",
          critical: true,
        },
      ];
    }
    const bypasses = row.rolbypassrls || row.rolsuper;
    return [
      {
        label: "Rol de base de datos",
        ok: !bypasses,
        detail: bypasses
          ? `Conectado como "${row.current_user}", que SE SALTA la RLS. ` +
            `El aislamiento entre empresas depende solo del código. ` +
            `Define APP_DATABASE_URL (rol app_user) y redespliega.`
          : `Conectado como "${row.current_user}" (sin BYPASSRLS). La RLS aplica.`,
        critical: true,
      },
      {
        label: "APP_DATABASE_URL definida",
        ok: Boolean(process.env.APP_DATABASE_URL),
        detail: process.env.APP_DATABASE_URL
          ? "Definida: el runtime usa el rol de aplicación."
          : "AUSENTE: prisma.ts cae al propietario (DATABASE_URL) sin avisar.",
        critical: true,
      },
    ];
  } catch (err) {
    return [
      {
        label: "Rol de base de datos",
        ok: false,
        detail: `Error al consultar: ${err instanceof Error ? err.message : String(err)}`,
        critical: true,
      },
    ];
  }
}

/** Comprueba que la RLS es fail-closed: sin contexto de tenant → 0 filas. */
async function checkFailClosed(): Promise<Check> {
  try {
    // Sin set_config de app.current_company: las políticas deben devolver 0.
    const rows = await prisma.$queryRaw<
      { n: bigint }[]
    >`SELECT count(*) AS n FROM time_entries`;
    const n = Number(rows[0]?.n ?? 0);
    return {
      label: "RLS fail-closed",
      ok: n === 0,
      detail:
        n === 0
          ? "Sin contexto de tenant, time_entries devuelve 0 filas. Correcto."
          : `Sin contexto de tenant se ven ${n} fichajes. La RLS NO está protegiendo.`,
      critical: true,
    };
  } catch (err) {
    return {
      label: "RLS fail-closed",
      ok: false,
      detail: `Error al comprobar: ${err instanceof Error ? err.message : String(err)}`,
      critical: true,
    };
  }
}

/** Comprueba que el trigger append-only de time_entries sigue instalado. */
async function checkAppendOnly(): Promise<Check> {
  try {
    const rows = await prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM pg_trigger
       WHERE tgname = 'time_entries_no_mutation' AND NOT tgisinternal`;
    const ok = Number(rows[0]?.n ?? 0) > 0;
    return {
      label: "Trigger append-only",
      ok,
      detail: ok
        ? "time_entries_no_mutation instalado: UPDATE/DELETE bloqueados."
        : "AUSENTE: los fichajes se podrían modificar o borrar. Ejecuta npm run db:rls.",
      critical: true,
    };
  } catch (err) {
    return {
      label: "Trigger append-only",
      ok: false,
      detail: `Error al comprobar: ${err instanceof Error ? err.message : String(err)}`,
      critical: true,
    };
  }
}

/** Config de Stripe y del entorno. No llama a la API de Stripe (solo env). */
function checkEnv(): Check[] {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  const isLive = key.startsWith("sk_live");
  const whitelist = (process.env.SUPERADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  return [
    {
      label: "Modo de Stripe",
      ok: Boolean(key),
      detail: !key
        ? "STRIPE_SECRET_KEY ausente: el checkout falla."
        : isLive
          ? "LIVE — se cobra de verdad."
          : "TEST — no se cobra.",
      critical: false,
    },
    {
      label: "Price de tramos",
      ok: Boolean(PRICE_ID),
      detail: PRICE_ID
        ? PRICE_ID
        : "STRIPE_PRICE_TRAMOS ausente: plans.ts cae a \"\" y el checkout revienta en runtime.",
      critical: true,
    },
    {
      label: "Secreto del webhook",
      ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      detail: process.env.STRIPE_WEBHOOK_SECRET
        ? "Definido."
        : "AUSENTE: el webhook devuelve 500 y Stripe no sincroniza nada.",
      critical: true,
    },
    {
      label: "Lista blanca de superadmin",
      ok: whitelist.length > 0,
      detail:
        whitelist.length > 0
          ? whitelist.join(", ")
          : "Vacía: nadie puede entrar aquí (fail-closed).",
      critical: false,
    },
    {
      label: "AUTH_URL",
      ok: Boolean(process.env.AUTH_URL),
      detail: process.env.AUTH_URL ?? "Ausente: los callbacks de login pueden fallar.",
      critical: false,
    },
  ];
}

export async function getSystemHealth(): Promise<Check[]> {
  const [roleChecks, failClosed, appendOnly] = await Promise.all([
    checkDatabaseRole(),
    checkFailClosed(),
    checkAppendOnly(),
  ]);
  return [...roleChecks, failClosed, appendOnly, ...checkEnv()];
}
