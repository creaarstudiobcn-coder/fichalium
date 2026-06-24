import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de cookies · Fichaje",
  description: "Información sobre el uso de cookies en la aplicación.",
};

// TEXTO BASE editable: ajústalo a tu caso real (proveedor, finalidades, plazos).
export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Política de cookies</h1>
      <p className="mt-1 text-sm text-slate-500">
        Última actualización: 24 de junio de 2026
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            ¿Qué son las cookies?
          </h2>
          <p className="mt-2">
            Las cookies son pequeños archivos que un sitio web guarda en tu
            dispositivo cuando lo visitas. Sirven para que la aplicación
            funcione correctamente, recordar tus preferencias y, en su caso,
            obtener información estadística sobre el uso del servicio. En esta
            aplicación también utilizamos almacenamiento local del navegador
            (localStorage) con finalidades equivalentes, como recordar tu
            elección sobre este aviso.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Tipos de cookies que utilizamos
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Técnicas o necesarias.</strong> Imprescindibles para el
              funcionamiento del servicio, como mantener tu sesión iniciada y
              garantizar la seguridad. No se pueden desactivar.
            </li>
            <li>
              <strong>De preferencias.</strong> Permiten recordar opciones como
              tu decisión sobre este aviso de cookies.
            </li>
            <li>
              <strong>Analíticas (opcionales).</strong> Nos ayudarían a entender
              cómo se usa la aplicación para mejorarla. Solo se activan si las
              aceptas.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">
            Gestión y revocación
          </h2>
          <p className="mt-2">
            Puedes aceptar o rechazar las cookies opcionales desde el aviso que
            aparece en tu primera visita. Para cambiar tu elección más adelante,
            borra los datos de navegación de este sitio en tu navegador y vuelve
            a cargar la página: el aviso aparecerá de nuevo. También puedes
            configurar tu navegador para bloquear o eliminar cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Contacto</h2>
          <p className="mt-2">
            Si tienes dudas sobre esta política, puedes escribirnos a{" "}
            <span className="font-medium">[tu email de contacto]</span>.
          </p>
        </section>
      </div>

      <div className="mt-10">
        <Link
          href="/"
          className="text-sm font-medium text-slate-900 underline"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  );
}
