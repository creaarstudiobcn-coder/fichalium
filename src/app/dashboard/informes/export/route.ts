import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/auth";
import { withTenant } from "@/lib/tenant";
import { listEmployees } from "@/lib/employees";
import { getReport, parseReportFilters } from "@/lib/reports";
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
  const filters = parseReportFilters(params);
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

  if (format === "csv") {
    const header = ["Empleado", "Tipo", "Fecha y hora (España)", "Corrección"];
    const lines = [header.map(csvField).join(",")];
    for (const e of report.entries) {
      lines.push(
        [
          e.employeeName,
          e.type === "CLOCK_IN" ? "Entrada" : "Salida",
          formatMadrid(e.timestamp),
          e.isCorrection ? "Sí" : "",
        ]
          .map(csvField)
          .join(","),
      );
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
