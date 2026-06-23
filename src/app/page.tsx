import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div className="space-y-4">
        <span className="inline-block rounded-full bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-wide text-white">
          Control horario
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Fichaje sencillo y conforme a la ley
        </h1>
        <p className="text-lg text-slate-600">
          Registro de jornada para tu empresa. Cada empresa, sus datos
          aislados. Sin biometría, sin complicaciones.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/register"
          className="rounded-lg bg-slate-900 px-6 py-3 font-medium text-white transition hover:bg-slate-700"
        >
          Crear cuenta de empresa
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-slate-300 px-6 py-3 font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Iniciar sesión
        </Link>
      </div>
    </main>
  );
}
