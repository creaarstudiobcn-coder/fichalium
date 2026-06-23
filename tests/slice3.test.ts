import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { registerCompany } from "@/lib/auth/register";
import {
  listEmployees,
  createEmployee,
  setEmployeeActive,
  EmployeeError,
} from "@/lib/employees";
import {
  clock,
  nextType,
  listEmployeeStatuses,
  FichajeError,
} from "@/lib/fichajes";
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

d("SLICE 3 — empleados + fichaje", () => {
  let A: { companyId: string; ownerId: string };
  let B: { companyId: string; ownerId: string };

  beforeAll(async () => {
    A = await newTenant("A3");
    B = await newTenant("B3");
  });

  afterAll(async () => {
    if (A) await purgeTenant(A.companyId);
    if (B) await purgeTenant(B.companyId);
    await prisma.$disconnect();
  });

  // ───────────── empleados + tenant ─────────────
  describe("gestión de empleados respeta el tenant", () => {
    it("crear empleado en A no es visible desde B", async () => {
      const emp = await createEmployee(A.companyId, {
        name: "Juan Pérez",
        email: "juan@empresa-a.com",
      });
      expect(emp.companyId).toBe(A.companyId);

      const fromB = await listEmployees(B.companyId);
      expect(fromB.find((e) => e.id === emp.id)).toBeUndefined();

      const fromA = await listEmployees(A.companyId);
      expect(fromA.find((e) => e.id === emp.id)).toBeDefined();
    });

    it("el email es único dentro de la empresa, pero NO global", async () => {
      await createEmployee(A.companyId, { name: "Ana", email: "dup@x.com" });
      // mismo email en A → error
      await expect(
        createEmployee(A.companyId, { name: "Otra Ana", email: "dup@x.com" }),
      ).rejects.toBeInstanceOf(EmployeeError);
      // mismo email en B → permitido (no global)
      const inB = await createEmployee(B.companyId, {
        name: "Ana de B",
        email: "dup@x.com",
      });
      expect(inB.companyId).toBe(B.companyId);
    });

    it("desactivar conserva el empleado (active=false), no lo borra", async () => {
      const emp = await createEmployee(A.companyId, {
        name: "Temporal",
        email: "temp@empresa-a.com",
      });
      await setEmployeeActive(A.companyId, emp.id, false);

      const all = await listEmployees(A.companyId);
      const found = all.find((e) => e.id === emp.id);
      expect(found).toBeDefined();
      expect(found?.active).toBe(false);
    });

    it("B no puede desactivar un empleado de A (RLS lo hace invisible)", async () => {
      const emp = await createEmployee(A.companyId, {
        name: "Protegido",
        email: "prot@empresa-a.com",
      });
      await expect(
        setEmployeeActive(B.companyId, emp.id, false),
      ).rejects.toBeInstanceOf(EmployeeError);
    });
  });

  // ───────────── fichaje ─────────────
  describe("fichaje entrada/salida", () => {
    it("nextType alterna: sin fichajes → ENTRADA; tras ENTRADA → SALIDA", () => {
      expect(nextType(null)).toBe("CLOCK_IN");
      expect(nextType("CLOCK_IN")).toBe("CLOCK_OUT");
      expect(nextType("CLOCK_OUT")).toBe("CLOCK_IN");
    });

    it("el fichaje queda asociado a la empresa y empleado correctos", async () => {
      const emp = await createEmployee(A.companyId, {
        name: "Fichador",
        email: "fichador@empresa-a.com",
      });
      const entry = await clock(A.companyId, emp.id, A.ownerId, "CLOCK_IN");
      expect(entry.companyId).toBe(A.companyId);
      expect(entry.employeeId).toBe(emp.id);
      expect(entry.type).toBe("CLOCK_IN");
      expect(entry.createdBy).toBe(A.ownerId);

      // No visible desde B.
      const leaked = await withTenant(B.companyId, (tx) =>
        tx.timeEntry.findUnique({ where: { id: entry.id } }),
      );
      expect(leaked).toBeNull();
    });

    it("NO permite dos ENTRADAS seguidas", async () => {
      const emp = await createEmployee(A.companyId, {
        name: "Doble",
        email: "doble@empresa-a.com",
      });
      await clock(A.companyId, emp.id, A.ownerId, "CLOCK_IN");
      await expect(
        clock(A.companyId, emp.id, A.ownerId, "CLOCK_IN"),
      ).rejects.toBeInstanceOf(FichajeError);
    });

    it("ciclo correcto ENTRADA→SALIDA→ENTRADA y refleja el estado", async () => {
      const emp = await createEmployee(A.companyId, {
        name: "Ciclo",
        email: "ciclo@empresa-a.com",
      });

      await clock(A.companyId, emp.id, A.ownerId, "CLOCK_IN");
      let status = (await listEmployeeStatuses(A.companyId)).find(
        (s) => s.employee.id === emp.id,
      );
      expect(status?.isIn).toBe(true);
      expect(status?.since).toBeInstanceOf(Date);
      expect(status?.nextType).toBe("CLOCK_OUT");

      await clock(A.companyId, emp.id, A.ownerId, "CLOCK_OUT");
      status = (await listEmployeeStatuses(A.companyId)).find(
        (s) => s.employee.id === emp.id,
      );
      expect(status?.isIn).toBe(false);
      expect(status?.since).toBeNull();
      expect(status?.nextType).toBe("CLOCK_IN");

      // y vuelve a poder entrar
      const again = await clock(A.companyId, emp.id, A.ownerId, "CLOCK_IN");
      expect(again.type).toBe("CLOCK_IN");
    });

    it("no se puede fichar SALIDA si el empleado no está dentro", async () => {
      const emp = await createEmployee(A.companyId, {
        name: "SinEntrar",
        email: "sinentrar@empresa-a.com",
      });
      await expect(
        clock(A.companyId, emp.id, A.ownerId, "CLOCK_OUT"),
      ).rejects.toBeInstanceOf(FichajeError);
    });

    it("no se puede fichar a un empleado de otra empresa", async () => {
      const empA = await createEmployee(A.companyId, {
        name: "AjenoA",
        email: "ajeno@empresa-a.com",
      });
      // Intentar ficharlo desde el contexto de B.
      await expect(
        clock(B.companyId, empA.id, B.ownerId, "CLOCK_IN"),
      ).rejects.toBeInstanceOf(FichajeError);
    });
  });
});
