// Crea o promueve un usuario a rol SUPERADMIN. Es la ÚNICA vía de conceder ese
// rol (el registro nunca lo crea). Se conecta como PROPIETARIO (DATABASE_URL),
// que tiene BYPASSRLS, para poder insertar sin contexto de tenant.
//
// Uso:  node --env-file=.env scripts/grant-superadmin.mjs <email> [nombre] [password]
//
// Si el usuario ya existe → lo promueve (y resetea contraseña si se pasa una).
// Si no existe → crea una empresa "Plataforma" dedicada y el usuario dentro.
// Recuerda añadir el email a SUPERADMIN_EMAILS (ambos son obligatorios para entrar).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient(); // DATABASE_URL (owner, BYPASSRLS)

const [, , emailArg, nameArg, passwordArg] = process.argv;

if (!emailArg) {
  console.error("❌ Falta el email.\n   node --env-file=.env scripts/grant-superadmin.mjs <email> [nombre] [password]");
  process.exit(1);
}

const email = emailArg.toLowerCase().trim();
const name = nameArg?.trim() || "Superadmin";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    const data = { role: "SUPERADMIN", name };
    if (passwordArg) data.passwordHash = await bcrypt.hash(passwordArg, 12);
    await prisma.user.update({ where: { email }, data });
    console.log(`✅ Usuario ${email} promovido a SUPERADMIN (nombre/contraseña actualizados).`);
  } else {
    if (!passwordArg) {
      console.error("❌ El usuario no existe: pasa una contraseña para crearlo.\n   node --env-file=.env scripts/grant-superadmin.mjs <email> <nombre> <password>");
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(passwordArg, 12);
    const company = await prisma.company.create({ data: { name: "Plataforma" } });
    await prisma.user.create({
      data: { companyId: company.id, email, name, passwordHash, role: "SUPERADMIN" },
    });
    console.log(`✅ Superadmin creado: ${email} (empresa interna "Plataforma").`);
  }

  console.log("\n⚠️  Recuerda añadir este email a SUPERADMIN_EMAILS en .env (ambos requeridos para entrar).");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
