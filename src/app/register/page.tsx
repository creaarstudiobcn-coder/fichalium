"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Brand } from "@/components/Brand";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      companyName: String(form.get("companyName")),
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    };

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la cuenta");
      setLoading(false);
      return;
    }

    // Registro OK → autologin y al dashboard.
    await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-6 flex justify-center">
        <Brand size={36} textClassName="text-2xl text-navy" />
      </div>
      <div className="rounded-2xl border border-navy/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl text-navy">Crear empresa</h1>
        <p className="mt-1 text-sm text-navy/60">
          Al registrarte se crea tu empresa y tú quedas como propietario.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Nombre de la empresa" name="companyName" />
          <Field label="Tu nombre" name="name" autoComplete="name" />
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field
            label="Contraseña (mín. 8 caracteres)"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
          />

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-ficha px-4 py-2.5 font-semibold text-navy transition hover:bg-ficha/90 disabled:opacity-60"
          >
            {loading ? "Creando…" : "Crear cuenta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-navy/60">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-pulse hover:underline">
            Iniciar sesión
          </Link>
        </p>
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
