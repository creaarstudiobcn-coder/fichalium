import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { registerCompany } from "@/lib/auth/register";
import { createEmployee } from "@/lib/employees";
import { clock } from "@/lib/fichajes";
import { isSuperadmin, parseWhitelist } from "@/lib/superadmin/guard";
import { withSuperadmin } from "@/lib/superadmin/db";
import {
  listCompanies,
  getMetrics,
  suspendCompany,
  unsuspendCompany,
  closeCompany,
  purgeCompany,
} from "@/lib/superadmin/companies";
import { hasDb, purgeTenant } from "./helpers";

const d = hasDb ? describe : describe.skip;

const ACTOR = { userId: "superadmin-test", email: "admin@plataforma.test" };
const cleanup: string[] = [];

async function newTenant(label: string) {
  const { company, user } = await registerCompany({
    companyName: `Empresa ${label}`,
    name: `Owner ${label}`,
    email: `${label}.${crypto.randomUUID()}@example.com`,
    password: "secret123",
  });
  cleanup.push(company.id);
  return { companyId: company.id, ownerId: user.id, name: `Empresa ${label}` };
}

describe("isSuperadmin / parseWhitelist (lógica pura)", () => {
  it("exige rol SUPERADMIN Y email en lista blanca", () => {
    const wl = parseWhitelist("a@x.com, B@Y.com");
    expect(wl).toEqual(["a@x.com", "b@y.com"]);
    expect(isSuperadmin("SUPERADMIN", "a@x.com", wl)).toBe(true);
    expect(isSuperadmin("SUPERADMIN", "B@Y.com", wl)).toBe(true); // case-insensitive
    expect(isSuperadmin("OWNER", "a@x.com", wl)).toBe(false); // rol insuficiente
    expect(isSuperadmin("SUPERADMIN", "otro@x.com", wl)).toBe(false); // no en lista
    expect(isSuperadmin("SUPERADMIN", "a@x.com", [])).toBe(false); // lista vacía = nadie
    expect(isSuperadmin("SUPERADMIN", null, wl)).toBe(false);
  });
});

