"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { clock, FichajeError } from "@/lib/fichajes";

export type ClockState = { error?: string; ok?: boolean };

export async function clockAction(
  _prev: ClockState,
  formData: FormData,
): Promise<ClockState> {
  const session = await auth();
  if (!session?.user) return { error: "Sesión no válida." };

  const employeeId = String(formData.get("employeeId") ?? "");
  const type = String(formData.get("type") ?? "");
  if (type !== "CLOCK_IN" && type !== "CLOCK_OUT") {
    return { error: "Tipo de fichaje no válido." };
  }

  try {
    await clock(session.user.companyId, employeeId, session.user.id, type);
  } catch (err) {
    if (err instanceof FichajeError) return { error: err.message };
    throw err;
  }

  revalidatePath("/dashboard/fichar");
  return { ok: true };
}
