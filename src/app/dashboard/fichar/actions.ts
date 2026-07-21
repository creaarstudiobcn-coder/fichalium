"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getCompanyStatus, canManage, blockedMessage } from "@/lib/access";
import { clock, FichajeError, type FichajeGeo } from "@/lib/fichajes";

export type ClockState = { error?: string; ok?: boolean };

/**
 * Saca la ubicación del formulario si viene, saneada. Devuelve null si falta o
 * es inválida (p. ej. el empleado denegó el permiso): en ese caso se ficha sin
 * ubicación, nunca se rechaza el fichaje. Rangos WGS84; la precisión se guarda
 * en metros si es un número positivo.
 */
function parseGeo(formData: FormData): FichajeGeo | null {
  const num = (v: FormDataEntryValue | null) => {
    if (v === null) return null;
    const n = Number(String(v));
    return Number.isFinite(n) ? n : null;
  };
  const lat = num(formData.get("lat"));
  const lng = num(formData.get("lng"));
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  const acc = num(formData.get("accuracy"));
  return { lat, lng, accuracy: acc !== null && acc >= 0 ? acc : null };
}

export async function clockAction(
  _prev: ClockState,
  formData: FormData,
): Promise<ClockState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión no válida." };

  // Las acciones NO pasan por dashboard/layout.tsx: el estado se comprueba aquí
  // o no se comprueba. Un fichaje es append-only; si entra, no se puede borrar.
  const status = await getCompanyStatus(session.user.companyId);
  if (!canManage(status)) return { error: blockedMessage(status) };

  // Un EMPLOYEE solo puede ficharse a SÍ MISMO: ignoramos el employeeId del
  // formulario y usamos el de su sesión. OWNER/ADMIN sí pueden fichar por otros.
  let employeeId: string;
  if (session.user.role === "EMPLOYEE") {
    if (!session.user.employeeId) {
      return { error: "Tu cuenta no está vinculada a un empleado." };
    }
    employeeId = session.user.employeeId;
  } else {
    employeeId = String(formData.get("employeeId") ?? "");
  }

  const type = String(formData.get("type") ?? "");
  if (type !== "CLOCK_IN" && type !== "CLOCK_OUT") {
    return { error: "Tipo de fichaje no válido." };
  }

  try {
    await clock(
      session.user.companyId,
      employeeId,
      session.user.id,
      type,
      parseGeo(formData),
    );
  } catch (err) {
    if (err instanceof FichajeError) return { error: err.message };
    throw err;
  }

  revalidatePath("/dashboard/fichar");
  return { ok: true };
}
