import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { registerCompany } from "@/lib/auth/register";
import {
  computeDailyHours,
  getReport,
  type PairableEntry,
} from "@/lib/reports";
import { madridDayKey } from "@/lib/datetime";
import { hasDb, purgeTenant } from "./helpers";

// ─────────────────────────────────────────────────────────────────────────
// 1) CÁLCULO DE HORAS — función pura, sin BD (siempre se ejecuta).
//    Garantiza que el emparejado entrada→salida y la suma por día son correctos.
// ─────────────────────────────────────────────────────────────────────────
describe("SLICE 4 — computeDailyHours (emparejado puro)", () => {
  const emp = (
    type: "CLOCK_IN" | "CLOCK_OUT",
    iso: string,
  ): PairableEntry => ({
    employeeId: "e1",
    employeeName: "Empleado Uno",
    type,
    timestamp: new Date(iso),
  });

  it("empareja una entrada con su salida y calcula los minutos", () => {
    // 07:00Z→15:00Z = 8h (en Madrid 09:00→17:00, mismo día).
    const res = computeDailyHours([
      emp("CLOCK_IN", "2026-06-23T07:00:00Z"),
      emp("CLOCK_OUT", "2026-06-23T15:00:00Z"),
    ]);
    expect(res).toHaveLength(1);
    expect(res[0].minutes).toBe(480);
    expect(res[0].day).toBe("2026-06-23");
    expect(res[0].pairs[0].ongoing).toBe(false);
  });

  it("suma varios tramos del mismo día", () => {
    const res = computeDailyHours([
      emp("CLOCK_IN", "2026-06-23T07:00:00Z"),
      emp("CLOCK_OUT", "2026-06-23T11:00:00Z"), // 4h
      emp("CLOCK_IN", "2026-06-23T12:00:00Z"),
      emp("CLOCK_OUT", "2026-06-23T15:00:00Z"), // 3h
    ]);
    expect(res).toHaveLength(1);
    expect(res[0].minutes).toBe(420); // 7h
    expect(res[0].pairs).toHaveLength(2);
  });

  it("imputa el turno que cruza medianoche al día de la ENTRADA", () => {
    // Entrada 23:00 Madrid del 23, salida 01:30 Madrid del 24.
    const res = computeDailyHours([
      emp("CLOCK_IN", "2026-06-23T21:00:00Z"),
      emp("CLOCK_OUT", "2026-06-23T23:30:00Z"),
    ]);
    expect(res).toHaveLength(1);
    expect(res[0].day).toBe("2026-06-23");
    expect(res[0].minutes).toBe(150);
  });

  it("turno abierto: cuenta hasta openEnd y lo marca en curso", () => {
    const withEnd = computeDailyHours(
      [emp("CLOCK_IN", "2026-06-23T07:00:00Z")],
      { openEnd: new Date("2026-06-23T09:00:00Z") },
    );
    expect(withEnd[0].minutes).toBe(120);
    expect(withEnd[0].pairs[0].ongoing).toBe(true);

    const noEnd = computeDailyHours([emp("CLOCK_IN", "2026-06-23T07:00:00Z")]);
    expect(noEnd[0].minutes).toBe(0);
    expect(noEnd[0].pairs[0].ongoing).toBe(true);
  });

  it("ignora salidas huérfanas y entradas duplicadas", () => {
    const res = computeDailyHours([
      emp("CLOCK_OUT", "2026-06-23T06:00:00Z"), // huérfana → ignorada
      emp("CLOCK_IN", "2026-06-23T07:00:00Z"),
      emp("CLOCK_IN", "2026-06-23T08:00:00Z"), // duplicada → ignorada
      emp("CLOCK_OUT", "2026-06-23T15:00:00Z"),
    ]);
    expect(res[0].minutes).toBe(480); // 07:00→15:00, el resto no cuenta
    expect(res[0].pairs).toHaveLength(1);
  });

  it("separa días distintos del mismo empleado", () => {
    const res = computeDailyHours([
      emp("CLOCK_IN", "2026-06-23T07:00:00Z"),
      emp("CLOCK_OUT", "2026-06-23T09:00:00Z"),
      emp("CLOCK_IN", "2026-06-24T07:00:00Z"),
      emp("CLOCK_OUT", "2026-06-24T10:00:00Z"),
    ]);
    expect(res).toHaveLength(2);
    expect(res.map((d) => d.day)).toEqual(["2026-06-23", "2026-06-24"]);
    expect(res[0].minutes).toBe(120);
    expect(res[1].minutes).toBe(180);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// 2) INFORME CONTRA BD — aislamiento de tenant + corrección que sustituye.
//    Solo si hay BD real configurada (igual que el resto de tests de integración).
// ─────────────────────────────────────────────────────────────────────────
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

async function addEmployee(companyId: string, name: string) {
  return withTenant(companyId, (tx) =>
    tx.employee.create({
      data: { companyId, name, email: `${crypto.randomUUID()}@x.com` },
    }),
  );
}

async function addEntry(
  companyId: string,
  employeeId: string,
  createdBy: string,
  type: "CLOCK_IN" | "CLOCK_OUT",
  iso: string,
  correctsId?: string,
) {
  return withTenant(companyId, (tx) =>
    tx.timeEntry.create({
      data: {
        companyId,
        employeeId,
        createdBy,
        type,
        timestamp: new Date(iso),
        correctsId,
        reason: correctsId ? "Corrección de prueba" : undefined,
      },
    }),
  );
}

d("SLICE 4 — informe contra BD", () => {
  let A: { companyId: string; ownerId: string };
  let B: { companyId: string; ownerId: string };

  beforeAll(async () => {
    A = await newTenant("A4");
    B = await newTenant("B4");
  });

  afterAll(async () => {
    if (A) await purgeTenant(A.companyId);
    if (B) await purgeTenant(B.companyId);
    await prisma.$disconnect();
  });

  it("el informe respeta el tenant: A no ve los fichajes de B", async () => {
    const empA = await addEmployee(A.companyId, "Empleado A");
    const empB = await addEmployee(B.companyId, "Empleado B");
    await addEntry(A.companyId, empA.id, A.ownerId, "CLOCK_IN", "2026-06-20T07:00:00Z");
    await addEntry(B.companyId, empB.id, B.ownerId, "CLOCK_IN", "2026-06-20T07:00:00Z");

    const reportA = await getReport(A.companyId);
    // Todo lo que ve A pertenece a empleados de A.
    expect(reportA.entries.length).toBeGreaterThan(0);
    expect(reportA.entries.every((e) => e.employeeId === empA.id)).toBe(true);
    expect(reportA.entries.some((e) => e.employeeId === empB.id)).toBe(false);

    const reportB = await getReport(B.companyId);
    expect(reportB.entries.every((e) => e.employeeId === empB.id)).toBe(true);
  });

  it("filtra por empleado y por rango de fechas", async () => {
    const emp1 = await addEmployee(A.companyId, "Filtro Uno");
    const emp2 = await addEmployee(A.companyId, "Filtro Dos");
    await addEntry(A.companyId, emp1.id, A.ownerId, "CLOCK_IN", "2026-05-10T07:00:00Z");
    await addEntry(A.companyId, emp2.id, A.ownerId, "CLOCK_IN", "2026-05-11T07:00:00Z");

    const soloEmp1 = await getReport(A.companyId, { employeeId: emp1.id });
    expect(soloEmp1.entries.every((e) => e.employeeId === emp1.id)).toBe(true);

    const rango = await getReport(A.companyId, {
      from: "2026-05-10",
      to: "2026-05-10",
    });
    // Solo el fichaje del día 10 (de cualquier empleado de A creado ese día).
    expect(
      rango.entries.every((e) => madridDayKey(e.timestamp) === "2026-05-10"),
    ).toBe(true);
    expect(rango.entries.some((e) => e.employeeId === emp1.id)).toBe(true);
    expect(rango.entries.some((e) => e.employeeId === emp2.id)).toBe(false);
  });

  it("una corrección sustituye al fichaje original en el cálculo de horas", async () => {
    const emp = await addEmployee(A.companyId, "Corregido");
    await addEntry(A.companyId, emp.id, A.ownerId, "CLOCK_IN", "2026-04-01T06:00:00Z");
    const originalOut = await addEntry(
      A.companyId,
      emp.id,
      A.ownerId,
      "CLOCK_OUT",
      "2026-04-01T14:00:00Z", // 8h con la entrada
    );
    // Corrección: la salida real fue una hora más tarde (9h en total).
    await addEntry(
      A.companyId,
      emp.id,
      A.ownerId,
      "CLOCK_OUT",
      "2026-04-01T15:00:00Z",
      originalOut.id,
    );

    const report = await getReport(A.companyId, {
      employeeId: emp.id,
      from: "2026-04-01",
      to: "2026-04-01",
    });

    // La tabla muestra los 3 registros, con la corrección marcada.
    expect(report.entries).toHaveLength(3);
    expect(report.entries.filter((e) => e.isCorrection)).toHaveLength(1);

    // Las horas usan la corrección (9h = 540 min), no el original (8h).
    const day = report.dailyHours.find((dh) => dh.day === "2026-04-01");
    expect(day).toBeDefined();
    expect(day?.minutes).toBe(540);
  });
});
