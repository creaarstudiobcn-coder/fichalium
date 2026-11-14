import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/auth.config";
import { findUserForLogin } from "@/lib/tenant";
import { loginSchema } from "@/lib/validation";
import { accesoBloqueado, apuntarFallo, borrarFallos, ipDe } from "@/lib/limite-intentos";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(raw, request) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        // Seguridad: límite de intentos por email e IP (tabla login_intentos, fuera del RLS: solo hashes).
        const ip = ipDe(request);
        if (await accesoBloqueado(email, ip)) return null;

        // Login = búsqueda cross-tenant por email (no sabemos aún la empresa).
        const user = await findUserForLogin(email);
        if (!user) {
          await apuntarFallo(email, ip);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          await apuntarFallo(email, ip);
          return null;
        }
        await borrarFallos(email);

        // Lo que devolvemos aquí alimenta el callback jwt().
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          companyId: user.companyId,
          role: user.role,
          employeeId: user.employeeId,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Metemos el contexto de tenant (companyId) en el token la primera vez.
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.companyId = user.companyId;
        token.role = user.role;
        token.employeeId = user.employeeId;
      }
      return token;
    },
    // Y lo exponemos en la sesión para usarlo en server components.
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.companyId = token.companyId as string;
        session.user.role = token.role as string;
        session.user.employeeId = (token.employeeId as string | null) ?? null;
      }
      return session;
    },
  },
});
