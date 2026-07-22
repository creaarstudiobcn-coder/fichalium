import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ENCARGADO } from "@/content/legal/geolocalizacion";
import { PrintButton } from "./PrintButton";

export const metadata = { title: "Contrato de encargo de tratamiento · Fichalium" };

function Fill({ w = "10rem" }: { w?: string }) {
  return (
    <span
      className="inline-block border-b border-dashed border-navy/40 align-baseline"
      style={{ minWidth: w }}
    >
      &nbsp;
    </span>
  );
}

/** Documento imprimible del contrato de encargo (art. 28 RGPD). Solo OWNER. */
export default async function ContratoPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/dashboard");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard/proteccion-datos"
          className="text-sm font-medium text-navy/60 hover:text-navy"
        >
          ← Volver
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-2xl border border-navy/10 bg-white p-8 text-[15px] leading-relaxed text-navy/80 print:rounded-none print:border-0 print:p-0">
        <header className="border-t-4 border-ficha pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ficha">
            Fichalium · Dependalium Global Services
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-navy">
            Contrato de Encargo del Tratamiento de Datos Personales
          </h1>
          <p className="mt-1 text-sm text-navy/55">
            Artículo 28 del Reglamento (UE) 2016/679 (RGPD) · Servicio de control
            horario «Fichalium»
          </p>
        </header>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-navy/10 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ficha">
              Responsable del tratamiento
            </p>
            <p className="mt-2 text-sm">
              Razón social: <Fill w="9rem" />
              <br />
              CIF/NIF: <Fill w="6rem" />
              <br />
              Domicilio: <Fill w="9rem" />
              <br />
              Representante: <Fill w="8rem" />
              <br />
              Contacto: <Fill w="8rem" />
            </p>
          </div>
          <div className="rounded-lg border border-navy/10 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ficha">
              Encargado del tratamiento
            </p>
            <p className="mt-2 text-sm">
              Razón social: {ENCARGADO.razon}
              <br />
              CIF: {ENCARGADO.cif}
              <br />
              Domicilio: {ENCARGADO.domicilio}
              <br />
              Servicio: Fichalium — fichalium.es
              <br />
              Contacto: {ENCARGADO.email}
            </p>
          </div>
        </div>

        <Section title="Exponen">
          <p>
            <strong>I.</strong> Que el Responsable ha contratado con el Encargado
            el servicio «Fichalium» de registro y control de la jornada laboral,
            para cuya prestación el Encargado debe tratar datos personales de los
            que el Responsable es titular.
          </p>
          <p>
            <strong>II.</strong> Que dicho tratamiento se rige por el presente
            contrato, que cumple lo exigido por el artículo 28 del RGPD y el
            artículo 33 de la LOPDGDD.
          </p>
          <p>
            <strong>III.</strong> Que, cuando el Responsable active la función de{" "}
            <strong>geolocalización del fichaje</strong>, se tratarán además datos
            de ubicación conforme al Anexo I, correspondiendo al Responsable el
            deber de información del artículo 90 LOPDGDD y 20.3 ET.
          </p>
        </Section>

        <Clause n="1" title="Objeto">
          El Encargado tratará por cuenta del Responsable los datos necesarios
          para prestar Fichalium, únicamente con la finalidad y condiciones del
          Anexo I. No los destinará a finalidad distinta ni los usará con fines
          propios.
        </Clause>
        <Clause n="2" title="Duración">
          Surte efecto desde su firma y se mantiene mientras esté vigente el
          contrato de servicio; al finalizar se aplica la cláusula 10.
        </Clause>
        <Clause n="3" title="Instrucciones del Responsable">
          El Encargado tratará los datos siguiendo exclusivamente las
          instrucciones documentadas del Responsable (este contrato, sus anexos y
          la configuración de la herramienta, p. ej. activar o no la
          geolocalización). Advertirá de inmediato si una instrucción infringe la
          normativa.
        </Clause>

        <Section title="4. Obligaciones del Encargado (art. 28.3 RGPD)">
          <ol className="ml-5 list-[lower-latin] space-y-1">
            <li>Tratar los datos solo según instrucciones documentadas.</li>
            <li>Garantizar la confidencialidad del personal autorizado.</li>
            <li>Aplicar las medidas de seguridad del art. 32 (Anexo III).</li>
            <li>No subcontratar sin autorización (cláusula 6 y Anexo II).</li>
            <li>Asistir en la respuesta al ejercicio de derechos de los interesados.</li>
            <li>
              Asistir en seguridad, notificación de brechas, EIPD y consultas
              previas.
            </li>
            <li>Devolver o suprimir los datos al finalizar (cláusula 10).</li>
            <li>
              Aportar la información para demostrar el cumplimiento y permitir
              auditorías.
            </li>
          </ol>
        </Section>

        <Clause n="5" title="Violaciones de seguridad">
          Notificará al Responsable sin dilación indebida, y como máximo en{" "}
          <strong>48 horas</strong> desde que tenga constancia, cualquier
          violación de seguridad, con la información disponible sobre naturaleza,
          afectados, consecuencias y medidas.
        </Clause>
        <Clause n="6" title="Subencargados">
          El Responsable autoriza de forma general los subencargados del Anexo II.
          El Encargado les impone por contrato las mismas obligaciones e informará
          de cualquier cambio, dando ocasión a oponerse.
        </Clause>
        <Clause n="7" title="Transferencias internacionales">
          Los datos se alojan y tratan en el Espacio Económico Europeo. No habrá
          transferencias fuera del EEE sin instrucción del Responsable y garantías
          del Capítulo V del RGPD.
        </Clause>

        <Section title="8. Obligaciones del Responsable">
          <ul className="ml-5 list-disc space-y-1">
            <li>Dar instrucciones lícitas y garantizar la base jurídica.</li>
            <li>
              Al activar la geolocalización, informar a la plantilla y a su
              representación legal (arts. 90 LOPDGDD, 20.3/64 ET) y valorar una
              EIPD.
            </li>
            <li>
              Mantener su registro de actividades y atender los derechos de su
              personal.
            </li>
          </ul>
        </Section>

        <Clause n="9" title="Confidencialidad">
          Subsiste tras finalizar la relación y alcanza a toda persona que
          intervenga en el tratamiento por cuenta del Encargado.
        </Clause>
        <Clause n="10" title="Devolución o supresión al finalizar">
          A elección del Responsable, el Encargado devolverá o suprimirá los datos
          y sus copias, pudiendo conservarlos bloqueados mientras deriven
          responsabilidades. El registro de jornada se conserva{" "}
          <strong>cuatro (4) años</strong> (RD-ley 8/2019, art. 34.9 ET).
        </Clause>
        <Clause n="11" title="Responsabilidad">
          Cada parte responde de los daños que cause por incumplir sus
          obligaciones, en los términos del artículo 82 del RGPD.
        </Clause>
        <Clause n="12" title="Legislación aplicable">
          Se rige por el RGPD, la LOPDGDD y demás normativa aplicable; las partes
          se someten a los Juzgados y Tribunales competentes conforme a Derecho.
        </Clause>

        <p className="mt-6 text-sm text-navy/70">
          Y en prueba de conformidad, firman por duplicado en <Fill w="7rem" />, a{" "}
          <Fill w="2rem" /> de <Fill w="6rem" /> de 20
          <span className="inline-block w-6 border-b border-dashed border-navy/40" />
          .
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <SigBox role="Por el Responsable" entity={null} />
          <SigBox role="Por el Encargado" entity={ENCARGADO.razon} />
        </div>

        <Annex title="Anexo I — Descripción del tratamiento">
          <dl className="space-y-2">
            <AnexRow k="Objeto">
              Registro y control de la jornada laboral del personal del Responsable.
            </AnexRow>
            <AnexRow k="Finalidad">
              Cumplimiento del registro diario de jornada (art. 34.9 ET, RD-ley
              8/2019) y su puesta a disposición del Responsable.
            </AnexRow>
            <AnexRow k="Interesados">
              Personas empleadas dadas de alta y usuarios administradores de la
              cuenta.
            </AnexRow>
            <AnexRow k="Tipos de datos">
              Identificativos (nombre, email), credenciales, marcas de
              entrada/salida, correcciones (autor, momento, motivo). Y{" "}
              <strong>geolocalización</strong> —solo si el Responsable la activa—:
              latitud, longitud y precisión, en una única lectura opcional en el
              momento del fichaje, sin seguimiento continuo, visible solo para el
              Responsable.
            </AnexRow>
            <AnexRow k="Cat. especiales">
              No se tratan datos del art. 9 RGPD ni biométricos.
            </AnexRow>
          </dl>
        </Annex>

        <Annex title="Anexo II — Subencargados autorizados">
          <ul className="ml-5 list-disc space-y-1">
            <li>Neon, Inc. — base de datos gestionada (PostgreSQL) · UE.</li>
            <li>Vercel Inc. — alojamiento y ejecución · UE.</li>
            <li>Resend — correo transaccional · UE.</li>
            <li>Stripe Payments Europe — pagos de la suscripción · UE.</li>
          </ul>
        </Annex>

        <Annex title="Anexo III — Medidas de seguridad">
          <ul className="ml-5 list-disc space-y-1">
            <li>
              Aislamiento por cliente (filtro por empresa + seguridad a nivel de
              fila en la base de datos).
            </li>
            <li>
              Control de acceso por roles; la ubicación solo la ve la empresa,
              nunca el propio empleado.
            </li>
            <li>Cifrado en tránsito (TLS) y contraseñas con hash robusto.</li>
            <li>
              Registro inalterable (append-only): una corrección es un nuevo
              registro; nunca se borra ni modifica un fichaje.
            </li>
            <li>Minimización: geolocalización puntual y opcional.</li>
            <li>Conservación y supresión conforme a la ley (4 años).</li>
          </ul>
        </Annex>
      </article>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      <div className="mt-2 space-y-2 text-sm">{children}</div>
    </section>
  );
}

