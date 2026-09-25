-- Defense in depth. ServiceHub reads/writes data ONLY through Prisma on the server (role with BYPASSRLS).
-- Supabase also exposes every public table over its REST API using the anon/authenticated keys.
-- Enabling RLS with NO policies makes those API paths deny-all, so a leaked anon key exposes nothing.
-- Idempotent. Re-run after adding tables (or paste into a Prisma migration).

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- Storage: the payment-proofs bucket is private and has no policies, so only the service-role key
-- (server-side signed URLs) can read or write it.
