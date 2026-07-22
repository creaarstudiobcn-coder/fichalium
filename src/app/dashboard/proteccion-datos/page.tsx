import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { INFO_PLANTILLA } from "@/content/legal/geolocalizacion";
import { CopyButton } from "./CopyButton";

export const metadata = { title: "Protección de datos · Fichalium" };

/**
 * Kit de cumplimiento RGPD de la geolocalización para la empresa cliente
 * (responsable). Solo OWNER. Accesible siempre (es información legal), no se
 * bloquea por estado de la empresa.
 */
export default async function ProteccionDatosPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role !== "OWNER") {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h1 className="text-2xl text-navy">Protección de datos</h1>
        <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Solo el propietario de la empresa puede acceder a esta sección.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl text-navy">Protección de datos</h1>
      <p className="mt-1 max-w-2xl text-sm text-navy/60">
        Si activas la geolocalización del fichaje, la ley te obliga a informar a
        tu plantilla y a formalizar el tratamiento de datos. Aquí tienes lo que
        necesitas, listo para usar.
      </p>

      {/* Checklist de obligaciones */}
      <section className="mt-8 rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="text-base font-semibold text-navy">
          Tus obligaciones como empresa
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-navy/70">
          <li className="flex gap-2">
            <span className="text-pulse">1.</span>
            <span>
              <strong className="font-semibold text-navy">
                Informar a tu plantilla
              </strong>{" "}
              de forma clara antes de activar la ubicación (art. 90 LOPDGDD). Usa
              el texto de abajo.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-pulse">2.</span>
            <span>
              Si hay <strong className="font-semibold text-navy">
                representación legal
              </strong>{" "}
              de los trabajadores (comité/delegados), informarles también (art. 64
              ET).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-pulse">3.</span>
            <span>
              Firmar el{" "}
              <strong className="font-semibold text-navy">
                contrato de encargo de tratamiento
              </strong>{" "}
              con Dependalium (lo tienes abajo).
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-pulse">4.</span>
            <span>
              Valorar con tu asesoría si procede una{" "}
              <strong className="font-semibold text-navy">
                evaluación de impacto (EIPD)
              </strong>{" "}
              y reflejar el tratamiento en tu registro de actividades.
            </span>
          </li>
        </ul>
        <p className="mt-4 text-xs text-navy/45">
          Estos textos son plantillas orientativas; revísalos con tu asesoría
          jurídica antes de usarlos. Dependalium actúa como encargado del
          tratamiento, no como responsable.
        </p>
      </section>

      {/* Información a la plantilla */}
      <section className="mt-6 rounded-2xl border border-navy/10 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-navy">
            Información para tu plantilla
          </h2>
          <CopyButton text={INFO_PLANTILLA} />
        </div>
        <p className="mt-1 text-sm text-navy/60">
          Entrégalo a cada persona empleada (por escrito o por email). Sustituye
          los <code className="text-pulse">[corchetes]</code> por tus datos.
        </p>
        <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-offwhite p-4 font-sans text-sm leading-relaxed text-navy/80">
{INFO_PLANTILLA}
        </pre>
      </section>

      {/* Contrato de encargo */}
      <section className="mt-6 rounded-2xl border border-navy/10 bg-white p-6">
        <h2 className="text-base font-semibold text-navy">
          Contrato de encargo de tratamiento
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-navy/60">
          Documento que formaliza que Dependalium trata los datos de tu personal
          por tu cuenta (art. 28 RGPD). Ábrelo, complétalo con tus datos e
          imprímelo o guárdalo en PDF para firmarlo.
        </p>
        <Link
          href="/dashboard/proteccion-datos/contrato"
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy/90"
        >
          Ver e imprimir el contrato
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </main>
  );
}