d("Superadmin — acceso global controlado y acciones", () => {
  let A: { companyId: string; ownerId: string; name: string };
  let B: { companyId: string; ownerId: string; name: string };

  beforeAll(async () => {
    A = await newTenant("A7");
    B = await newTenant("B7");
    // A: 2 empleados (1 activo, 1 inactivo)
    const e1 = await createEmployee(A.companyId, {
      name: "Activo",
      email: `act.${crypto.randomUUID()}@x.com`,
    });
    const e2 = await createEmployee(A.companyId, {
      name: "Inactivo",
      email: `ina.${crypto.randomUUID()}@x.com`,
    });
    await withTenant(A.companyId, (tx) =>
      tx.employee.update({ where: { id: e2.id }, data: { active: false } }),
    );
    void e1;
  });

  afterAll(async () => {
    for (const id of cleanup) {
      try {
        await purgeTenant(id);
      } catch {
        // ya purgada en un test (p. ej. el de purgeCompany)
      }
    }
    await prisma.$disconnect();
  });

  describe("RLS: lectura global SIN exponer PII", () => {
    it("withSuperadmin ve las empresas de A y B", async () => {
      const ids = await withSuperadmin((tx) =>
        tx.company.findMany({ select: { id: true } }),
      );
      const set = new Set(ids.map((c) => c.id));
      expect(set.has(A.companyId)).toBe(true);
      expect(set.has(B.companyId)).toBe(true);
    });

    it("el flag superadmin NO abre filas de employees (fail-closed)", async () => {
      const emps = await withSuperadmin((tx) => tx.employee.findMany());
      expect(emps).toEqual([]);
    });

    it("sin contexto ni flag, companies es invisible", async () => {
      const raw = await prisma.company.findMany();
      expect(raw).toEqual([]);
    });
  });

  describe("conteos agregados (SECURITY DEFINER)", () => {
    it("devuelve conteos correctos por empresa", async () => {
      const companies = await listCompanies();
      const a = companies.find((c) => c.id === A.companyId);
      expect(a?.employeeCount).toBe(2);
      expect(a?.activeEmployeeCount).toBe(1);
      expect(a?.userCount).toBe(1); // el owner
    });

    it("la función agregada exige el flag (excepción sin él)", async () => {
      await expect(
        prisma.$queryRawUnsafe("SELECT * FROM superadmin_company_stats()"),
      ).rejects.toThrow();
    });
  });

  describe("métricas", () => {
    it("cuenta empresas totales (>=2) y altas recientes", async () => {
      const m = await getMetrics();
      expect(m.totalCompanies).toBeGreaterThanOrEqual(2);
      expect(m.recentSignups).toBeGreaterThanOrEqual(2);
      expect(typeof m.mrrEur).toBe("number");
    });
  });

  describe("suspender / reactivar / baja + auditoría", () => {
    it("suspendCompany marca SUSPENDED y audita; unsuspend revierte", async () => {
      const S = await newTenant("S7");
      await suspendCompany(S.companyId, ACTOR);

      let c = await withSuperadmin((tx) =>
        tx.company.findUnique({ where: { id: S.companyId }, select: { status: true } }),
      );
      expect(c?.status).toBe("SUSPENDED");

      const audits = await withSuperadmin((tx) =>
        tx.auditLog.findMany({ where: { targetCompanyId: S.companyId } }),
      );
      expect(audits.some((a) => a.action === "SUSPEND")).toBe(true);

      await unsuspendCompany(S.companyId, ACTOR);
      c = await withSuperadmin((tx) =>
        tx.company.findUnique({ where: { id: S.companyId }, select: { status: true } }),
      );
      expect(c?.status).toBe("ACTIVE");
    });

    it("closeCompany marca CLOSED (sin suscripción no toca Stripe)", async () => {
      const C = await newTenant("C7");
      await closeCompany(C.companyId, ACTOR);
      const c = await withSuperadmin((tx) =>
        tx.company.findUnique({ where: { id: C.companyId }, select: { status: true } }),
      );
      expect(c?.status).toBe("CLOSED");
    });
  });

  describe("purga RGPD", () => {
    it("borra todos los datos del tenant y conserva el AuditLog", async () => {
      const P = await newTenant("P7");
      const emp = await createEmployee(P.companyId, {
        name: "Borrable",
        email: `del.${crypto.randomUUID()}@x.com`,
      });
      await clock(P.companyId, emp.id, P.ownerId, "CLOCK_IN");

      await purgeCompany(P.companyId, ACTOR, P.name);

      // Empresa y datos eliminados.
      const c = await withSuperadmin((tx) =>
        tx.company.findUnique({ where: { id: P.companyId } }),
      );
      expect(c).toBeNull();

      // El AuditLog de PURGE sobrevive (con el nombre en details).
      const audits = await withSuperadmin((tx) =>
        tx.auditLog.findMany({ where: { action: "PURGE" } }),
      );
      const entry = audits.find(
        (a) => (a.details as { name?: string } | null)?.name === P.name,
      );
      expect(entry).toBeDefined();
    });

    it("rechaza la purga si el nombre no coincide", async () => {
      const Q = await newTenant("Q7");
      await expect(
        purgeCompany(Q.companyId, ACTOR, "nombre incorrecto"),
      ).rejects.toThrow();
    });
  });

  describe("seguridad del rol", () => {
    it("registerCompany nunca crea un SUPERADMIN", async () => {
      const r = await newTenant("R7");
      const user = await withTenant(r.companyId, (tx) =>
        tx.user.findFirst({ where: { id: r.ownerId }, select: { role: true } }),
      );
      expect(user?.role).toBe("OWNER");
    });
  });
});
