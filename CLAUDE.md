# Proyecto: SaaS de Fichaje Horario (España)

## Reglas de negocio INVIOLABLES
- Los registros de fichaje (time_entries) son APPEND-ONLY.
  Nunca UPDATE ni DELETE sobre un fichaje. Una corrección es un
  nuevo registro que referencia al original (campo corrects_id) e
  incluye autor, timestamp y motivo.
- Multi-tenant: TODA tabla con datos de cliente lleva company_id.
  TODA query filtra por company_id. Usar Row-Level Security de
  Postgres como red de seguridad, no solo filtros en código.
- Ninguna query de datos sin contexto de tenant. Si falta, es un bug.
- Datos personales de empleados = RGPD. No biometría. Geolocalización
  fuera del MVP.

## Stack
- Next.js (App Router) full-stack + TypeScript
- PostgreSQL + Prisma con RLS
- Auth.js (o Clerk) para autenticación
- Tailwind para UI
- Stripe Billing para suscripciones

## Convenciones
- Tests obligatorios para: aislamiento de tenant e inalterabilidad
  de time_entries.
- Timestamps siempre en UTC, mostrar en zona Europe/Madrid.

## Orden de construcción (vertical slices — función a función, de DB a UI)
1. Esqueleto + auth + tenancy  (hecho)
2. Modelo de datos + RLS (companies, users, employees, time_entries) + test aislamiento A/B  (hecho)
3. Fichaje (entrada/salida append-only + estado actual) + gestión de empleados  (hecho)
4. Informe + export PDF  (hecho)
5. Cuentas e invitaciones de empleados  (hecho)
6. Stripe (suscripción por tramos)  (hecho)
7. Panel superadmin de plataforma  (hecho)

No abrir varios frentes a la vez. Cada slice se cierra con sus tests en verde.

## Bloqueantes para lanzar (auditoría 2026-07-17)
Ninguno es una slice nueva: son huecos dentro de lo ya construido.
1. ~~**Fuga RGPD** en informes~~ — ARREGLADO: `scopeReportToViewer()` en
   `src/lib/reports.ts` acota por sesión y es el ÚNICO camino permitido a
   `getReport` desde la UI. Todo nuevo consumidor de informes debe pasar por él.
2. **Sin recuperación de contraseña** (ni proveedor de email): un OWNER que la
   olvide pierde su empresa.
3. **Sin UI de correcciones**: `correctsId`/`reason` están en el schema y
   `getReport` ya excluye los sustituidos, pero nada las crea. Con el trigger
   append-only, hoy un olvido de salida es irreparable.

Además, pendiente de la misma auditoría: `purgeCompany` NO cancela la
suscripción en Stripe (sigue cobrando a una empresa borrada) y no hay
reconciliación periódica de `quantity` (el catch de `syncQuantity` dice que el
webhook reconciliará, pero si el PATCH falla Stripe no emite webhook alguno).

## Trampa recurrente: el layout NO protege lo de abajo
En App Router, los layouts no se ejecutan para route handlers ni server actions.
Todo enforcement (estado y rol) se re-verifica en CADA página, acción y handler.
`dashboard/layout.tsx` solo AVISA y esconde enlaces; no es control de acceso.

## Política de acceso por estado de empresa (`src/lib/access.ts`)
Se bloquea la GESTIÓN, no los datos:
- `canManage(status)` → solo `ACTIVE`. Cubre fichar, empleados y suscripción.
  Fail-closed: sin estado conocido, false.
- `canReadRecords(status)` → SIEMPRE que la empresa exista, incluso SUSPENDED o
  CLOSED. **No lo "arregles"**: la cláusula 5 de los Términos y el RD 8/2019
  obligan a que el cliente conserve y pueda entregar su registro horario (4
  años). Dejarle sin informes por un impago le impide responder a una Inspección.
Distinto de `hasActiveSubscription`: una empresa suspendida por la plataforma
puede tener la suscripción al día, y al revés.

## Módulos de política = sin NextAuth
`access.ts` y `superadmin/guard.ts` NO importan NextAuth a propósito: importarlo
los vuelve incargables desde vitest y la política se quedaría sin tests. Quien
necesite la sesión la lee por su cuenta y pasa `companyId`/rol como argumento.

## Arquitectura de seguridad (RLS) — establecida en slice 2
- Dos roles de BD: el PROPIETARIO de Neon (`DATABASE_URL`) solo para DDL/migraciones;
  el runtime conecta con `app_user` (`APP_DATABASE_URL`), SIN BYPASSRLS, para que la RLS aplique.
  Motivo: el propietario de Neon tiene BYPASSRLS y se salta la RLS; no se le puede quitar sin superusuario.
- RLS + FORCE en companies, users, employees, time_entries. Políticas filtran por
  `current_setting('app.current_company', true)`. Sin contexto → 0 filas (fail-closed).
- `withTenant(companyId, fn)` (src/lib/tenant.ts) es el ÚNICO camino para datos de cliente:
  hace `set_config('app.current_company', …, true)` (SET LOCAL) en una transacción. TODA query de negocio va por aquí.
- Excepciones acotadas (server-only): login = `app.bootstrap='on'` (solo abre SELECT de users);
  registro fija el contexto al nuevo companyId; purga/RGPD = `app.allow_purge='on'` (única vía de DELETE en time_entries, jamás en runtime).
- Append-only de time_entries: trigger `time_entries_no_mutation` → UPDATE siempre falla; DELETE falla salvo purga.
- RLS/roles/trigger viven en `scripts/apply-rls.mjs` (SQL crudo, idempotente). Tras cada `prisma db push` correr `npm run db:rls` (o `npm run db:setup` que hace ambos).
