import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { withTenant, findInvitationByToken } from "@/lib/tenant";

export class InvitationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvitationError";
  }
}

/** Validez de una invitación desde que se crea. */
const INVITE_TTL_DAYS = 7;

/** El token crudo viaja en la URL; en BD solo guardamos su SHA-256. */
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Crea una invitación para que un empleado se dé de alta su propia cuenta.
 * Devuelve el TOKEN CRUDO (solo aquí existe en claro) para construir el enlace.
 *
 * Reglas: el empleado debe existir, estar activo y NO tener ya cuenta. Las
 * invitaciones pendientes previas del mismo empleado se invalidan (caducan ya)
 * para que solo el último enlace funcione.
 */
export async function createInvitation(
  companyId: string,
  createdByUserId: string,
  employeeId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await withTenant(companyId, async (tx) => {
    const employee = await tx.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new InvitationError("Empleado no encontrado en esta empresa.");
    }
    if (!employee.active) {
      throw new InvitationError("El empleado está desactivado.");
    }

    const account = await tx.user.findFirst({ where: { employeeId } });
    if (account) {
      throw new InvitationError("El empleado ya tiene una cuenta.");
    }

    // Invalida invitaciones pendientes anteriores (las caduca de inmediato).
    await tx.invitation.updateMany({
      where: { employeeId, acceptedAt: null },
      data: { expiresAt: new Date(0) },
    });

    await tx.invitation.create({
      data: {
        companyId,
        employeeId,
        email: employee.email,
        tokenHash,
        expiresAt,
        createdBy: createdByUserId,
      },
    });
  });

  return { token: rawToken, expiresAt };
}

export type ValidInvitation = {
  state: "valid";
  employeeName: string;
  email: string;
};
export type InvalidInvitation = {
  state: "not_found" | "accepted" | "expired";
};
export type InvitationView = ValidInvitation | InvalidInvitation;

/**
 * Resuelve una invitación por su token crudo para pintar la página de alta.
 * No expone el motivo exacto más allá de lo necesario para guiar al empleado.
 */
export async function getValidInvitation(
  rawToken: string,
): Promise<InvitationView> {
  const inv = await findInvitationByToken(hashToken(rawToken));
  if (!inv) return { state: "not_found" };
  if (inv.acceptedAt) return { state: "accepted" };
  if (inv.expiresAt.getTime() < Date.now()) return { state: "expired" };

  // Conocemos la empresa: leemos el empleado bajo su contexto de tenant.
  const employee = await withTenant(inv.companyId, (tx) =>
    tx.employee.findUnique({ where: { id: inv.employeeId } }),
  );
  if (!employee || !employee.active) return { state: "not_found" };

  return { state: "valid", employeeName: employee.name, email: inv.email };
}

/**
 * Acepta la invitación: crea la cuenta (User rol EMPLOYEE) enlazada al empleado
 * y marca la invitación como usada, todo en una transacción con el contexto
 * fijado a la empresa de la invitación. El INSERT en users pasa la política RLS
 * `users_insert` (company_id = contexto); no hace falta abrir nada más.
 */
export async function acceptInvitation(
  rawToken: string,
  password: string,
): Promise<{ companyId: string; email: string }> {
  const inv = await findInvitationByToken(hashToken(rawToken));
  if (!inv) throw new InvitationError("La invitación no es válida.");
  if (inv.acceptedAt) {
    throw new InvitationError("Esta invitación ya se ha utilizado.");
  }
  if (inv.expiresAt.getTime() < Date.now()) {
    throw new InvitationError("La invitación ha caducado. Pide una nueva.");
  }

  // Hash fuera de la transacción (trabajo de CPU); igual que registerCompany.
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await withTenant(inv.companyId, async (tx) => {
      // Re-lectura bajo contexto: guard de carrera (token usado/caducado entre medias).
      const fresh = await tx.invitation.findUnique({ where: { id: inv.id } });
      if (!fresh || fresh.acceptedAt || fresh.expiresAt.getTime() < Date.now()) {
        throw new InvitationError("La invitación ya no es válida.");
      }

      const employee = await tx.employee.findUnique({
        where: { id: inv.employeeId },
      });
      if (!employee || !employee.active) {
        throw new InvitationError("El empleado ya no está disponible.");
      }

      const existing = await tx.user.findFirst({
        where: { employeeId: inv.employeeId },
      });
      if (existing) {
        throw new InvitationError("El empleado ya tiene una cuenta.");
      }

      await tx.user.create({
        data: {
          email: inv.email,
          name: employee.name,
          passwordHash,
          companyId: inv.companyId,
          role: inv.role,
          employeeId: inv.employeeId,
        },
      });

      await tx.invitation.update({
        where: { id: inv.id },
        data: { acceptedAt: new Date() },
      });
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new InvitationError(
        "Ya existe una cuenta con ese email. Contacta con tu empresa.",
      );
    }
    throw err;
  }

  return { companyId: inv.companyId, email: inv.email };
}
