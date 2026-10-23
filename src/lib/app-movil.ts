import { cookies } from "next/headers";

/**
 * La app de Android (Trusted Web Activity) entra por /api/app/entrar, que deja
 * esta cookie. Con ella se esconde todo lo que lleva a pagar: Google Play no
 * permite cobrar suscripciones digitales dentro de la app fuera de su sistema.
 * No es un control de seguridad (la cookie la puede poner cualquiera); solo
 * decide qué se enseña.
 */
export const COOKIE_APP = "fichalium_app";

export async function esAppMovil(): Promise<boolean> {
  return (await cookies()).get(COOKIE_APP)?.value === "1";
}
