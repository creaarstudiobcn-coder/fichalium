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
4. Informe + export PDF  ← SIGUIENTE
5. Stripe (suscripción por tramos)

No abrir varios frentes a la vez. Cada slice se cierra con sus tests en verde.

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
