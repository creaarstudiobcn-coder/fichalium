import type { NextAuthConfig } from "next-auth";

/**
 * Config "edge-safe": NO importa Prisma ni bcrypt, así que puede ejecutarse
 * en el middleware (runtime edge). La lógica que toca la BD vive en auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    // Protege /dashboard: si no hay sesión, redirige al login.
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");

      if (isOnDashboard) return isLoggedIn;

      // Si ya está logueado y va a /login o /register, lo mandamos al dashboard.
      if (
        isLoggedIn &&
        (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")
      ) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }

      return true;
    },
  },
  providers: [], // Los providers reales se añaden en auth.ts (necesitan Node).
} satisfies NextAuthConfig;
