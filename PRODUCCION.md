# Checklist de producción — Fichalium

Guía para desplegar Fichalium (`fichalium.es`, Dependalium Global Services S.L.) a
producción. Sin secretos: solo los pasos. Marca cada casilla al completarla.

> **Estado real (verificado 2026-07-17):** la app **ya está desplegada y viva** en
> <https://www.fichalium.es> (Vercel). El apex redirige a www con 308 → **la
> canónica de facto es `www`**. Este documento estaba muy desactualizado: daba por
> pendiente el deploy, el DNS y el superadmin, que ya estaban hechos. **Antes de
> creerte una casilla, compruébala.**

---

## 🚨 0. Bloqueantes conocidos (auditoría 2026-07-17)

Están vivos en producción, con clientes reales dentro:

- [ ] **Sin recuperación de contraseña** (ni proveedor de email): un OWNER que
      olvide la suya pierde su empresa, sin arreglo posible por ninguna parte.
- [ ] **Sin UI de correcciones**: `time_entries` es append-only por trigger y nada
      crea correcciones → un olvido de salida es irreparable y computa 0 minutos.
- [ ] **`purgeCompany` no cancela en Stripe**: la suscripción sigue cobrando a una
      empresa borrada, y su PII permanece en Stripe (RGPD incompleto).
- [ ] **Sin reconciliación de `quantity`**: si el PATCH de `syncQuantity` falla,
      Stripe no emite webhook y **nada** reconcilia, pese a lo que dice el catch.
      Vigilar la alerta de deriva en `/superadmin`.
- [ ] **El trial no es lo que promete la landing**: "14 días gratis sin compromiso"
      pero el checkout exige tarjeta y, sin suscripción, no se puede dar de alta ni
      un empleado. O `payment_method_collection: "if_required"`, o cambiar el copy.
- [ ] **Cookies**: `cookies.md` cita Google Analytics inexistente y el
      consentimiento vive en localStorage → no se puede revocar (incumple AEPD).
- [ ] **Registro sin checkbox** de aceptación de Términos/Privacidad.
- [ ] **Catalán = solo la landing**: desde `/ca`, cualquier CTA cae a español.

## 🔴 1. Crítico de seguridad (RLS)

`src/lib/prisma.ts` usa `APP_DATABASE_URL ?? DATABASE_URL`. Si en producción falta
`APP_DATABASE_URL`, el runtime conecta como **propietario (BYPASSRLS)** y la
Row-Level Security multi-tenant **deja de proteger**.

- [x] Definir **siempre** `APP_DATABASE_URL` (rol `app_user`, sin BYPASSRLS) en producción.
- [x] `DATABASE_URL` (propietario) queda **solo** para migraciones/DDL, nunca para servir tráfico.

## 🗄️ 2. Base de datos (Neon)

- [x] Crear la BD de **producción** (proyecto/branch Neon separado del de tests).
- [x] Configurar `DATABASE_URL` (propietario) y `APP_DB_PASSWORD`.
- [x] Ejecutar **una vez** contra prod: `prisma db push` + `apply-rls.mjs`
      (crea `app_user`, políticas RLS, FORCE y el trigger append-only de `time_entries`).
      Verificado fail-closed como `app_user`.
- [x] Conceder superadmin: **hecho**, `info@dependalium.com` tiene rol SUPERADMIN en prod.
- [x] ⚠️ **Nunca** apuntar los tests a la BD de prod: hacen purga destructiva de datos.
      (Prod = endpoint `ep-lingering-glitter-…`; dev/tests = `ep-aged-wind-…`.)
- [x] SQL del panel de superadmin aplicada a prod (`superadmin_company_stats`
      ampliada + `superadmin_billing_drift`).

> **Regla: el código y la BD van juntos.** Al ampliar una función agregada hace
> falta `DROP FUNCTION` antes (Postgres no deja cambiar el tipo de retorno con
> `CREATE OR REPLACE`). Desplegar código que pida columnas nuevas sin haber
> corrido antes `node --env-file=.env.production scripts/apply-rls.mjs` rompe el
> panel. Al revés es seguro: el código viejo ignora las columnas nuevas.

