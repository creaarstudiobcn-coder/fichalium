import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ReportEntry, DayHours } from "@/lib/reports";
import {
  formatMadrid,
  formatMadridDate,
  formatDuration,
} from "@/lib/datetime";

// Helvetica (fuente estándar incrustada) cubre los acentos del castellano.
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1e293b",
  },
  company: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  title: { fontSize: 11, marginTop: 2, color: "#334155" },
  meta: { fontSize: 9, marginTop: 8, color: "#475569" },
  metaRow: { flexDirection: "row", marginTop: 2 },
  metaLabel: { width: 90, color: "#64748b" },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginTop: 20,
    marginBottom: 6,
    color: "#0f172a",
  },
  table: { borderTopWidth: 1, borderColor: "#e2e8f0" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 4,
  },
  headRow: { backgroundColor: "#f1f5f9" },
  headCell: { fontFamily: "Helvetica-Bold", color: "#334155" },
  cell: { paddingHorizontal: 4 },
  // anchos del historial (sin columna de ubicación)
  cEmpleado: { width: "34%" },
  cTipo: { width: "18%" },
  cFecha: { width: "33%" },
  cCorr: { width: "15%" },
  // anchos del historial CON columna de ubicación (solo empleador)
  gEmpleado: { width: "27%" },
  gTipo: { width: "13%" },
  gFecha: { width: "27%" },
  gUbic: { width: "21%" },
  gCorr: { width: "12%" },
  // anchos del resumen de horas
  hEmpleado: { width: "45%" },
  hDia: { width: "35%" },
  hHoras: { width: "20%", textAlign: "right" },
  in: { color: "#15803d" },
  out: { color: "#b45309" },
  badge: { color: "#7c3aed" },
  empty: { marginTop: 8, color: "#64748b", fontStyle: "italic" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: "#94a3b8",
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    paddingTop: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export type InformePdfProps = {
  companyName: string;
  employeeLabel: string;
  rangeLabel: string;
  generatedAt: Date;
  entries: ReportEntry[];
  dailyHours: DayHours[];
  /** Añade la columna de ubicación (solo cuando lo pide el empleador). */
  includeLocation?: boolean;
};

export function buildInformePdf(props: InformePdfProps) {
  const {
    companyName,
    employeeLabel,
    rangeLabel,
    generatedAt,
    entries,
    dailyHours,
    includeLocation = false,
  } = props;

  // Anchos de columna según haya o no columna de ubicación.
  const col = includeLocation
    ? {
        empleado: styles.gEmpleado,
        tipo: styles.gTipo,
        fecha: styles.gFecha,
        corr: styles.gCorr,
      }
    : {
        empleado: styles.cEmpleado,
        tipo: styles.cTipo,
        fecha: styles.cFecha,
        corr: styles.cCorr,
      };

  return (
    <Document
      title={`Registro de jornada — ${companyName}`}
      author={companyName}
    >
      <Page size="A4" style={styles.page}>
        <Text style={styles.company}>{companyName}</Text>
        <Text style={styles.title}>Registro de jornada laboral</Text>

        <View style={styles.meta}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Periodo:</Text>
            <Text>{rangeLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Empleado:</Text>
            <Text>{employeeLabel}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Generado:</Text>
            <Text>{formatMadrid(generatedAt)} (hora de España)</Text>
          </View>
        </View>

        {/* ───────── Historial de fichajes ───────── */}
        <Text style={styles.sectionTitle}>Detalle de fichajes</Text>
        {entries.length === 0 ? (
          <Text style={styles.empty}>
            No hay fichajes en el periodo seleccionado.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.row, styles.headRow]} fixed>
              <Text style={[styles.cell, col.empleado, styles.headCell]}>
                Empleado
              </Text>
              <Text style={[styles.cell, col.tipo, styles.headCell]}>
                Tipo
              </Text>
              <Text style={[styles.cell, col.fecha, styles.headCell]}>
                Fecha y hora (España)
              </Text>
              {includeLocation && (
                <Text style={[styles.cell, styles.gUbic, styles.headCell]}>
                  Ubicación (lat, lng)
                </Text>
              )}
              <Text style={[styles.cell, col.corr, styles.headCell]}>
                Corrección
              </Text>
            </View>
            {entries.map((e) => (
              <View key={e.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, col.empleado]}>
                  {e.employeeName}
                </Text>
                <Text
                  style={[
                    styles.cell,
                    col.tipo,
                    e.type === "CLOCK_IN" ? styles.in : styles.out,
                  ]}
                >
                  {e.type === "CLOCK_IN" ? "Entrada" : "Salida"}
                </Text>
                <Text style={[styles.cell, col.fecha]}>
                  {formatMadrid(e.timestamp)}
                </Text>
                {includeLocation && (
                  <Text style={[styles.cell, styles.gUbic]}>
                    {e.lat !== null && e.lng !== null
                      ? `${e.lat.toFixed(5)}, ${e.lng.toFixed(5)}`
                      : "—"}
                  </Text>
                )}
                <Text style={[styles.cell, col.corr, styles.badge]}>
                  {e.isCorrection ? "Corrección" : ""}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ───────── Horas trabajadas por día ───────── */}
        <Text style={styles.sectionTitle}>Horas trabajadas por día</Text>
        {dailyHours.length === 0 ? (
          <Text style={styles.empty}>
            No hay tramos completos para calcular horas.
          </Text>
        ) : (
          <View style={styles.table}>
            <View style={[styles.row, styles.headRow]} fixed>
              <Text style={[styles.cell, styles.hEmpleado, styles.headCell]}>
                Empleado
              </Text>
              <Text style={[styles.cell, styles.hDia, styles.headCell]}>
                Día
              </Text>
              <Text style={[styles.cell, styles.hHoras, styles.headCell]}>
                Horas
              </Text>
            </View>
            {dailyHours.map((d) => (
              <View
                key={`${d.employeeId}-${d.day}`}
                style={styles.row}
                wrap={false}
              >
                <Text style={[styles.cell, styles.hEmpleado]}>
                  {d.employeeName}
                </Text>
                <Text style={[styles.cell, styles.hDia]}>
                  {formatMadridDate(new Date(`${d.day}T12:00:00Z`))}
                  {d.pairs.some((p) => p.ongoing) ? " (en curso)" : ""}
                </Text>
                <Text style={[styles.cell, styles.hHoras]}>
                  {formatDuration(d.minutes)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            Documento generado por el sistema de control horario. Conforme al
            registro diario de jornada (art. 34.9 ET).
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `${pageNumber} / ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
