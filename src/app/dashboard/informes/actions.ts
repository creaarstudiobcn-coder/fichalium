"use server";

import { revalidatePath } from "next/cache";
import type { TimeEntryType } from "@prisma/client";
import { auth } from "@/auth";
import { getCompanyStatus, canManage } from "@/lib/access";
import { registrarCorreccion, CorreccionError } from "@/lib/corrections";

export type CorreccionState = { error?: string; ok?: boolean };

/**
 * Crea una corrección / fichaje manual. Solo OWNER/ADMIN y con la empresa
 * ACTIVE. Se re-verifica aquí: los layouts NO protegen las server actions.
 */
export async function correccionAction(
  _prev: CorreccionState,
  formData: FormData,
): Promise<CorreccionState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión no válida." };

  if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
    return { error: "Solo la empresa puede corregir fichajes." };
  }
  if (!canManage(await getCompanyStatus(session.user.companyId))) {
    return { error: "La cuenta no permite gestionar fichajes ahora mismo." };
  }

  const correctsId = String(formData.get("correctsId") ?? "").trim() || null;

  try {
    await registrarCorreccion(session.user.companyId, session.user.id, {
      employeeId: String(formData.get("employeeId") ?? ""),
      type: String(formData.get("type") ?? "") as TimeEntryType,
      timestampLocal: String(formData.get("timestampLocal") ?? ""),
      reason: String(formData.get("reason") ?? ""),
      correctsId,
    });
  } catch (err) {
    if (err instanceof CorreccionError) return { error: err.message };
    console.error("Error en correccionAction:", err);
    return { error: "Error del servidor. Inténtalo de nuevo." };
  }

  revalidatePath("/dashboard/informes");
  return { ok: true };
}
