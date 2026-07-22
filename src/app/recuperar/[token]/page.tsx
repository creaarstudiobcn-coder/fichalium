import Link from "next/link";
import { getResetTokenState } from "@/lib/password-reset";
import { Brand } from "@/components/Brand";
import { NuevaPasswordForm } from "./NuevaPasswordForm";

export default async function ResetTokenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const state = await getResetTokenState(token);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-6 flex justify-center">
        <Brand size={36} textClassName="text-2xl text-navy" />
      </div>
      <div className="rounded-2xl border border-navy/10 bg-white p-8 shadow-sm">
        <h1 className="text-2xl text-navy">Nueva contraseña</h1>

        {state === "valid" ? (
          <>
            <p className="mt-1 text-sm text-navy/60">
              Elige una contraseña nueva para tu cuenta.
            </p>
            <NuevaPasswordForm token={token} />
          </>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {state === "used"
                ? "Este enlace ya se ha utilizado. Si necesitas cambiarla de nuevo, pide otro."
                : state === "expired"
                  ? "Este enlace ha caducado. Los enlaces valen 1 hora; pide uno nuevo."
                  : "Este enlace no es válido."}
            </p>
            <Link
              href="/recuperar"
              className="block text-center text-sm font-medium text-pulse hover:underline"
            >
              Pedir un enlace nuevo
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
