// Política de acceso según el ESTADO DE PLATAFORMA de la empresa
// (ACTIVE / SUSPENDED / CLOSED).
//
// POR QUÉ ESTE MÓDULO EXISTE: este control vivía solo en `dashboard/layout.tsx`,
// y en App Router los layouts NO se ejecutan para route handlers ni para server
// actions. Resultado: una empresa suspendida seguía fichando y exportando su
// histórico; la pantalla de "cuenta suspendida" era decorativa. El estado se
// re-verifica ahora en CADA página, acción y handler, con la política aquí.
//
// LA REGLA (cláusula 5 de los Términos + RD 8/2019): se bloquea la GESTIÓN, no
// el acceso a los datos. El registro horario es una obligación legal del cliente
// y debe conservarlo 4 años: dejarle sin sus informes por un impago le impediría
// responder a una Inspección. Por eso `canReadRecords` es siempre true.

// NO se importa NextAuth aquí: eso haría el módulo incargable desde vitest y la
// política dejaría de tener tests. Misma disciplina que `superadmin/guard.ts`.
// Quien necesite la sesión, la lee por su cuenta y pasa el companyId.

import type { CompanyStatus } from "@prisma/client";
import { withTenant } from "@/lib/tenant";

/** ¿Puede usar las funciones de gestión (fichar, empleados, suscripción)? */
export function canManage(status: CompanyStatus | null | undefined): boolean {
  // Fail-closed: sin estado conocido (empresa purgada, JWT obsoleto), no.
  return status === "ACTIVE";
}

/**
 * ¿Puede consultar y exportar su registro horario? SIEMPRE que exista la
 * empresa: es su obligación legal conservarlo, no un premio por estar al día.
 */
export function canReadRecords(status: CompanyStatus | null | undefined): boolean {
  return status != null;
}

/** Estado de plataforma de la empresa, leído en vivo (no del JWT). */
export async function getCompanyStatus(
  companyId: string,
): Promise<CompanyStatus | null> {
  const company = await withTenant(companyId, (tx) =>
    tx.company.findUnique({
      where: { id: companyId },
      select: { status: true },
    }),
  );
  return company?.status ?? null;
}

/** Mensaje para el usuario cuando la gestión está bloqueada. */
export function blockedMessage(status: CompanyStatus | null): string {
  if (status === "SUSPENDED") {
    return "El acceso de gestión de esta empresa está suspendido. Tus informes siguen disponibles. Contacta con soporte.";
  }
  if (status === "CLOSED") {
    return "Esta empresa está dada de baja. Tus informes siguen disponibles para descarga. Contacta con soporte.";
  }
  return "Esta empresa no está activa.";
}
