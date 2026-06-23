import { PrismaClient } from "@prisma/client";

// Singleton para evitar abrir múltiples conexiones en dev (hot reload).
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// El runtime conecta con el rol de aplicación (app_user, SIN BYPASSRLS) para
// que la RLS aplique. El rol propietario (DATABASE_URL) se reserva para DDL y
// migraciones (prisma CLI / apply-rls). Si no hay APP_DATABASE_URL, cae a
// DATABASE_URL (p. ej. en CI sin rol aún), pero entonces la RLS NO protegería.
const runtimeUrl = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: runtimeUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
