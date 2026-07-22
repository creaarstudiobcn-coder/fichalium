// Aplica Row-Level Security + append-only sobre el esquema ya creado por
// `prisma db push`. Idempotente: se puede ejecutar tantas veces como haga falta.
//
// Ejecutar con:  node --env-file=.env scripts/apply-rls.mjs
//
// Prisma no modela RLS ni triggers, así que esto es SQL crudo. Cada elemento
// del array es UNA sentencia (executeRawUnsafe no admite multi-statement).

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient(); // conecta como propietario (DATABASE_URL)

// Contraseña del rol de aplicación (la inyectamos con set_config para no
// interpolarla en el CREATE/ALTER ROLE; es hex generado por nosotros).
const APP_DB_PASSWORD = process.env.APP_DB_PASSWORD;
if (!APP_DB_PASSWORD) {
  console.error("❌ Falta APP_DB_PASSWORD en .env (genera APP_DATABASE_URL primero).");
  process.exit(1);
}

// Helpers de expresión reutilizables.
const TENANT = `current_setting('app.current_company', true)`;
const BOOTSTRAP = `current_setting('app.bootstrap', true)`; // solo para login
const INVITE_ACCEPT = `current_setting('app.invite_accept', true)`; // solo aceptar invitación
const STRIPE_SYNC = `current_setting('app.stripe_sync', true)`; // solo webhook de Stripe
const SUPERADMIN = `current_setting('app.superadmin', true)`; // solo panel superadmin (lectura global)
const PURGE = `current_setting('app.allow_purge', true)`; // solo teardown / RGPD
const RESET_LOOKUP = `current_setting('app.reset_lookup', true)`; // solo buscar token de reset (deslogueado)
const PASSWORD_RESET = `current_setting('app.password_reset', true)`; // solo el flujo de reset: UPDATE de password_hash

// ───────── Rol de aplicación dedicado, SIN BYPASSRLS ─────────
// El rol propietario de Neon (neondb_owner) tiene BYPASSRLS y se salta la RLS,
// y no podemos quitárselo sin superusuario. Por eso el runtime conecta con este
// rol app_user (NOBYPASSRLS, NOSUPERUSER): la RLS sí le aplica. La contraseña
// se pasa por GUC y se lee con current_setting dentro de un EXECUTE dinámico.
if (!/^[0-9a-f]+$/.test(APP_DB_PASSWORD)) {
  console.error("❌ APP_DB_PASSWORD debe ser hexadecimal (se interpola en SQL).");
  process.exit(1);
}
const roleStatements = [
  // Una sola sentencia (no depende de estado entre conexiones del pooler).
  // La contraseña es hex validado arriba → seguro interpolarla como literal.
  `DO $do$
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
         CREATE ROLE app_user LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD '${APP_DB_PASSWORD}';
       ELSE
         -- El rol ya nació NOSUPERUSER/NOBYPASSRLS; tocar esos atributos exige
         -- superusuario. En el ALTER solo refrescamos login y contraseña.
         ALTER ROLE app_user WITH LOGIN PASSWORD '${APP_DB_PASSWORD}';
       END IF;
     END
   $do$`,
  `GRANT USAGE ON SCHEMA public TO app_user`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user`,
  `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user`,
  // Privilegios por defecto para tablas/secuencias futuras (slices 3-5).
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user`,
  `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user`,
];

