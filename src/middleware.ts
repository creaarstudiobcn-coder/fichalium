import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// El middleware usa SOLO la config edge-safe (sin Prisma) para proteger rutas.
export default NextAuth(authConfig).auth;

export const config = {
  // Ejecuta el middleware en todo menos en estáticos y rutas de API de auth.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
