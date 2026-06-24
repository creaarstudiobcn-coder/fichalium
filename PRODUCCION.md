# Checklist de producción — Fichalium

Guía para desplegar Fichalium (`fichalium.es`, Dependalium Global Services S.L.) a
producción. Sin secretos: solo los pasos. Marca cada casilla al completarla.

---

## 🔴 1. Crítico de seguridad (RLS)

`src/lib/prisma.ts` usa `APP_DATABASE_URL ?? DATABASE_URL`. Si en producción falta
`APP_DATABASE_URL`, el runtime conecta como **propietario (BYPASSRLS)** y la
Row-Level Security multi-tenant **deja de proteger**.

- [ ] Definir **siempre** `APP_DATABASE_URL` (rol `app_user`, sin BYPASSRLS) en producción.
- [ ] `DATABASE_URL` (propietario) queda **solo** para migraciones/DDL, nunca para servir tráfico.

## 🗄️ 2. Base de datos (Neon)

- [ ] Crear la BD de **producción** (proyecto/branch Neon separado del de tests).
- [ ] Configurar `DATABASE_URL` (propietario) y `APP_DB_PASSWORD`.
- [ ] Ejecutar **una vez** contra prod: `npm run db:setup`
      (`prisma db push` + `apply-rls.mjs` → crea `app_user`, políticas RLS, FORCE y
      el trigger append-only de `time_entries`).
- [ ] Conceder superadmin: `npm run db:superadmin dependalium@gmail.com`.
- [ ] ⚠️ **Nunca** apuntar los tests a la BD de prod: hacen purga destructiva de datos.

## 🔑 3. Variables de entorno (producción)

| Variable | Valor en producción |
|---|---|
| `DATABASE_URL` | Rol propietario Neon (solo DDL) |
| `APP_DATABASE_URL` | Rol `app_user` ← **obligatorio** (ver §1) |
| `APP_DB_PASSWORD` | Password de `app_user` |
| `AUTH_SECRET` | **Nuevo** secreto (`npx auth secret`), distinto al de dev |
| `AUTH_URL` | `https://fichalium.es` (URL canónica con https) |
| `STRIPE_SECRET_KEY` | **Live** `sk_live_…` (o `rk_live_…` restringida) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` del endpoint **live** |
| `STRIPE_PRICE_TRAMOS` | `price_…` del precio escalonado creado en **modo live** |
| `SUPERADMIN_EMAILS` | `dependalium@gmail.com` (lista blanca) |

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

## 🌐 5. Dominio y deploy

- [ ] Decidir canónica **apex vs www** para `fichalium.es` y que `AUTH_URL` coincida (redirige la otra).
- [ ] DNS de `fichalium.es` → plataforma de deploy.
- [ ] Build command `npm run build` (el `postinstall` ya hace `prisma generate`). Node 20+.
- [ ] Cargar todas las env vars del §3 en el dashboard del hosting.
- [ ] Las 4 páginas legales son `force-static` (leen el `.md` en build) → se prerenderizan sin fs en runtime.

## 🧹 6. Limpieza / repo

- [ ] Remote configurado y `main` pusheado.
- [ ] Carpeta `Branding Fichalium/` fuera del repo (ya en `.gitignore`).
- [ ] Datos legales reales verificados (CIF, domicilio, teléfono — ya en los `.md` de Dependalium).

## 🔎 7. Pre-lanzamiento

- [ ] `npm run build` + `npm test` en verde (61/61).
- [ ] Smoke test en prod: registro de empresa → alta empleado → invitación → fichar →
      informe/export PDF → suscripción Stripe → panel superadmin.
- [ ] Revisar responsive en móvil real.
