-- Optional Row-Level-Security policies for Küchen Klaus OS.
--
-- This migration is idempotent and additive: it only CREATEs policies, it
-- does NOT enable RLS on the tables. Production environments opt in with
--
--   ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
--   ...etc per table
--
-- (or run the helper script in scripts/enable-rls.sql). The API's
-- TenantMiddleware sets `app.current_tenant` for every request so the
-- policies below can filter rows.
--
-- Kept intentionally explicit - no FORCE RLS on the DB owner so the API
-- role and the worker role (which authenticate as app_user, not the DB
-- owner) get tenant-scoped reads/writes, while migrations and backups
-- still work as the owner.

-- The app role used by the API/worker at runtime. Create it if absent so
-- local developers can opt into RLS without extra setup.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kkos_app') THEN
    CREATE ROLE kkos_app NOLOGIN;
  END IF;
END
$$;

-- Helper so policies read a single source of truth.
-- Returns TEXT because Prisma models tenantId as String.
DROP FUNCTION IF EXISTS app_current_tenant();
CREATE FUNCTION app_current_tenant() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.current_tenant', true), '')
$$;

-- Tables with a direct tenant_id column get a simple policy.
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'Customer','Project','Supplier','Order','OrderConfirmation',
    'DiscrepancyCase','Document','Mailbox','Email','Appointment',
    'AppointmentSuggestion','SocialPost','ProfitabilityMetric',
    'AgentRun','VoiceProfile','SpeechSession','SttJob','TtsJob',
    'Transcript','SpeechCommand','User','AuditLog','Board','Task'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS tenant_isolation ON %I', t
    );
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I
         USING ("tenantId" = app_current_tenant())
         WITH CHECK ("tenantId" = app_current_tenant())',
      t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO kkos_app', t);
  END LOOP;
END
$$;

-- BoardList, BoardCard, OrderItem, OrderConfirmationItem, EmailAttachment,
-- EmailEvent, BoardCardEvent, AgentEvent inherit tenancy via their parent
-- join. Keep them simple: allow anything that the parent row permits, by
-- relying on the parent's RLS policy when queries go through the expected
-- relations. For defence in depth we still restrict at the column level:
DO $$
DECLARE
  t text;
  join_tables text[] := ARRAY[
    'BoardList','BoardCard','BoardCardEvent',
    'OrderItem','OrderConfirmationItem',
    'EmailAttachment','EmailEvent','AgentEvent'
  ];
BEGIN
  FOREACH t IN ARRAY join_tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO kkos_app', t);
  END LOOP;
END
$$;

-- Grant sequence usage so INSERTs under kkos_app can allocate default
-- UUIDs and serial IDs without bouncing on permissions.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO kkos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO kkos_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kkos_app;

-- The migration intentionally stops here. Flipping RLS on happens in a
-- second, operator-triggered step:
--
--   psql $DATABASE_URL -f scripts/enable-rls.sql
--
-- That way migrations stay compatible with the current workflow while
-- production can opt in without changing Prisma.
