-- ServiceHub database hardening. Run in the Supabase SQL editor AFTER `prisma migrate deploy`,
-- and re-run after any migration that adds tables (it is idempotent).
--
-- Model: the app talks to Postgres ONLY through Prisma (as the table-owner role, which bypasses RLS)
-- and uses the service-role key for Storage. Nobody should ever reach these tables through
-- Supabase's public REST/GraphQL API with the anon or authenticated keys.
-- So: enable RLS on every table with NO policies (= deny all), and revoke API-role grants.
-- Do NOT use FORCE ROW LEVEL SECURITY, or Prisma's owner role would be locked out too.

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT LIKE E'\\_prisma%'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

-- Money can never go negative and totals must add up, whatever the application does.
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS invoice_amounts_valid;
ALTER TABLE "Invoice" ADD CONSTRAINT invoice_amounts_valid
  CHECK (subtotal >= 0 AND tax >= 0 AND total >= 0 AND total = subtotal + tax);

ALTER TABLE "InvoiceItem" DROP CONSTRAINT IF EXISTS invoiceitem_amounts_valid;
ALTER TABLE "InvoiceItem" ADD CONSTRAINT invoiceitem_amounts_valid
  CHECK (quantity > 0 AND "unitPrice" >= 0 AND amount >= 0);

ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS payment_amount_positive;
ALTER TABLE "Payment" ADD CONSTRAINT payment_amount_positive CHECK (amount > 0);

ALTER TABLE "Subscription" DROP CONSTRAINT IF EXISTS subscription_price_valid;
ALTER TABLE "Subscription" ADD CONSTRAINT subscription_price_valid CHECK (price >= 0 AND "defaultPriceAtSet" >= 0);

ALTER TABLE "ServicePlan" DROP CONSTRAINT IF EXISTS serviceplan_price_valid;
ALTER TABLE "ServicePlan" ADD CONSTRAINT serviceplan_price_valid CHECK ("defaultPrice" >= 0);

-- Audit log is append-only. (Consequence: a User with audit rows cannot be hard-deleted. Deactivate instead.)
CREATE OR REPLACE FUNCTION servicehub_audit_immutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditlog_no_update ON "AuditLog";
CREATE TRIGGER auditlog_no_update BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION servicehub_audit_immutable();
