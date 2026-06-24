import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { withTenant } from "@/lib/tenant";

async function SignOutButton({ label }: { label: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
        {label}
      </button>
    </form>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const isOwner = session.user.role === "OWNER";

  // Estado de la empresa (suspensión/baja por la plataforma). Se comprueba en
  // vivo cada request: si no está ACTIVE, se bloquea TODO el panel.
  const company = await withTenant(session.user.companyId, (tx) =>
    tx.company.findUnique({
      where: { id: session.user.companyId },
      select: { status: true },
    }),
  );
  if (company && company.status !== "ACTIVE") {
    const closed = company.status === "CLOSED";
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            {closed ? "Cuenta dada de baja" : "Cuenta suspendida"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {closed
              ? "Esta empresa ha sido dada de baja. Contacta con soporte si crees que es un error."
              : "El acceso a esta empresa está suspendido temporalmente. Contacta con soporte."}
          </p>
          <div className="mt-6 flex justify-center">
            <SignOutButton label="Cerrar sesión" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-1">
            <NavLink href="/dashboard">Panel</NavLink>
            <NavLink href="/dashboard/fichar">Fichar</NavLink>
            <NavLink href="/dashboard/informes">Informes</NavLink>
            {isOwner && <NavLink href="/dashboard/empleados">Empleados</NavLink>}
            {isOwner && (
              <NavLink href="/dashboard/suscripcion">Suscripción</NavLink>
            )}
          </div>
          <SignOutButton label="Cerrar sesión" />
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
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}
