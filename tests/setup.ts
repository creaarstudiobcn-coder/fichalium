import { existsSync } from "node:fs";

// Carga las variables de .env antes de que se importe el cliente Prisma,
// para que los tests de integración tengan DATABASE_URL.
if (existsSync(".env")) {
  process.loadEnvFile(".env");
}
