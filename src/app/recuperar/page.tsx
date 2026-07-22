"use client";

import { useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function RecuperarPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = new FormData(e.currentTarget);
    // La respuesta es siempre ok (anti-enumeración); no distinguimos casos.
    await fetch("/api/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: String(form.get("email")) }),
    }).catch(() => {});

    setLoading(false);
    setSent(true);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-6 flex justify-center">
        <Brand size={36} textClassName="text-2xl text-navy" />
      </div>
      <div className="rounded-2xl border border-navy/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl text-navy">Recuperar contraseña</h1>

        {sent ? (
          <>
            <p className="mt-3 rounded-md bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
              Si hay una cuenta con ese email, te hemos enviado un enlace para
              elegir una nueva contraseña. Revisa tu bandeja (y el spam). El
              enlace caduca en 1 hora.
            </p>
            <p className="mt-6 text-center text-sm text-navy/60">
              <Link
                href="/login"
                className="font-medium text-pulse hover:underline"
              >
                Volver a iniciar sesión
              </Link>
            </p>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-navy/60">
              Introduce tu email y te enviaremos un enlace para restablecerla.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <Field
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-ficha px-4 py-2.5 font-semibold text-navy transition hover:bg-ficha/90 disabled:opacity-60"
              >
                {loading ? "Enviando…" : "Enviar enlace"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-navy/60">
              <Link
                href="/login"
                className="font-medium text-pulse hover:underline"
              >
                Volver a iniciar sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-navy/80">
        {label}
      </span>
      <input
        {...props}
        required
        className="w-full rounded-lg border border-navy/15 px-3 py-2 text-navy outline-none focus:border-pulse focus:ring-1 focus:ring-pulse"
      />
    </label>
  );
}