function Clause({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="text-base font-semibold text-navy">
        <span className="text-ficha">{n}.</span> {title}
      </h2>
      <p className="mt-2 text-sm">{children}</p>
    </section>
  );
}

function SigBox({ role, entity }: { role: string; entity: string | null }) {
  return (
    <div className="break-inside-avoid rounded-lg border border-navy/10 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-ficha">
        {role}
      </p>
      <div className="mt-10 border-b border-navy/40" />
      <p className="mt-1 text-xs text-navy/50">Firma y sello</p>
      <p className="mt-3 text-sm text-navy/70">
        Nombre: <Fill w="6rem" />
        <br />
        Cargo: <Fill w="6rem" />
        <br />
        {entity ? `Entidad: ${entity}` : <>Entidad: <Fill w="6rem" /></>}
      </p>
    </div>
  );
}

function Annex({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8 break-inside-avoid">
      <p className="text-xs font-bold uppercase tracking-widest text-ficha">
        {title}
      </p>
      <div className="mt-2 text-sm">{children}</div>
    </section>
  );
}

function AnexRow({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="sm:flex sm:gap-3">
      <dt className="font-semibold text-navy sm:w-32 sm:shrink-0">{k}</dt>
      <dd className="text-navy/75">{children}</dd>
    </div>
  );
}