## 🔑 3. Variables de entorno (producción)

| Variable | Valor en producción |
|---|---|
| `DATABASE_URL` | Rol propietario Neon (solo DDL) |
| `APP_DATABASE_URL` | Rol `app_user` ← **obligatorio** (ver §1) |
| `APP_DB_PASSWORD` | Password de `app_user` |
| `AUTH_SECRET` | **Nuevo** secreto (`npx auth secret`), distinto al de dev |
| `AUTH_URL` | `https://www.fichalium.es` ← **www**: el apex redirige a www (308) |
| `STRIPE_SECRET_KEY` | **Live** `sk_live_…` (o `rk_live_…` restringida) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` del endpoint **live** |
| `STRIPE_PRICE_TRAMOS` | `price_…` del precio escalonado creado en **modo live** |
| `SUPERADMIN_EMAILS` | **`info@dependalium.com`** (lista blanca) |

> ⚠️ **Comprobar este valor en Vercel.** Ser superadmin exige rol SUPERADMIN en BD
> **Y** el email en la lista blanca. En prod el rol lo tiene `info@dependalium.com`,
> pero este documento decía `dependalium@gmail.com`: si esa es la variable cargada,
> **nadie** puede entrar en `/superadmin` (y el panel devuelve 404, no un error, así
> que no se distingue de "no existe").

> Si despliegas detrás de proxy (Vercel) y diera problemas de sesión, añade `AUTH_TRUST_HOST=true`.

## 💳 4. Stripe (modo live)

- [ ] Cambiar a **modo live** y recrear el **precio escalonado por tramos** (volume tiered)
      → su id va en `STRIPE_PRICE_TRAMOS`.
- [ ] Crear webhook endpoint → `https://fichalium.es/api/stripe/webhook`.
- [ ] Suscribir los eventos que maneja el handler:
      **`customer.subscription.created`, `customer.subscription.updated`,
      `customer.subscription.deleted`** (y `checkout.session.completed` por el flujo de alta).
      Copiar el signing secret → `STRIPE_WEBHOOK_SECRET`.
- [ ] Probar un checkout real de prueba y verificar que la suscripción se refleja en el panel.

## 🌐 5. Dominio y deploy — **YA HECHO**

- [x] Canónica decidida de facto: **`www`** (el apex devuelve 308 → www).
      Alinear `AUTH_URL` con www; los `.md` legales dicen el apex (revisar).
- [x] DNS de `fichalium.es` → Vercel. Sirve 200 en www; `/login`, `/register`,
      `/ca` y `/sitemap.xml` responden; `/superadmin` da 404 (invisible, correcto).
- [x] Build command `npm run build` (el `postinstall` ya hace `prisma generate`). Node 20+.
- [x] Env vars cargadas (⚠️ verificar `SUPERADMIN_EMAILS` y `AUTH_URL`, ver §3).
- [x] Las 4 páginas legales son `force-static` (leen el `.md` en build) → se prerenderizan sin fs en runtime.

## 🧹 6. Limpieza / repo

- [x] Remote configurado y `main` pusheado (`creaarstudiobcn-coder/fichalium`).
- [x] Carpeta `Branding Fichalium/` fuera del repo (ya en `.gitignore`).
- [x] Datos legales reales verificados (CIF, domicilio, teléfono — ya en los `.md` de Dependalium).
- ⚠️ Los commits de este repo **no llevan `Co-Authored-By`**: Vercel Hobby
      rechaza el deploy si aparece. Autor: `creaarstudiobcn-coder`.

## 🔎 7. Pre-lanzamiento

- [x] `npm run build` + `npm test` en verde (78/78).
- [ ] Confirmar en `/superadmin/sistema` (una vez desplegado) que el rol de BD es
      `app_user` sin BYPASSRLS y que Stripe está en el modo esperado.
- [ ] Smoke test en prod: registro de empresa → alta empleado → invitación → fichar →
      informe/export PDF → suscripción Stripe → panel superadmin.
- [ ] Revisar responsive en móvil real.
