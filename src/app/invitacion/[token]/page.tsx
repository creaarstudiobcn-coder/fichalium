import Link from "next/link";
import { getValidInvitation } from "@/lib/invitations";
import { Brand } from "@/components/Brand";
import { AceptarForm } from "./AceptarForm";

export default async function InvitacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const inv = await getValidInvitation(token);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-6 flex justify-center">
        <Brand size={36} textClassName="text-2xl text-navy" />
      </div>
      <div className="rounded-2xl border border-navy/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl text-navy">Únete a tu equipo</h1>

        {inv.state === "valid" ? (
          <>
            <p className="mt-1 text-sm text-navy/60">
              Crea tu contraseña para empezar a fichar tu jornada.
            </p>
            <AceptarForm
              token={token}
              employeeName={inv.employeeName}
              email={inv.email}
            />
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {inv.state === "accepted"
                ? "Esta invitación ya se ha utilizado. Si ya tienes cuenta, inicia sesión."
                : inv.state === "expired"
                  ? "Esta invitación ha caducado. Pide a tu empresa que te envíe una nueva."
                  : "Esta invitación no es válida."}
            </p>
            <Link
              href="/login"
              className="block text-center text-sm font-medium text-pulse hover:underline"
            >
              Ir a iniciar sesión
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
