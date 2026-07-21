import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { withTenant } from "@/lib/tenant";
import { listEmployees } from "@/lib/employees";
import {
  getReport,
  parseReportFilters,
  scopeReportToViewer,
} from "@/lib/reports";
import { formatMadrid, formatMadridDate } from "@/lib/datetime";
import { buildInformePdf } from "./InformePdf";

// @react-pdf/renderer necesita el runtime Node (no edge).
export const runtime = "nodejs";

/** Escapa un campo para CSV (RFC 4180): comillas dobles si hay coma/comilla/salto. */
function csvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildFilename(base: string, ext: string, from?: string, to?: string) {
  const span = from || to ? `_${from ?? "inicio"}_${to ?? "fin"}` : "";
  return `${base}${span}.${ext}`;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { companyId } = session.user;

  const params = Object.fromEntries(req.nextUrl.searchParams);
  // NO se comprueba el estado de la empresa A PROPÓSITO: una empresa suspendida
  // o de baja conserva el acceso a su registro horario. Lo exige la cláusula 5
  // de los Términos y el RD 8/2019 (conservación 4 años + entrega a Inspección).
  // Lo que se bloquea es la GESTIÓN, no los datos. Ver src/lib/access.ts.
  //
  // Este handler NO pasa por dashboard/layout.tsx (en App Router los layouts no
  // corren para route handlers), así que el alcance se re-verifica aquí: un
  // EMPLOYEE solo exporta SU jornada, ignorando el employeeId de la URL.
  const scope = scopeReportToViewer(parseReportFilters(params), session.user);
  if (!scope) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const filters = scope;
  const format = params.format === "csv" ? "csv" : "pdf";

  // Nombre de empresa + del empleado filtrado (todo dentro del tenant).
  const company = await withTenant(companyId, (tx) =>
    tx.company.findUnique({ where: { id: companyId }, select: { name: true } }),
  );
  const companyName = company?.name ?? "Empresa";

  const employees = await listEmployees(companyId);
  const employeeLabel = filters.employeeId
    ? (employees.find((e) => e.id === filters.employeeId)?.name ??
      "Empleado desconocido")
    : "Todos los empleados";

  const rangeLabel = (() => {
    const fmt = (iso: string) => formatMadridDate(new Date(`${iso}T12:00:00Z`));
    if (filters.from && filters.to)
      return `${fmt(filters.from)} — ${fmt(filters.to)}`;
    if (filters.from) return `Desde ${fmt(filters.from)}`;
    if (filters.to) return `Hasta ${fmt(filters.to)}`;
    return "Histórico completo";
  })();

  const report = await getReport(companyId, filters);

  // La ubicación es dato de terceros: solo se exporta al empleador, nunca al
  // propio EMPLOYEE (que solo saca su jornada, sin coordenadas).
  const includeLocation = session.user.role !== "EMPLOYEE";

  if (format === "csv") {
    const header = ["Empleado", "Tipo", "Fecha y hora (España)"];
    if (includeLocation) header.push("Ubicación");
    header.push("Corrección");
    const lines = [header.map(csvField).join(",")];
    for (const e of report.entries) {
      const row = [
        e.employeeName,
        e.type === "CLOCK_IN" ? "Entrada" : "Salida",
        formatMadrid(e.timestamp),
      ];
      if (includeLocation) {
        row.push(
          e.lat !== null && e.lng !== null
            ? `https://www.google.com/maps?q=${e.lat},${e.lng}`
            : "",
        );
      }
      row.push(e.isCorrection ? "Sí" : "");
      lines.push(row.map(csvField).join(","));
    }
    // BOM UTF-8 para que Excel respete los acentos al abrir el CSV.
    const body = "﻿" + lines.join("\r\n");
    const filename = buildFilename(
      "informe-fichajes",
      "csv",
      filters.from,
      filters.to,
    );
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  // PDF
  const buffer = await renderToBuffer(
    buildInformePdf({
      companyName,
      employeeLabel,
      rangeLabel,
      generatedAt: new Date(),
      entries: report.entries,
      dailyHours: report.dailyHours,
      includeLocation,
    }),
  );
  const filename = buildFilename(
    "informe-fichajes",
    "pdf",
    filters.from,
    filters.to,
  );
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
