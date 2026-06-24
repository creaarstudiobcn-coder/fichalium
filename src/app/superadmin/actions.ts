"use server";

import { revalidatePath } from "next/cache";
import { requireSuperadmin } from "@/lib/superadmin/auth";
import type { SuperadminActor } from "@/lib/superadmin/guard";
import {
  suspendCompany,
  unsuspendCompany,
  closeCompany,
  purgeCompany,
  SuperadminError,
} from "@/lib/superadmin/companies";

export type SaState = { error?: string; ok?: boolean };

function revalidate() {
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/suscripciones");
}

/** Ejecuta una acción simple (suspend/unsuspend/close) con verificación previa. */
async function guarded(
  formData: FormData,
  fn: (companyId: string, actor: SuperadminActor) => Promise<void>,
): Promise<SaState> {
  const actor = await requireSuperadmin();
  if (!actor) return { error: "No autorizado." };

  const companyId = String(formData.get("companyId") ?? "");
  if (!companyId) return { error: "Empresa no válida." };

  try {
    await fn(companyId, actor);
  } catch (err) {
    if (err instanceof SuperadminError) return { error: err.message };
    throw err;
  }
  revalidate();
  return { ok: true };
}

export async function suspendAction(_p: SaState, formData: FormData) {
  return guarded(formData, suspendCompany);
}

export async function unsuspendAction(_p: SaState, formData: FormData) {
  return guarded(formData, unsuspendCompany);
}

export async function closeAction(_p: SaState, formData: FormData) {
  return guarded(formData, closeCompany);
}

/** Purga (borrado físico): exige confirmar el nombre de la empresa. */
export async function purgeAction(
  _p: SaState,
  formData: FormData,
): Promise<SaState> {
  const actor = await requireSuperadmin();
  if (!actor) return { error: "No autorizado." };

  const companyId = String(formData.get("companyId") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!companyId) return { error: "Empresa no válida." };

  try {
    await purgeCompany(companyId, actor, confirm);
  } catch (err) {
    if (err instanceof SuperadminError) return { error: err.message };
    throw err;
  }
  revalidate();
  return { ok: true };
}
