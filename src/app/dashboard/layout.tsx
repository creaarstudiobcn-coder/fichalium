import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { getCompanyStatus, canManage, blockedMessage } from "@/lib/access";
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

  // Estado de plataforma, en vivo cada request. Este layout AVISA y esconde lo
  // que no se puede usar, pero NO es el control de acceso: los layouts no se
  // ejecutan para route handlers ni server actions, así que cada página, acción
  // y handler re-verifica por su cuenta (ver src/lib/access.ts).
  const status = await getCompanyStatus(session.user.companyId);
  const manage = canManage(status);

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
            {/* Sin gestión solo quedan los informes: el registro horario es una
                obligación legal del cliente y nunca se le retira. */}
            {manage && <NavLink href="/dashboard">Panel</NavLink>}
            {manage && <NavLink href="/dashboard/fichar">Fichar</NavLink>}
            <NavLink href="/dashboard/informes">Informes</NavLink>
            {manage && isOwner && (
              <NavLink href="/dashboard/empleados">Empleados</NavLink>
            )}
            {manage && isOwner && (
              <NavLink href="/dashboard/suscripcion">Suscripción</NavLink>
            )}
            {isOwner && (
              <NavLink href="/dashboard/proteccion-datos">
                Protección de datos
              </NavLink>
            )}
          </div>
          <div className="shrink-0">
            <SignOutButton label="Cerrar sesión" />
          </div>
        </div>
      </nav>

      {!manage && (
        <div className="border-b border-amber-200 bg-amber-50">
          <p className="mx-auto max-w-4xl px-4 py-3 text-sm text-amber-900 sm:px-6">
            <strong>
              {status === "CLOSED" ? "Cuenta dada de baja." : "Cuenta suspendida."}
            </strong>{" "}
            {blockedMessage(status)}
          </p>
        </div>
      )}

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
