import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { registerCompany } from "@/lib/auth/register";
import { createEmployee } from "@/lib/employees";
import { registrarCorreccion, CorreccionError } from "@/lib/corrections";
import { getReport } from "@/lib/reports";
import { madridWallTimeToUtc } from "@/lib/datetime";
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

/** Crea un empleado con un fichaje del tipo/hora indicados (hora de pared ES). */
async function seedEntry(
  companyId: string,
  ownerId: string,
  employeeId: string,
  type: "CLOCK_IN" | "CLOCK_OUT",
  wall: string,
) {
  return withTenant(companyId, (tx) =>
    tx.timeEntry.create({
      data: {
        companyId,
        employeeId,
        type,
        timestamp: madridWallTimeToUtc(`${wall}:00`),
        createdBy: ownerId,
      },
    }),
  );
}

d("SLICE 9 — correcciones de fichaje", () => {
  let A: { companyId: string; ownerId: string };
  let B: { companyId: string; ownerId: string };

  beforeAll(async () => {
    A = await newTenant("A9");
    B = await newTenant("B9");
  });

  afterAll(async () => {
    if (A) await purgeTenant(A.companyId);
    if (B) await purgeTenant(B.companyId);
    await prisma.$disconnect();
  });

  it("rechaza motivo vacío y fechas futuras", async () => {
    const emp = await createEmployee(A.companyId, {
      name: "Val",
      email: `${crypto.randomUUID()}@x.com`,
    });
    await expect(
      registrarCorreccion(A.companyId, A.ownerId, {
        employeeId: emp.id,
        type: "CLOCK_IN",
        timestampLocal: "2026-07-01T09:00",
        reason: "  ",
      }),
    ).rejects.toThrow(CorreccionError);

    await expect(
      registrarCorreccion(A.companyId, A.ownerId, {
        employeeId: emp.id,
        type: "CLOCK_IN",
        timestampLocal: "2999-01-01T09:00",
        reason: "prueba futuro",
      }),
    ).rejects.toThrow(/futura/i);
  });

  it("añade la salida olvidada (manual, sin correctsId) y calcula las horas", async () => {
    const emp = await createEmployee(A.companyId, {
      name: "Olvido",
      email: `${crypto.randomUUID()}@x.com`,
    });
    // Solo hay ENTRADA a las 09:00; falta la salida → 0 h cerradas.
    await seedEntry(A.companyId, A.ownerId, emp.id, "CLOCK_IN", "2026-07-02T09:00");

    let report = await getReport(A.companyId, {
      employeeId: emp.id,
      from: "2026-07-02",
      to: "2026-07-02",
    });
    // Turno abierto sin salida: 0 minutos cerrados (no se puede medir).
    expect(report.dailyHours.reduce((s, d) => s + d.minutes, 0)).toBe(0);

    // Añadimos la salida a las 17:00.
    await registrarCorreccion(A.companyId, A.ownerId, {
      employeeId: emp.id,
      type: "CLOCK_OUT",
      timestampLocal: "2026-07-02T17:00",
      reason: "Olvidó fichar la salida",
    });

    report = await getReport(A.companyId, {
      employeeId: emp.id,
      from: "2026-07-02",
      to: "2026-07-02",
    });
    expect(report.dailyHours).toHaveLength(1);
    expect(report.dailyHours[0].minutes).toBe(8 * 60);
  });

  it("corrige un fichaje: sustituye al original y recalcula (sin doble conteo)", async () => {
    const emp = await createEmployee(A.companyId, {
      name: "Corrige",
      email: `${crypto.randomUUID()}@x.com`,
    });
    await seedEntry(A.companyId, A.ownerId, emp.id, "CLOCK_IN", "2026-07-03T09:00");
    const salida = await seedEntry(
      A.companyId,
      A.ownerId,
      emp.id,
      "CLOCK_OUT",
      "2026-07-03T17:00",
    );

    // Corregimos la salida de 17:00 → 18:00.
    await registrarCorreccion(A.companyId, A.ownerId, {
      employeeId: emp.id,
      type: "CLOCK_OUT",
      timestampLocal: "2026-07-03T18:00",
      reason: "Marcó mal la salida",
      correctsId: salida.id,
    });

    const report = await getReport(A.companyId, {
      employeeId: emp.id,
      from: "2026-07-03",
      to: "2026-07-03",
    });

    // Horas: 09:00 → 18:00 = 9 h (no 8+9; el original está sustituido).
    expect(report.dailyHours).toHaveLength(1);
    expect(report.dailyHours[0].minutes).toBe(9 * 60);

    // El original sigue existiendo (append-only) pero marcado como sustituido.
    const original = report.entries.find((e) => e.id === salida.id);
    expect(original).toBeDefined();
    expect(original!.superseded).toBe(true);
    const correccion = report.entries.find((e) => e.isCorrection);
    expect(correccion).toBeDefined();
    expect(correccion!.superseded).toBe(false);
  });

  it("no deja corregir dos veces el mismo original", async () => {
    const emp = await createEmployee(A.companyId, {
      name: "Doble",
      email: `${crypto.randomUUID()}@x.com`,
    });
    const salida = await seedEntry(
      A.companyId,
      A.ownerId,
      emp.id,
      "CLOCK_OUT",
      "2026-07-04T17:00",
    );
    await registrarCorreccion(A.companyId, A.ownerId, {
      employeeId: emp.id,
      type: "CLOCK_OUT",
      timestampLocal: "2026-07-04T18:00",
      reason: "primera",
      correctsId: salida.id,
    });
    await expect(
      registrarCorreccion(A.companyId, A.ownerId, {
        employeeId: emp.id,
        type: "CLOCK_OUT",
        timestampLocal: "2026-07-04T19:00",
        reason: "segunda",
        correctsId: salida.id,
      }),
    ).rejects.toThrow(/ya se corrigió/i);
  });

  it("no permite corregir a un empleado de OTRA empresa (RLS)", async () => {
    const empA = await createEmployee(A.companyId, {
      name: "AjenoA",
      email: `${crypto.randomUUID()}@x.com`,
    });
    // Desde el contexto de B, el empleado de A no existe.
    await expect(
      registrarCorreccion(B.companyId, B.ownerId, {
        employeeId: empA.id,
        type: "CLOCK_IN",
        timestampLocal: "2026-07-05T09:00",
        reason: "intruso",
      }),
    ).rejects.toThrow(/no encontrado/i);
  });
});
