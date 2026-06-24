import Link from "next/link";
import { notFound } from "next/navigation";
import { signOut } from "@/auth";
import { requireSuperadmin } from "@/lib/superadmin/auth";

export default async function SuperadminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cualquiera no verificado (incluido no autenticado) recibe 404: el panel es
  // invisible, no revela su existencia ni con un redirect al login.
  const actor = await requireSuperadmin();
  if (!actor) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-800 bg-slate-900 text-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-1">
            <span className="mr-3 text-sm font-bold tracking-wide text-amber-400">
              SUPERADMIN
            </span>
            <NavLink href="/superadmin">Plataforma</NavLink>
            <NavLink href="/superadmin/suscripciones">Suscripciones</NavLink>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{actor.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      {children}
    </Link>
  );
}
