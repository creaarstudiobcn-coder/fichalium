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
    <div className="min-h-screen bg-offwhite">
      <nav className="border-b border-navy bg-navy text-white/70">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
            <span className="mr-2 shrink-0 text-sm font-bold tracking-wide text-amber-400">
              SUPERADMIN
            </span>
            <NavLink href="/superadmin">Plataforma</NavLink>
            <NavLink href="/superadmin/suscripciones">Suscripciones</NavLink>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs text-white/70 sm:inline">
              {actor.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white/80 transition hover:bg-white/10">
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
      className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}
