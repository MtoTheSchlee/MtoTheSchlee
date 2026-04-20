-- Run as the database owner to flip RLS on for all tenant-scoped tables.
-- Policies themselves are created by the optional_rls Prisma migration.
--
--   psql $DATABASE_URL -f scripts/enable-rls.sql
--
-- After this, the API + worker must connect as the `kkos_app` role (set
-- DATABASE_URL=postgres://kkos_app:...) and the TenantMiddleware must be
-- active (`ENABLE_RLS=true`).
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
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    -- FORCE so even the table owner needs to match the policy. Leaves
    -- BYPASSRLS off for kkos_app so app queries obey the filter.
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
