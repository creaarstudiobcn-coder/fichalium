import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { withTenant } from "@/lib/tenant";
import { Brand } from "@/components/Brand";

async function SignOutButton({ label }: { label: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button className="rounded-lg border border-navy/15 px-3 py-1.5 text-sm font-medium text-navy/80 transition hover:bg-navy/5">
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
        <div className="rounded-2xl border border-navy/10 bg-white p-8 shadow-sm">
          <h1 className="text-xl text-navy">
            {closed ? "Cuenta dada de baja" : "Cuenta suspendida"}
          </h1>
          <p className="mt-2 text-sm text-navy/60">
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
      <nav className="border-b border-navy/10 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3 sm:px-6">
          <Brand
            size={28}
            textClassName="hidden text-lg text-navy md:inline"
            className="shrink-0"
          />
          <span className="hidden h-5 w-px shrink-0 bg-navy/10 md:inline-block" />
          {/* Tira de enlaces: scroll horizontal propio en móvil, nunca de página. */}
          <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap">
            <NavLink href="/dashboard">Panel</NavLink>
            <NavLink href="/dashboard/fichar">Fichar</NavLink>
            <NavLink href="/dashboard/informes">Informes</NavLink>
            {isOwner && <NavLink href="/dashboard/empleados">Empleados</NavLink>}
            {isOwner && (
              <NavLink href="/dashboard/suscripcion">Suscripción</NavLink>
            )}
          </div>
          <div className="shrink-0">
            <SignOutButton label="Cerrar sesión" />
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
      className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-navy/60 transition hover:bg-navy/5 hover:text-navy"
    >
      {children}
    </Link>
  );
}
