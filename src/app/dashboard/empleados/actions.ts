"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { employeeSchema } from "@/lib/validation";
import {
  createEmployee,
  setEmployeeActive,
  EmployeeError,
} from "@/lib/employees";

export type ActionState = { error?: string; ok?: boolean };

/** Solo el OWNER gestiona empleados. */
async function ownerSession() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "OWNER") return null;
  return session.user;
}

export async function createEmployeeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await ownerSession();
  if (!user) {
    return { error: "Solo el propietario puede gestionar empleados." };
  }

  const parsed = employeeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await createEmployee(user.companyId, parsed.data);
  } catch (err) {
    if (err instanceof EmployeeError) return { error: err.message };
    throw err;
  }

  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/fichar");
  return { ok: true };
}

/** Activar/desactivar (form simple, sin estado). */
export async function setActiveAction(formData: FormData) {
  const user = await ownerSession();
  if (!user) return;

  const employeeId = String(formData.get("employeeId") ?? "");
  const active = formData.get("active") === "true";
  if (!employeeId) return;

  try {
    await setEmployeeActive(user.companyId, employeeId, active);
  } catch (err) {
    if (!(err instanceof EmployeeError)) throw err;
  }

  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/fichar");
}
