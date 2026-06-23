import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { findUserForLogin } from "@/lib/tenant";
import { hasDb, seedTenant, purgeTenant } from "./helpers";

// Integración: requiere una BD real con la RLS ya aplicada (npm run db:setup).
const d = hasDb ? describe : describe.skip;

d("SLICE 2 — RLS, aislamiento de tenant y append-only", () => {
  let A: Awaited<ReturnType<typeof seedTenant>>;
  let B: Awaited<ReturnType<typeof seedTenant>>;

  beforeAll(async () => {
    A = await seedTenant("A");
    B = await seedTenant("B");
  });

  afterAll(async () => {
    if (A) await purgeTenant(A.companyId);
    if (B) await purgeTenant(B.companyId);
    await prisma.$disconnect();
  });

  // ─────────────────── TEST A: aislamiento en ambos sentidos ───────────────────
  describe("aislamiento de tenant (A no ve B, B no ve A)", () => {
    it("desde A, employees y time_entries solo contienen filas de A", async () => {
      const { employees, entries } = await withTenant(A.companyId, async (tx) => ({
        employees: await tx.employee.findMany(),
        entries: await tx.timeEntry.findMany(),
      }));

      expect(employees.length).toBe(1);
      expect(employees.every((e) => e.companyId === A.companyId)).toBe(true);
      expect(entries.length).toBe(2);
      expect(entries.every((e) => e.companyId === A.companyId)).toBe(true);
    });

    it("desde B, employees y time_entries solo contienen filas de B", async () => {
      const { employees, entries } = await withTenant(B.companyId, async (tx) => ({
        employees: await tx.employee.findMany(),
        entries: await tx.timeEntry.findMany(),
      }));

      expect(employees.every((e) => e.companyId === B.companyId)).toBe(true);
      expect(entries.every((e) => e.companyId === B.companyId)).toBe(true);
    });

    it("desde A, pedir EXPLÍCITAMENTE datos de B devuelve CERO filas (RLS, no filtro de código)", async () => {
      const leaked = await withTenant(A.companyId, async (tx) => ({
        employees: await tx.employee.findMany({ where: { companyId: B.companyId } }),
        entries: await tx.timeEntry.findMany({ where: { companyId: B.companyId } }),
        employeeById: await tx.employee.findUnique({ where: { id: B.employee.id } }),
        entryById: await tx.timeEntry.findUnique({ where: { id: B.clockIn.id } }),
      }));

      expect(leaked.employees).toHaveLength(0);
      expect(leaked.entries).toHaveLength(0);
      expect(leaked.employeeById).toBeNull();
      expect(leaked.entryById).toBeNull();
    });

    it("sin contexto de tenant, las tablas de negocio devuelven CERO filas (fail-closed)", async () => {
      const employees = await prisma.employee.findMany();
      const entries = await prisma.timeEntry.findMany();
      expect(employees).toHaveLength(0);
      expect(entries).toHaveLength(0);
    });

    it("A no puede INSERTAR un fichaje a nombre de la empresa B (WITH CHECK)", async () => {
      await expect(
        withTenant(A.companyId, (tx) =>
          tx.timeEntry.create({
            data: {
              companyId: B.companyId, // intento de cross-tenant
              employeeId: B.employee.id,
              type: "CLOCK_IN",
              timestamp: new Date(),
              createdBy: A.ownerId,
            },
          }),
        ),
      ).rejects.toThrow();
    });
  });

  // ─────────────────── TEST B: append-only ───────────────────
  describe("append-only de time_entries", () => {
    it("UPDATE sobre un fichaje falla", async () => {
      await expect(
        withTenant(A.companyId, (tx) =>
          tx.timeEntry.update({
            where: { id: A.clockIn.id },
            data: { type: "CLOCK_OUT" },
          }),
        ),
      ).rejects.toThrow();
    });

    it("DELETE sobre un fichaje falla", async () => {
      await expect(
        withTenant(A.companyId, (tx) =>
          tx.timeEntry.delete({ where: { id: A.clockIn.id } }),
        ),
      ).rejects.toThrow();

      // El fichaje sigue ahí.
      const still = await withTenant(A.companyId, (tx) =>
        tx.timeEntry.findUnique({ where: { id: A.clockIn.id } }),
      );
      expect(still).not.toBeNull();
    });
  });

  // ─────────────────── TEST C: corrección ───────────────────
  describe("corrección = INSERT nuevo con corrects_id", () => {
    it("inserta una corrección que referencia al original y deja rastro", async () => {
      const correction = await withTenant(A.companyId, (tx) =>
        tx.timeEntry.create({
          data: {
            companyId: A.companyId,
            employeeId: A.employee.id,
            type: "CLOCK_IN",
            timestamp: new Date(),
            correctsId: A.clockIn.id,
            createdBy: A.ownerId,
            reason: "Fichaje original con hora incorrecta",
          },
        }),
      );

      expect(correction.id).not.toBe(A.clockIn.id);
      expect(correction.correctsId).toBe(A.clockIn.id);
      expect(correction.reason).toBeTruthy();

      // El original sigue intacto y accesible.
      const original = await withTenant(A.companyId, (tx) =>
        tx.timeEntry.findUnique({ where: { id: A.clockIn.id } }),
      );
      expect(original).not.toBeNull();
      expect(original?.correctsId).toBeNull();
    });
  });

  // ─────────────────── login: lookup cross-tenant acotado ───────────────────
  describe("login (búsqueda por email vía flag bootstrap)", () => {
    it("findUserForLogin encuentra al owner de A y trae su companyId", async () => {
      const owner = await withTenant(A.companyId, (tx) =>
        tx.user.findUnique({ where: { id: A.ownerId } }),
      );
      const found = await findUserForLogin(owner!.email);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(A.ownerId);
      expect(found?.companyId).toBe(A.companyId);
    });

    it("el flag bootstrap NO abre las tablas de negocio (employees sigue a 0)", async () => {
      // findUserForLogin activa app.bootstrap, pero ese flag solo afecta a users.
      const employees = await prisma.employee.findMany();
      expect(employees).toHaveLength(0);
    });
  });
});
