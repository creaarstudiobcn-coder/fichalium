# Fichaje SaaS — control horario (España)

Stack: **Next.js 15 (App Router) + TypeScript · PostgreSQL + Prisma · Auth.js v5 · Tailwind v4 · (Stripe en slice 5)**.

Se construye por _vertical slices_ (de DB a UI). Reglas de negocio en [`CLAUDE.md`](./CLAUDE.md).

## Estado

### SLICE 1 ✅ — Esqueleto + auth + tenancy
- Registro de empresa: al crear cuenta se crea una `company` y el usuario queda como `OWNER`.
- Login con email + contraseña (Auth.js v5, Credentials + bcrypt, sesión JWT).
- El `companyId` viaja en el JWT → contexto de tenant disponible en toda la app.
- `/dashboard` protegido por middleware.

### SLICE 2 ✅ — Modelo de datos + Row-Level Security + append-only
- Tablas `employees` y `time_entries` (append-only) con `company_id` e índices.
- **RLS + FORCE** en las 4 tablas; aislamiento real de tenant verificado por tests A↔B.
- **Rol de aplicación dedicado** (`app_user`, sin BYPASSRLS) para el runtime; el rol
  propietario solo para DDL. Sin esto la RLS no aplicaría (ver más abajo).
- `withTenant()` fija el tenant por transacción (`SET LOCAL`); es el único camino a datos de cliente.
- Append-only garantizado en BD por trigger: `time_entries` rechaza UPDATE/DELETE.

### SLICE 3 ✅ — Fichaje + gestión de empleados
- `/dashboard/empleados` (solo OWNER): alta, listado y activar/desactivar (no se borra,
  se conserva el histórico). Email único **por empresa**, validado con Zod.
- `/dashboard/fichar`: estado de cada empleado (dentro/fuera + desde qué hora) y botón
  inteligente que ofrece ENTRADA o SALIDA según el último fichaje. El servidor impide
  dos entradas seguidas.
- Cada fichaje es un INSERT append-only en `time_entries` (UTC, `created_by` = usuario de sesión).
- Horas mostradas en `Europe/Madrid` (DST automático); almacenadas en UTC.

> Informe filtrable + export PDF → **slice 4**.

## Seguridad multi-tenant (cómo funciona)
- **Dos roles de Postgres.** `DATABASE_URL` = rol propietario de Neon, solo para
  migraciones/DDL. `APP_DATABASE_URL` = `app_user` (NOBYPASSRLS, NOSUPERUSER), lo
  usa la app y los tests. El propietario de Neon trae BYPASSRLS y se *salta* la RLS,
  y no se le puede quitar sin superusuario → por eso el runtime usa un rol aparte.
- **RLS + FORCE** en companies, users, employees, time_entries. Las políticas filtran
  por `current_setting('app.current_company')`. Sin contexto de tenant, las tablas de
  negocio devuelven **0 filas** (fail-closed).
- **`withTenant(companyId, fn)`** abre una transacción, hace `SET LOCAL app.current_company`
  y ejecuta dentro. Toda query de datos de cliente pasa por ahí.
- **Append-only**: trigger en `time_entries` → UPDATE siempre falla; DELETE solo con el
  flag `app.allow_purge` (teardown de tests / borrado RGPD futuro), nunca en runtime.

## Puesta en marcha

### 1. Base de datos (Neon)
Crea una BD gratis en https://neon.tech y copia la connection string.

### 2. Variables de entorno
```bash
cp .env.example .env
```
Rellena en `.env`:
- `DATABASE_URL` → la de Neon (con `?sslmode=require`).
- `AUTH_SECRET` → genéralo con `npx auth secret` (lo escribe solo) o `openssl rand -base64 33`.

### 3. Instalar y crear el esquema + RLS
```bash
npm install
npm run db:setup     # prisma db push + aplica RLS, rol app_user y trigger append-only
```
> Tras cualquier cambio de esquema: `npm run db:push` y luego `npm run db:rls`
> (o `npm run db:setup`, que encadena ambos). `db:rls` es idempotente.

### 4. Arrancar
```bash
npm run dev          # http://localhost:3000
```
Ve a `/register`, crea una empresa, y entrarás al dashboard.

## Tests
```bash
npm test
```
- `tests/validation.test.ts` → puro, siempre corre.
- `tests/register.test.ts` y `tests/rls.test.ts` → integración; corren si hay BD real
  (se saltan con el placeholder de `.env.example`). Crean dos empresas de prueba y las
  purgan al terminar. Cubren:
  - **Aislamiento A↔B**: con contexto de A no se ve NADA de B (ni pidiéndolo explícito), y viceversa.
  - **Fail-closed**: sin contexto de tenant, employees/time_entries devuelven 0 filas.
  - **WITH CHECK**: A no puede insertar un fichaje a nombre de B.
  - **Append-only**: UPDATE y DELETE sobre un fichaje fallan; el registro sigue ahí.
  - **Corrección**: INSERT con `corrects_id` funciona y deja intacto el original.
  - **Login**: búsqueda por email cross-tenant acotada al flag bootstrap (no abre datos de negocio).

## Scripts
| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Build de producción / arrancar |
| `npm run db:push` | Sincroniza el esquema Prisma con la BD |
| `npm run db:rls` | Aplica RLS, rol `app_user` y trigger append-only (idempotente) |
| `npm run db:setup` | `db:push` + `db:rls` en un solo comando |
| `npm run db:studio` | Explorador visual de la BD |
| `npm test` | Tests con Vitest |
