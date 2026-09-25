# ServiceHub by SynthaxLab Technologies

## Setup
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in Supabase + database values.
3. `npx prisma migrate dev --name init`
4. `npm run db:seed` (development/demo data only; `npx tsx prisma/seed.ts --purge` removes it)
5. `npx shadcn@latest init` (components are added as needed from Phase 2 onward)
6. `npm run dev`

## Creating the first admin
1. Supabase dashboard → Authentication → Add user (email + password).
2. Insert the matching profile row (id must equal the auth user id):
   `insert into "User"(id,email,"fullName",role,"updatedAt") values ('<auth-uuid>','you@synthaxlab.com','Your Name','ADMIN', now());`
3. Client users: same, with `role = 'CLIENT'` and `"clientId"` set to their Client row.
   (Phase 2 adds an admin "Create client" flow that does this via the service-role client.)

## Authorization model
- `middleware.ts`: refreshes the session and blocks anonymous access only.
- `requireClientUser()` / `requireAdmin()` in layouts AND pages: real role checks, server-side.
- Client data services take `clientId` from the session, never from URL or form input.
- Phase 7 adds Supabase RLS as defense in depth.

## Layout
- `src/config/brand.ts`: name, colors, prefixes, currency formatting
- `src/server/services/*`: business logic and DB access, no UI
- `src/lib/auth/*`: session, roles, capability map (FINANCE/SUPPORT ready)
- `vercel.json`: cron for `/api/cron/renewal-reminders` (built in Phase 6, protected by `CRON_SECRET`)

## Supabase email templates (required for invites and password reset)
Authentication → Email Templates. Point the links at the app so PKCE isn't needed across devices:
- **Invite user**: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&next=/set-password`
- **Reset password**: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/set-password`

Also set Site URL to `NEXT_PUBLIC_APP_URL` and add `/auth/callback` to the redirect allow-list.

## Payments (Paystack)
- **Development:** leave `PAYSTACK_SECRET_KEY` empty. A clearly-labelled mock gateway is used (`/dev/mock-pay`), payments are stored with `gateway = "mock"`, and it is disabled when `NODE_ENV=production`.
- **Paystack test mode:** set `sk_test_...`, and in the Paystack dashboard set the webhook URL to `https://YOUR_APP/api/webhooks/paystack`. For local testing expose it with a tunnel.
- **Flow:** renew → invoice (price from the subscription) → pay → gateway → webhook and/or return page → `settlePayment()` re-verifies with the gateway → invoice PAID → subscription extended.
- Payments only ever become PAID inside `src/server/services/settlement.ts`.

## Storage (manual bank-transfer proofs)
Supabase → Storage → create a **private** bucket named `payment-proofs`. Files are uploaded server-side with the service-role key; admins get 5-minute signed links.

## Notifications, reminders and email
- **Outbox:** notifications are rows in the DB (created inside the same transaction as the change). Emails are sent *after* the response by `flushPendingEmails()`, and again by the daily cron, so an email problem can never break a payment.
- **Resend:** set `RESEND_API_KEY` and `EMAIL_FROM` (a sender on a domain you have verified in Resend). With no key, emails are logged in dev and marked SKIPPED, never faked as sent.
- **Cron:** `vercel.json` calls `/api/cron/renewal-reminders` daily at 07:00 UTC. Set `CRON_SECRET` in Vercel; the route rejects any request without it. Test locally: `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/renewal-reminders`
- **Stages:** 14, 7, 3 days, due day, and after expiry, each sent once per billing date. The job also moves subscriptions ACTIVE → EXPIRING → EXPIRED and unpaid invoices to OVERDUE.
- Run `npx prisma migrate dev` after pulling this phase (new notification and user columns).
