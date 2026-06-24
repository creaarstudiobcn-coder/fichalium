"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Brand } from "@/components/Brand";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(form.get("email")),
      password: String(form.get("password")),
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email o contraseña incorrectos");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-6 flex justify-center">
        <Brand size={36} textClassName="text-2xl text-navy" />
      </div>
      <div className="rounded-2xl border border-navy/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl text-navy">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-navy/60">
          Accede al panel de control horario de tu empresa.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label="Email" name="email" type="email" autoComplete="email" />
          <Field
            label="Contraseña"
            name="password"
            type="password"
            autoComplete="current-password"
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
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-navy/60">
          ¿Aún no tienes cuenta?{" "}
          <Link href="/register" className="font-medium text-pulse hover:underline">
            Crear empresa
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
