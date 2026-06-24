import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { withTenant, findUserForLogin } from "@/lib/tenant";
import { registerCompany } from "@/lib/auth/register";
import { createEmployee } from "@/lib/employees";
import {
  createInvitation,
  getValidInvitation,
  acceptInvitation,
  InvitationError,
} from "@/lib/invitations";
import { listEmployeeStatuses } from "@/lib/fichajes";
import { hasDb, purgeTenant } from "./helpers";

const d = hasDb ? describe : describe.skip;

async function newTenant(label: string) {
  const { company, user } = await registerCompany({
    companyName: `Empresa ${label}`,
    name: `Owner ${label}`,
    email: `${label}.${crypto.randomUUID()}@example.com`,
    password: "secret123",
  });
  return { companyId: company.id, ownerId: user.id };
}

function empData(label: string) {
  return { name: `Empleado ${label}`, email: `${crypto.randomUUID()}@x.com` };
}

d("SLICE 5 — cuentas e invitaciones de empleados", () => {
  let A: { companyId: string; ownerId: string };
  let B: { companyId: string; ownerId: string };

  beforeAll(async () => {
    A = await newTenant("A5");
    B = await newTenant("B5");
  });

  afterAll(async () => {
    if (A) await purgeTenant(A.companyId);
    if (B) await purgeTenant(B.companyId);
    await prisma.$disconnect();
  });

  describe("ciclo de invitación", () => {
    it("invitar + aceptar crea un User EMPLOYEE enlazado al empleado", async () => {
      const emp = await createEmployee(A.companyId, empData("uno"));
      const { token } = await createInvitation(A.companyId, A.ownerId, emp.id);

      const view = await getValidInvitation(token);
      expect(view.state).toBe("valid");

      await acceptInvitation(token, "claveSegura1");

      // La cuenta existe, es EMPLOYEE y está enlazada al empleado.
      const account = await withTenant(A.companyId, (tx) =>
        tx.user.findFirst({ where: { employeeId: emp.id } }),
      );
      expect(account).not.toBeNull();
      expect(account?.role).toBe("EMPLOYEE");
      expect(account?.companyId).toBe(A.companyId);
      expect(account?.email).toBe(emp.email);

      // Y puede usarse para login (búsqueda por email).
      const forLogin = await findUserForLogin(emp.email);
      expect(forLogin?.employeeId).toBe(emp.id);
    });

    it("el token es de un solo uso: aceptar dos veces falla", async () => {
      const emp = await createEmployee(A.companyId, empData("dos"));
      const { token } = await createInvitation(A.companyId, A.ownerId, emp.id);
      await acceptInvitation(token, "claveSegura1");

      await expect(acceptInvitation(token, "claveSegura1")).rejects.toBeInstanceOf(
        InvitationError,
      );
      expect((await getValidInvitation(token)).state).toBe("accepted");
    });

    it("no se puede invitar a un empleado que ya tiene cuenta", async () => {
      const emp = await createEmployee(A.companyId, empData("tres"));
      const { token } = await createInvitation(A.companyId, A.ownerId, emp.id);
      await acceptInvitation(token, "claveSegura1");

      await expect(
        createInvitation(A.companyId, A.ownerId, emp.id),
      ).rejects.toBeInstanceOf(InvitationError);
    });

    it("una invitación caducada se rechaza", async () => {
      const emp = await createEmployee(A.companyId, empData("cuatro"));
      const { token } = await createInvitation(A.companyId, A.ownerId, emp.id);

      // Caducar manualmente (UPDATE permitido por la política de tenant).
      await withTenant(A.companyId, (tx) =>
        tx.invitation.updateMany({
          where: { employeeId: emp.id, acceptedAt: null },
          data: { expiresAt: new Date(0) },
        }),
      );

      expect((await getValidInvitation(token)).state).toBe("expired");
      await expect(acceptInvitation(token, "claveSegura1")).rejects.toBeInstanceOf(
        InvitationError,
      );
    });
  });

  describe("aislamiento por empresa", () => {
    it("B no puede invitar a un empleado de A", async () => {
      const empA = await createEmployee(A.companyId, empData("deA"));
      await expect(
        createInvitation(B.companyId, B.ownerId, empA.id),
      ).rejects.toBeInstanceOf(InvitationError);
    });

    it("la cuenta creada al aceptar pertenece a A y no es visible desde B", async () => {
      const emp = await createEmployee(A.companyId, empData("cinco"));
      const { token } = await createInvitation(A.companyId, A.ownerId, emp.id);
      await acceptInvitation(token, "claveSegura1");

      const fromB = await withTenant(B.companyId, (tx) =>
        tx.user.findFirst({ where: { employeeId: emp.id } }),
      );
      expect(fromB).toBeNull();
    });
  });

  describe("auto-alcance (solo me veo a mí)", () => {
    it("listEmployeeStatuses con onlyEmployeeId devuelve solo a ese empleado", async () => {
      const yo = await createEmployee(A.companyId, empData("yo"));
      await createEmployee(A.companyId, empData("otro1"));
      await createEmployee(A.companyId, empData("otro2"));

      const mine = await listEmployeeStatuses(A.companyId, {
        onlyEmployeeId: yo.id,
      });
      expect(mine).toHaveLength(1);
      expect(mine[0].employee.id).toBe(yo.id);

      // Sin el filtro, se ven todos (vista OWNER): al menos 3.
      const all = await listEmployeeStatuses(A.companyId);
      expect(all.length).toBeGreaterThanOrEqual(3);
    });
  });
});
