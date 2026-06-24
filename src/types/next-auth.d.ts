import type { DefaultSession } from "next-auth";

// Extiende los tipos de Auth.js para que `companyId` (contexto de tenant)
// viaje de forma tipada por la sesión y el token JWT.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      companyId: string;
      role: string;
      employeeId: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    companyId: string;
    role: string;
    employeeId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    companyId: string;
    role: string;
    employeeId: string | null;
  }
}
