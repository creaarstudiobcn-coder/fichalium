"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { employeeSchema, inviteSchema } from "@/lib/validation";
import {
  createEmployee,
  setEmployeeActive,
  EmployeeError,
} from "@/lib/employees";
import { createInvitation, InvitationError } from "@/lib/invitations";
import { getSubscription, syncQuantity } from "@/lib/billing/subscription";
import { isActive } from "@/lib/billing/plans";

export type ActionState = { error?: string; ok?: boolean };

const NEEDS_SUB =
  "Necesitas una suscripción activa para gestionar empleados. Ve a Suscripción.";

/** Solo el OWNER gestiona empleados. */
async function ownerSession() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "OWNER") return null;
  return session.user;
}

/** ¿La empresa tiene la suscripción activa/en prueba? (gating de admin). */
async function hasActiveSubscription(companyId: string) {
  const sub = await getSubscription(companyId);
  return isActive(sub?.status);
}

export async function createEmployeeAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await ownerSession();
  if (!user) {
    return { error: "Solo el propietario puede gestionar empleados." };
  }
  if (!(await hasActiveSubscription(user.companyId))) {
    return { error: NEEDS_SUB };
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

  await syncQuantity(user.companyId); // ajusta el tramo facturado
  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/fichar");
  return { ok: true };
}

export type InviteState = { error?: string; inviteUrl?: string };

/** Genera una invitación para un empleado y devuelve el enlace para copiar. */
export async function createInvitationAction(
  _prev: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const user = await ownerSession();
  if (!user) {
    return { error: "Solo el propietario puede invitar empleados." };
  }
  if (!(await hasActiveSubscription(user.companyId))) {
    return { error: NEEDS_SUB };
  }

  const parsed = inviteSchema.safeParse({
    employeeId: formData.get("employeeId"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let token: string;
  try {
    ({ token } = await createInvitation(
      user.companyId,
      user.id,
      parsed.data.employeeId,
    ));
  } catch (err) {
    if (err instanceof InvitationError) return { error: err.message };
    throw err;
  }

  // El enlace se arma con el origin de la petición actual.
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const inviteUrl = `${proto}://${host}/invitacion/${token}`;

  revalidatePath("/dashboard/empleados");
  return { inviteUrl };
}

/** Activar/desactivar (form simple, sin estado). */
export async function setActiveAction(formData: FormData) {
  const user = await ownerSession();
  if (!user) return;

  const employeeId = String(formData.get("employeeId") ?? "");
  const active = formData.get("active") === "true";
  if (!employeeId) return;

  // Reactivar sube la plantilla → requiere suscripción activa. Desactivar
  // (bajar plantilla) se permite siempre, incluso con la suscripción inactiva.
  if (active && !(await hasActiveSubscription(user.companyId))) return;

  try {
    await setEmployeeActive(user.companyId, employeeId, active);
  } catch (err) {
    if (!(err instanceof EmployeeError)) throw err;
  }

  await syncQuantity(user.companyId); // ajusta el tramo facturado
  revalidatePath("/dashboard/empleados");
  revalidatePath("/dashboard/fichar");
}
