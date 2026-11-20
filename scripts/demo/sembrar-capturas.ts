// SOLO BD de DESARROLLO (.env). Crea «Limpiezas Demo, S.L.» con 5 empleados y fichajes de 2 semanas
// para las capturas de Google Play. Imprime el correo del propietario; la contraseña se lee de DEMO_PASS.
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/tenant";
import { registerCompany } from "@/lib/auth/register";
async function main() {
if ((process.env.DATABASE_URL ?? "").includes("lingering-glitter")) throw new Error("¡Esto es PRODUCCIÓN! Abortado.");
const pass = process.env.DEMO_PASS!; if (!pass) throw new Error("falta DEMO_PASS");
const email = `demo.capturas.${Date.now()}@example.com`;
const { company, user } = await registerCompany({ companyName: "Limpiezas Demo, S.L.", name: "Laura Martín", email, password: pass });
const nombres = ["Laura Martín", "Carmen Ruiz", "Ana Belén Torres", "Rosa Navarro", "Pilar Gómez"];
// Madrid = UTC+1 en noviembre
const hoy = new Date(); hoy.setUTCHours(0,0,0,0);
await withTenant(company.id, async (tx) => {
  const emps = [];
  for (const n of nombres) emps.push(await tx.employee.create({ data: { companyId: company.id, name: n, email: n.toLowerCase().replace(/[^a-z]+/g,".") + "@example.com" } }));
  const entries: any[] = [];
  for (let d = 13; d >= 1; d--) {
    const dia = new Date(hoy.getTime() - d*86400000); const wd = dia.getUTCDay(); if (wd===0||wd===6) continue;
    emps.forEach((e, k) => {
      const ini = 13*60 + 25 + ((d*7+k*11)%9);           // 14:25-14:33 Madrid
      const fin = 18*60 + 2 + ((d*5+k*13)%7);            // 19:02-19:08 Madrid
      entries.push({ companyId: company.id, employeeId: e.id, type: "CLOCK_IN",  timestamp: new Date(dia.getTime()+ini*60000), createdBy: user.id });
      entries.push({ companyId: company.id, employeeId: e.id, type: "CLOCK_OUT", timestamp: new Date(dia.getTime()+fin*60000), createdBy: user.id });
    });
  }
  // hoy: 3 dentro desde las 14:30 aprox.
  [0,1,3].forEach((k,j) => entries.push({ companyId: company.id, employeeId: emps[k].id, type: "CLOCK_IN", timestamp: new Date(Date.now()-(95+j*6)*60000), createdBy: user.id }));
  await tx.timeEntry.createMany({ data: entries });
});
console.log(JSON.stringify({ email, companyId: company.id }));
await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
