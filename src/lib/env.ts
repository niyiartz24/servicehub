const REQUIRED_IN_PRODUCTION = [
  "DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY", "PAYSTACK_SECRET_KEY", "NEXT_PUBLIC_APP_URL", "CRON_SECRET",
];

/** Fail fast at boot instead of failing on the first customer payment. */
export function assertProductionEnv() {
  if (process.env.NODE_ENV !== "production") return;
  const missing = REQUIRED_IN_PRODUCTION.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")) throw new Error("NEXT_PUBLIC_APP_URL must be an https URL in production.");
  if (!process.env.RESEND_API_KEY) console.warn("RESEND_API_KEY is not set: notification emails will be skipped.");
}
