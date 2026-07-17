import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSuperadmin } from "@/lib/superadmin/auth";
import { listAuditLog } from "@/lib/superadmin/companies";
import { formatMadrid } from "@/lib/datetime";

export const dynamic = "force-dynamic";

const ACTION: Record<string, { label: string; cls: string }> = {
  SUSPEND: { label: "Suspensión", cls: "bg-amber-100 text-amber-800" },
  UNSUSPEND: { label: "Reactivación", cls: "bg-ficha/15 text-ficha" },
  CLOSE: { label: "Baja", cls: "bg-red-100 text-red-700" },
  PURGE: { label: "Purga RGPD", cls: "bg-red-600 text-white" },
};

export default async function AuditoriaPage() {
  if (!(await requireSuperadmin())) notFound();
  const logs = await listAuditLog();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl text-navy">Auditoría</h1>
      <p className="mt-1 text-sm text-navy/50">
        Toda acción sensible sobre una empresa queda registrada aquí. Las
        entradas sobreviven a la purga de la empresa (últimas {logs.length}).
      </p>

      <div className="mt-6 overflow-x-auto rounded-xl border border-navy/10 bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-navy/10 bg-offwhite text-left text-xs uppercase tracking-wide text-navy/60">
            <tr className="whitespace-nowrap">
              <th className="px-4 py-3 font-medium">Cuándo</th>
              <th className="px-4 py-3 font-medium">Acción</th>
              <th className="px-4 py-3 font-medium">Empresa</th>
              <th className="px-4 py-3 font-medium">Autor</th>
              <th className="px-4 py-3 font-medium">Detalles</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/5">
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-navy/40">
                  Sin acciones registradas todavía.
                </td>
              </tr>
            )}
            {logs.map((a) => {
              const act = ACTION[a.action] ?? {
                label: a.action,
                cls: "bg-navy/10 text-navy/60",
              };
              // La empresa purgada ya no existe: el nombre vive en `details`.
              const details = (a.details ?? {}) as Record<string, unknown>;
              const name =
                a.targetCompany?.name ??
                (typeof details.name === "string" ? details.name : null);
              return (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-mono text-xs text-navy/60">
                    {formatMadrid(a.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${act.cls}`}
                    >
                      {act.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-navy">
                    {a.targetCompanyId && a.targetCompany ? (
                      <Link
                        href={`/superadmin/empresas/${a.targetCompanyId}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {name}
                      </Link>
                    ) : (
                      <span title="Empresa purgada: ya no existe">
                        {name ?? "—"}{" "}
                        <span className="text-xs text-navy/40">(purgada)</span>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-navy/60">{a.actorEmail}</td>
                  <td className="px-4 py-3 text-xs text-navy/50">
                    {details.stripeCanceled === false && (
                      <span className="font-medium text-amber-700">
                        Stripe NO canceló — puede seguir cobrando
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