const statements = [
  ...roleStatements,

  // ───────────────────────── RLS: activar + FORCE en las 4 tablas ─────────────────────────
  // FORCE hace que la RLS aplique TAMBIÉN al rol propietario (Prisma se conecta
  // como neondb_owner en Neon). Así no hace falta crear un rol de app aparte.
  `ALTER TABLE companies   ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE companies   FORCE  ROW LEVEL SECURITY`,
  `ALTER TABLE users       ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE users       FORCE  ROW LEVEL SECURITY`,
  `ALTER TABLE employees   ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE employees   FORCE  ROW LEVEL SECURITY`,
  `ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE time_entries FORCE  ROW LEVEL SECURITY`,
  `ALTER TABLE invitations ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE invitations FORCE  ROW LEVEL SECURITY`,
  `ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE subscriptions FORCE  ROW LEVEL SECURITY`,
  `ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE audit_logs FORCE  ROW LEVEL SECURITY`,
  `ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE password_reset_tokens FORCE  ROW LEVEL SECURITY`,

  // ───────────────────────── companies ─────────────────────────
  // El "tenant key" de companies es su propio id. Estricto: solo ves/escribes
  // la empresa cuyo id coincide con el contexto. (registro fija ctx = nuevo id.)
  `DROP POLICY IF EXISTS companies_tenant ON companies`,
  `CREATE POLICY companies_tenant ON companies
     USING (id = ${TENANT})
     WITH CHECK (id = ${TENANT})`,
  // Superadmin: lectura global de metadatos de empresa + UPDATE de status
  // (suspender/cerrar). Permisivas → se combinan en OR con la de tenant.
  `DROP POLICY IF EXISTS companies_superadmin_select ON companies`,
  `CREATE POLICY companies_superadmin_select ON companies FOR SELECT
     USING (${SUPERADMIN} = 'on')`,
  `DROP POLICY IF EXISTS companies_superadmin_update ON companies`,
  `CREATE POLICY companies_superadmin_update ON companies FOR UPDATE
     USING (${SUPERADMIN} = 'on')
     WITH CHECK (${SUPERADMIN} = 'on')`,

  // ───────────────────────── users ─────────────────────────
  // SELECT: tu propia empresa, O durante el bootstrap de login (búsqueda por
  // email, que es inevitablemente cross-tenant porque aún no hay sesión).
  `DROP POLICY IF EXISTS users_select ON users`,
  `CREATE POLICY users_select ON users FOR SELECT
     USING (company_id = ${TENANT} OR ${BOOTSTRAP} = 'on')`,
  // INSERT estricto: solo puedes crear usuarios en tu propia empresa.
  `DROP POLICY IF EXISTS users_insert ON users`,
  `CREATE POLICY users_insert ON users FOR INSERT
     WITH CHECK (company_id = ${TENANT})`,
  // UPDATE: denegado por defecto (sin sesión no se toca users). ÚNICA excepción:
  // el flujo de recuperación de contraseña, que fija el contexto a la empresa del
  // token y activa app.password_reset='on' para escribir el nuevo password_hash.
  // Acotado por flag y por empresa, como allow_purge/stripe_sync.
  `DROP POLICY IF EXISTS users_password_reset_update ON users`,
  `CREATE POLICY users_password_reset_update ON users FOR UPDATE
     USING (company_id = ${TENANT} AND ${PASSWORD_RESET} = 'on')
     WITH CHECK (company_id = ${TENANT} AND ${PASSWORD_RESET} = 'on')`,
  // (sin política DELETE → bajo FORCE queda denegada por defecto)

  // ───────────────────────── employees ─────────────────────────
  // Aislamiento estricto y fail-closed: sin contexto de tenant → 0 filas.
  `DROP POLICY IF EXISTS employees_tenant ON employees`,
  `CREATE POLICY employees_tenant ON employees
     USING (company_id = ${TENANT})
     WITH CHECK (company_id = ${TENANT})`,

  // ───────────────────────── time_entries ─────────────────────────
  // Aislamiento estricto y fail-closed (igual que employees).
  `DROP POLICY IF EXISTS time_entries_tenant ON time_entries`,
  `CREATE POLICY time_entries_tenant ON time_entries
     USING (company_id = ${TENANT})
     WITH CHECK (company_id = ${TENANT})`,

  // ───────────────────────── invitations ─────────────────────────
  // SELECT: tu propia empresa, O durante la aceptación (app.invite_accept='on'),
  // que es la búsqueda por token inevitablemente cross-tenant (aún no hay sesión,
  // igual que el bootstrap de login pero acotado a esta tabla y solo lectura).
  `DROP POLICY IF EXISTS invitations_select ON invitations`,
  `CREATE POLICY invitations_select ON invitations FOR SELECT
     USING (company_id = ${TENANT} OR ${INVITE_ACCEPT} = 'on')`,
  // INSERT estricto: solo creas invitaciones en tu propia empresa (lo hace el OWNER).
  `DROP POLICY IF EXISTS invitations_insert ON invitations`,
  `CREATE POLICY invitations_insert ON invitations FOR INSERT
     WITH CHECK (company_id = ${TENANT})`,
  // UPDATE: marcar accepted_at (e invalidar pendientes). Solo dentro de tu empresa.
  // En la aceptación, el contexto se fija a la empresa de la invitación antes de escribir.
  `DROP POLICY IF EXISTS invitations_update ON invitations`,
  `CREATE POLICY invitations_update ON invitations FOR UPDATE
     USING (company_id = ${TENANT})
     WITH CHECK (company_id = ${TENANT})`,

  // ───────────────────────── password_reset_tokens ─────────────────────────
  // SELECT: tu propia empresa, O durante el reset (app.reset_lookup='on'), que es
  // la búsqueda por token cross-tenant estando deslogueado (igual que invite_accept).
  `DROP POLICY IF EXISTS password_resets_select ON password_reset_tokens`,
  `CREATE POLICY password_resets_select ON password_reset_tokens FOR SELECT
     USING (company_id = ${TENANT} OR ${RESET_LOOKUP} = 'on')`,
  // INSERT: se crea el token bajo el contexto de la empresa del usuario (que se
  // resolvió por email en el bootstrap). Estricto a esa empresa.
  `DROP POLICY IF EXISTS password_resets_insert ON password_reset_tokens`,
  `CREATE POLICY password_resets_insert ON password_reset_tokens FOR INSERT
     WITH CHECK (company_id = ${TENANT})`,
  // UPDATE: marcar used_at / invalidar pendientes, dentro de tu empresa.
  `DROP POLICY IF EXISTS password_resets_update ON password_reset_tokens`,
  `CREATE POLICY password_resets_update ON password_reset_tokens FOR UPDATE
     USING (company_id = ${TENANT})
     WITH CHECK (company_id = ${TENANT})`,

  // ───────────────────────── subscriptions ─────────────────────────
  // SELECT: tu propia empresa, O durante el webhook de Stripe (app.stripe_sync='on'),
  // que resuelve la empresa por customer/subscription id sin sesión (no hay tenant
  // todavía). Acotado y solo lectura, como bootstrap/invite_accept.
  `DROP POLICY IF EXISTS subscriptions_select ON subscriptions`,
  `CREATE POLICY subscriptions_select ON subscriptions FOR SELECT
     USING (company_id = ${TENANT} OR ${STRIPE_SYNC} = 'on' OR ${SUPERADMIN} = 'on')`,
  // INSERT/UPDATE estrictos: solo en tu propia empresa. El webhook fija el contexto
  // a la empresa de la suscripción (withTenant) ANTES de escribir, así que pasa.
  `DROP POLICY IF EXISTS subscriptions_insert ON subscriptions`,
  `CREATE POLICY subscriptions_insert ON subscriptions FOR INSERT
     WITH CHECK (company_id = ${TENANT})`,
  `DROP POLICY IF EXISTS subscriptions_update ON subscriptions`,
  `CREATE POLICY subscriptions_update ON subscriptions FOR UPDATE
     USING (company_id = ${TENANT})
     WITH CHECK (company_id = ${TENANT})`,

  // ───────────────────────── audit_logs (solo superadmin) ─────────────────────────
  `DROP POLICY IF EXISTS audit_logs_superadmin_select ON audit_logs`,
  `CREATE POLICY audit_logs_superadmin_select ON audit_logs FOR SELECT
     USING (${SUPERADMIN} = 'on')`,
  `DROP POLICY IF EXISTS audit_logs_superadmin_insert ON audit_logs`,
  `CREATE POLICY audit_logs_superadmin_insert ON audit_logs FOR INSERT
     WITH CHECK (${SUPERADMIN} = 'on')`,

  // ───────────────────────── conteos sin exponer PII (SECURITY DEFINER) ─────────────────────────
  // Devuelve SOLO agregados por empresa. Corre como owner (BYPASSRLS), así que
  // no hace falta abrir SELECT de filas de employees/users al superadmin. Exige
  // el flag app.superadmin para no poder invocarse fuera de ese contexto.
  // DROP previo: Postgres no permite cambiar el tipo de retorno con CREATE OR
  // REPLACE, así que al ampliar las columnas hay que soltarla antes (idempotente).
  `DROP FUNCTION IF EXISTS superadmin_company_stats()`,
  `CREATE OR REPLACE FUNCTION superadmin_company_stats()
     RETURNS TABLE(company_id text, employee_count bigint, active_employee_count bigint, user_count bigint,
                   time_entry_count bigint, last_entry_at timestamptz, pending_invitations bigint,
                   owner_email text)
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path = public
     AS $func$
       BEGIN
         IF (${SUPERADMIN} IS DISTINCT FROM 'on') THEN
           RAISE EXCEPTION 'superadmin_company_stats: requiere contexto de superadmin';
         END IF;
         RETURN QUERY
           SELECT c.id,
                  (SELECT count(*) FROM employees e WHERE e.company_id = c.id),
                  (SELECT count(*) FROM employees e WHERE e.company_id = c.id AND e.active),
                  (SELECT count(*) FROM users u WHERE u.company_id = c.id),
                  -- Volumen y última actividad: agregados, nunca filas de fichaje.
                  (SELECT count(*) FROM time_entries t WHERE t.company_id = c.id),
                  (SELECT max(t.timestamp) FROM time_entries t WHERE t.company_id = c.id),
                  (SELECT count(*) FROM invitations i
                    WHERE i.company_id = c.id AND i.accepted_at IS NULL AND i.expires_at > now()),
                  -- Contacto contractual del cliente (OWNER), no datos de sus empleados.
                  (SELECT u.email FROM users u
                    WHERE u.company_id = c.id AND u.role = 'OWNER'
                    ORDER BY u.created_at LIMIT 1)
           FROM companies c;
       END
     $func$`,
  `REVOKE ALL ON FUNCTION superadmin_company_stats() FROM PUBLIC`,
  `GRANT EXECUTE ON FUNCTION superadmin_company_stats() TO app_user`,

  // ───────────────────────── deriva de facturación (SECURITY DEFINER) ─────────────────────────
  // Compara los empleados activos REALES con el `quantity` cacheado de la
  // suscripción. Si no cuadran, se está facturando de menos o de más. Devuelve
  // solo agregados por empresa; el panel lo muestra como alerta.
  `DROP FUNCTION IF EXISTS superadmin_billing_drift()`,
  `CREATE OR REPLACE FUNCTION superadmin_billing_drift()
     RETURNS TABLE(company_id text, company_name text, sub_status text,
                   billed_quantity int, actual_active bigint)
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path = public
     AS $func$
       BEGIN
         IF (${SUPERADMIN} IS DISTINCT FROM 'on') THEN
           RAISE EXCEPTION 'superadmin_billing_drift: requiere contexto de superadmin';
         END IF;
         RETURN QUERY
           SELECT c.id, c.name, s.status, s.quantity,
                  (SELECT count(*) FROM employees e
                    WHERE e.company_id = c.id AND e.active)
           FROM companies c
           JOIN subscriptions s ON s.company_id = c.id
           WHERE s.quantity IS DISTINCT FROM
                 (SELECT count(*)::int FROM employees e
                   WHERE e.company_id = c.id AND e.active);
       END
     $func$`,
  `REVOKE ALL ON FUNCTION superadmin_billing_drift() FROM PUBLIC`,
  `GRANT EXECUTE ON FUNCTION superadmin_billing_drift() TO app_user`,

  // ───────────────────────── APPEND-ONLY (trigger) ─────────────────────────
  // UPDATE: prohibido SIEMPRE. Una corrección es un INSERT nuevo, nunca un UPDATE.
  // DELETE: prohibido salvo purga controlada (app.allow_purge='on'), que solo se
  //         usa en teardown de tests y en el futuro borrado RGPD. El runtime de
  //         la app NUNCA activa ese flag.
  `CREATE OR REPLACE FUNCTION time_entries_append_only() RETURNS trigger AS $func$
     BEGIN
       IF (TG_OP = 'UPDATE') THEN
         RAISE EXCEPTION 'time_entries es APPEND-ONLY: UPDATE no permitido (id=%). Una correccion es un INSERT con corrects_id.', OLD.id
           USING ERRCODE = 'restrict_violation';
       ELSIF (TG_OP = 'DELETE') THEN
         IF (${PURGE} = 'on') THEN
           RETURN OLD; -- purga deliberada (teardown / RGPD)
         END IF;
         RAISE EXCEPTION 'time_entries es APPEND-ONLY: DELETE no permitido (id=%).', OLD.id
           USING ERRCODE = 'restrict_violation';
       END IF;
       RETURN NULL;
     END;
   $func$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS time_entries_no_mutation ON time_entries`,
  `CREATE TRIGGER time_entries_no_mutation
     BEFORE UPDATE OR DELETE ON time_entries
     FOR EACH ROW EXECUTE FUNCTION time_entries_append_only()`,
];

async function main() {
  console.log(`Aplicando RLS + append-only (${statements.length} sentencias)...`);
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("✅ RLS, políticas de tenant y trigger append-only aplicados.");
}

main()
  .catch((e) => {
    console.error("❌ Error aplicando RLS:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
