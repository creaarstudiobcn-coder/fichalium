/**
 * ID de medición de Google Analytics 4 de fichalium.es.
 * No es un secreto (viaja en el HTML). La variable de entorno, si existe, manda.
 * El aviso de cookies, la carga de Google y los textos legales (bloques
 * <!--si-analitica--> / <!--no-analitica--> de src/content/legal) leen ESTA
 * constante: si se vacía, cambian todos a la vez.
 */
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "G-10FVW3EV14";

/**
 * Zona privada (panel de la empresa, superadmin, acceso): ahí no se pregunta
 * ni se mide. Son datos de los clientes y de sus empleados.
 */
const PRIVADAS = ["/dashboard", "/superadmin", "/invitacion", "/login", "/recuperar", "/api"];

export function esRutaPrivada(ruta: string | null | undefined): boolean {
  if (!ruta) return false;
  return PRIVADAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}
