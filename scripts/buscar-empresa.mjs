// Uso: node --env-file=.env.production scripts/buscar-empresa.mjs dependalium
// Imprime id, nombre, estado, alta, correo del propietario, nº de empleados y de fichajes.
import { PrismaClient } from "@prisma/client";
const q = process.argv[2] ?? "";
const prisma = new PrismaClient({ datasourceUrl: process.env.DATABASE_URL });
const rows = await prisma.company.findMany({
  where: { name: { contains: q, mode: "insensitive" } },
  select: {
    id: true, name: true, status: true, createdAt: true,
    users: { where: { role: "OWNER" }, select: { email: true } },
    subscription: { select: { status: true } },
    _count: { select: { employees: true, timeEntries: true } },
  },
});
console.table(rows.map((r) => ({
  id: r.id, nombre: r.name, estado: r.status,
  alta: r.createdAt.toISOString().slice(0, 10),
  propietario: r.users.map((u) => u.email).join(", "),
  suscripcion: r.subscription?.status ?? "-",
  empleados: r._count.employees, fichajes: r._count.timeEntries,
})));
await prisma.$disconnect();
