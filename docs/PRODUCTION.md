# ServiceHub production checklist

Work through this top to bottom before the first real client logs in. Nothing here has been run against live services yet.

## 1. Accounts and environment
- [ ] Supabase project created (region close to Lagos users), Postgres **and** Storage enabled.
- [ ] Supabase → Authentication → **disable "Allow new users to sign up"** (accounts are created by admins only).
- [ ] Supabase → Authentication → email templates set as in the README (invite + recovery), Site URL = your https URL.
- [ ] Storage: private bucket `payment-proofs`.
- [ ] Vercel env vars set (all of `.env.example`; `PAYSTACK_SECRET_KEY` = **live** key, `CRON_SECRET` = long random string, `NEXT_PUBLIC_APP_URL` = https URL). The app refuses to boot in production if required ones are missing.
- [ ] Resend: sending domain verified, `EMAIL_FROM` uses it.
- [ ] Never expose `SUPABASE_SERVICE_ROLE_KEY`, `PAYSTACK_SECRET_KEY` or `DATABASE_URL` to the browser (only `NEXT_PUBLIC_*` values are public).

## 2. Database
1. `npx prisma migrate deploy`
2. Run `supabase/hardening.sql` in the Supabase SQL editor (re-run after any migration that adds tables). It turns on RLS with no policies (deny all API access), adds money CHECK constraints, and makes `AuditLog` append-only.
3. `npm run db:seed` only in development. Never in production (it refuses without `--force`).
4. Create the first admin (README) and confirm you can sign in.

## 3. Payments
- [ ] Paystack dashboard → webhook URL `https://YOUR_DOMAIN/api/webhooks/paystack`.
- [ ] Do one real small transaction end to end: renew → pay → webhook → invoice PAID → subscription date extended. Check the audit log and the notification.
- [ ] Replay the same webhook from the Paystack dashboard and confirm nothing is applied twice.
- [ ] Test a manual bank transfer: submit proof, approve as admin with the received amount.

## 4. Scheduled jobs
- [ ] `vercel.json` cron is active (Vercel → Settings → Cron Jobs). Call the endpoint once by hand with the bearer token and read the JSON summary.

## 5. Before launch
- [ ] `npm run typecheck && npm test && npm run build` all pass.
- [ ] Sign in as a client and confirm you cannot open another client's `/invoices/<id>`, `/payments/<id>`, `/services/<id>`, `/support/<id>` (should be 404).
- [ ] Sign in as a client and open `/admin` (should redirect).
- [ ] Set real contact details in `src/config/brand.ts` (the email is a placeholder).
- [ ] Uptime monitor on `/api/health`.
- [ ] Decide on error tracking (all errors already go through `src/lib/monitoring.ts`, the one place to add Sentry).
- [ ] Supabase backups: confirm the plan's point-in-time recovery, and test one restore.

## Known limitations (V1)
- Auto-renew is stored but nothing charges automatically (needs Paystack card authorisation).
- No PDF invoices or receipts yet (records exist; rendering does not).
- No refund workflow. REFUNDED is a status only.
- CSP allows inline scripts (Next.js default). Nonce-based CSP is a later hardening step.
- Rate limiting trusts `x-forwarded-for`, which is correct on Vercel; re-check if you move hosts.
- Infrastructure (databases, hosting, domains, DNS) is managed by SynthaxLab by hand; ServiceHub manages the commercial lifecycle only.
