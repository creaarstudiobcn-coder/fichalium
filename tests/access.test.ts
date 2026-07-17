import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { registerCompany } from "@/lib/auth/register";
import { createEmployee } from "@/lib/employees";
import { clock } from "@/lib/fichajes";
import { getReport } from "@/lib/reports";
import { withSuperadmin } from "@/lib/superadmin/db";
import {
  canManage,
  canReadRecords,
  blockedMessage,
  getCompanyStatus,
} from "@/lib/access";
import { hasDb, purgeTenant } from "./helpers";

// Política de acceso por estado de plataforma. Lógica pura → corre SIEMPRE,
// también en un CI sin base de datos.
describe("Acceso según el estado de la empresa", () => {
  describe("gestión (fichar, empleados, suscripción)", () => {
    it("solo una empresa ACTIVE gestiona", () => {
      expect(canManage("ACTIVE")).toBe(true);
      expect(canManage("SUSPENDED")).toBe(false);
      expect(canManage("CLOSED")).toBe(false);
    });

    it("sin estado conocido, no (fail-closed)", () => {
      // Empresa purgada o JWT obsoleto: el caso raro NO debe abrir la puerta.
      // El bug original era `if (company && ...)`, que hacía justo lo contrario.
      expect(canManage(null)).toBe(false);
      expect(canManage(undefined)).toBe(false);
    });
  });

  describe("acceso al registro horario", () => {
    it("se conserva SIEMPRE que exista la empresa, aunque no pague", () => {
      // Cláusula 5 de los Términos + RD 8/2019: el registro horario es una
      // obligación legal del cliente (4 años). Un impago no puede dejarle sin
      // poder responder a una Inspección de Trabajo.
      expect(canReadRecords("ACTIVE")).toBe(true);
      expect(canReadRecords("SUSPENDED")).toBe(true);
      expect(canReadRecords("CLOSED")).toBe(true);
    });

    it("una empresa que ya no existe no tiene datos que leer", () => {
      expect(canReadRecords(null)).toBe(false);
    });
  });

  describe("mensajes", () => {
    it("distinguen suspensión de baja y prometen los informes", () => {
      expect(blockedMessage("SUSPENDED")).toMatch(/suspendido/i);
      expect(blockedMessage("CLOSED")).toMatch(/baja/i);
      // Ambos deben decirle al cliente que sus informes siguen ahí.
      expect(blockedMessage("SUSPENDED")).toMatch(/informes/i);
      expect(blockedMessage("CLOSED")).toMatch(/informes/i);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Contra BD: el ciclo real suspender → dar de baja, comprobando que en ningún
// momento se le retira al cliente su registro horario.
// ─────────────────────────────────────────────────────────────────────────
const d = hasDb ? describe : describe.skip;
const cleanup: string[] = [];

d("Estado de plataforma contra BD", () => {
  afterAll(async () => {
    for (const id of cleanup) {
      try {
        await purgeTenant(id);
      } catch {
        // ya purgada
      }
    }
    await prisma.$disconnect();
  });

  it("suspender y dar de baja cortan la gestión pero NUNCA los informes", async () => {
    const { company, user } = await registerCompany({
      companyName: "Suspendida SL",
      name: "Owner",
      email: `susp.${crypto.randomUUID()}@example.com`,
      password: "secret123",
    });
    cleanup.push(company.id);
    const emp = await createEmployee(company.id, {
      name: "Trabajador",
      email: `t.${crypto.randomUUID()}@example.com`,
    });
    await clock(company.id, emp.id, user.id, "CLOCK_IN");

    expect(canManage(await getCompanyStatus(company.id))).toBe(true);

    for (const estado of ["SUSPENDED", "CLOSED"] as const) {
      await withSuperadmin((tx) =>
        tx.company.update({ where: { id: company.id }, data: { status: estado } }),
      );
      const status = await getCompanyStatus(company.id);
      expect(status).toBe(estado);
      expect(canManage(status)).toBe(false); // fichar/empleados/suscripción
      expect(canReadRecords(status)).toBe(true); // informes: obligación legal

      // Y el informe sigue devolviendo sus datos de verdad, no solo el flag.
      const report = await getReport(company.id, {});
      expect(report.entries.length).toBe(1);
    }
  });
});
