# Operations Runbook

This is the deploy and recovery guide for the Khmer Online Shop. It contains
placeholders only. Never put real secrets in this file.

## Environments

- Supabase project: `online-store`, ref `wdbelxrhvkikrncsgshg` (Tokyo).
- Function base URL:
  `https://wdbelxrhvkikrncsgshg.supabase.co/functions/v1`
- Frontend env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Edge Function secrets: `KHQRDEV_TOKEN`, `KHQRDEV_WEBHOOK_SECRET`,
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`.
- Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
  `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions automatically.
- Vault secrets: `project_url`, `notify_service_role_key`.

Never put the service-role key, KHQR token, or Telegram token in `src/`, the
frontend host, or git. Only the public anon key belongs in the frontend.

## First-time deployment

### 1. Apply migrations

Log in and link the project first. The database password is required.

```bash
npx supabase login
npx supabase link --project-ref wdbelxrhvkikrncsgshg
npx supabase db push
```

This should apply `004_khqr_payments.sql` and `005_scheduled_jobs.sql` after the
already-applied baseline. Do not edit an applied migration; add a new numbered
migration for fixes.

### 2. Create Vault secrets for scheduled notify

Run once in the SQL editor. Use the legacy `service_role` JWT, not a publishable
key.

```sql
select vault.create_secret('https://wdbelxrhvkikrncsgshg.supabase.co', 'project_url');
select vault.create_secret('<legacy service_role JWT>', 'notify_service_role_key');
```

To rotate a secret, update the existing row instead of creating duplicates:

```sql
select vault.update_secret(
  (select id from vault.secrets where name = 'notify_service_role_key'
   order by updated_at desc nulls last limit 1),
  '<new legacy service_role JWT>'
);
```

Verify names only; do not print `decrypted_secret` into logs or tickets:

```sql
select id, name, description, created_at, updated_at
from vault.secrets
where name in ('project_url', 'notify_service_role_key');
```

### 3. Set Edge Function secrets

```bash
npx supabase secrets set --project-ref wdbelxrhvkikrncsgshg \
  KHQRDEV_TOKEN='<khqr-token>' \
  KHQRDEV_WEBHOOK_SECRET='<khqr-webhook-secret>'

npx supabase secrets set --project-ref wdbelxrhvkikrncsgshg \
  TELEGRAM_BOT_TOKEN='<telegram-bot-token>' \
  TELEGRAM_WEBHOOK_SECRET='<telegram-webhook-secret>'
```

Optional KHQR settings: `KHQRDEV_CURRENCY` (`USD` or `KHR`) and
`KHQRDEV_KHR_PER_USD`. `KHQRDEV_BASE_URL` defaults to
`https://api.khqr.dev/v1`.

List names to confirm:

```bash
npx supabase secrets list --project-ref wdbelxrhvkikrncsgshg
```

### 4. Deploy Edge Functions

```bash
npx supabase functions deploy generate_khqr --project-ref wdbelxrhvkikrncsgshg
npx supabase functions deploy verify_khqr_payment --project-ref wdbelxrhvkikrncsgshg
npx supabase functions deploy notify --project-ref wdbelxrhvkikrncsgshg
npx supabase functions deploy khqr_webhook --no-verify-jwt --project-ref wdbelxrhvkikrncsgshg
npx supabase functions deploy telegram_webhook --no-verify-jwt --project-ref wdbelxrhvkikrncsgshg
```

`khqr_webhook` and `telegram_webhook` must skip the Supabase JWT check because
the provider and Telegram authenticate with their own secrets. Both handlers
verify those secrets themselves.

Before deploying, type-check the functions:

```bash
npx -y deno check "supabase/functions/_shared/khqr.ts" "supabase/functions/generate_khqr/index.ts" "supabase/functions/verify_khqr_payment/index.ts" "supabase/functions/khqr_webhook/index.ts"
npx -y deno check "supabase/functions/_shared/telegram.ts" "supabase/functions/telegram_webhook/index.ts" "supabase/functions/notify/index.ts"
```

### 5. Register webhooks

KHQR.dev dashboard:

- URL: `https://wdbelxrhvkikrncsgshg.supabase.co/functions/v1/khqr_webhook`
- Put the same signing secret in `KHQRDEV_WEBHOOK_SECRET`.

Telegram:

```bash
curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://wdbelxrhvkikrncsgshg.supabase.co/functions/v1/telegram_webhook","secret_token":"<TELEGRAM_WEBHOOK_SECRET>","allowed_updates":["message"]}'
```

Set `admin_telegram_chat_id` in `/admin/settings` to the admin's private chat
ID. Store chats link themselves through the dashboard code; the admin chat ID is
entered manually.

### 6. Deploy the frontend

Build and publish `dist/`. On Vercel, set the two public env vars and add an SPA
rewrite so deep links such as `/p/<id>` do not 404:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

On Netlify, publish `dist/`, set the same env vars, and add
`public/_redirects` containing:

```text
/* /index.html 200
```

Redeploy after changing either public env var. The anon key is public; the
service-role key is not.

### 7. Promote the first admin

Only after the owner signs up:

```sql
update profiles
set role = 'super_admin'
where id = (select id from auth.users where email = 'owner@example.com');
```

Do not expose this as a client action. Every later admin promotion is a manual
SQL change.

## Key rotation

### Supabase anon or service-role key

1. Rotate the key in the Supabase dashboard.
2. Update `VITE_SUPABASE_ANON_KEY` on the frontend host and redeploy.
3. If the legacy service-role JWT changed, update the Vault secret
   `notify_service_role_key`.
4. Deploy the functions again so they pick up the injected service key.
5. Smoke-test login, catalog, checkout, and notify.

### KHQR.dev token or signing secret

1. Rotate the value in KHQR.dev.
2. Update `KHQRDEV_TOKEN` or `KHQRDEV_WEBHOOK_SECRET`.
3. Redeploy `generate_khqr`, `verify_khqr_payment`, and `khqr_webhook`.
4. Send a sandbox payment and confirm the webhook signature passes.

### Telegram bot token or webhook secret

1. Revoke the token with `@BotFather` and create a new one.
2. Update `TELEGRAM_BOT_TOKEN` and `TELEGRAM_WEBHOOK_SECRET`.
3. Redeploy `telegram_webhook` and `notify`.
4. Register the webhook again with `setWebhook` and the new secret.
5. Send a test COD order and confirm the store and admin messages arrive.

### Database password

Rotate it in the Supabase dashboard, then update the local CLI link/password.
Running `supabase db push` or `migration list` will prompt for the new password.

## Scheduled jobs

Job list:

| Job                    | Schedule       |
| ---------------------- | -------------- |
| `expire-unpaid-orders` | every minute   |
| `complete-due-orders`  | hourly         |
| `shipping-reminders`   | every 30 min   |
| `cleanup`              | daily at 03:30 UTC |
| `telegram-notify`      | every minute   |

Inspect:

```sql
select jobid, jobname, schedule, active from cron.job order by jobname;
select d.jobid, j.jobname, d.status, d.return_message, d.start_time, d.end_time
from cron.job_run_details d
left join cron.job j on j.jobid = d.jobid
order by d.start_time desc limit 20;
select id, status, attempts, last_error, created_at
from notifications order by created_at desc limit 20;
select id, status_code, error_msg, created
from net._http_response order by created desc limit 20;
```

Run a job manually:

```sql
select public.expire_unpaid_orders();
select public.complete_due_orders();
select public.enqueue_shipping_reminders();
select public.invoke_notify();
```

Pause a job:

```sql
select cron.unschedule('telegram-notify');
```

Re-run `005_scheduled_jobs.sql` to recreate the job set.

If `invoke_notify()` skips, create the two Vault secrets. If notifications stay
`failed`, inspect `last_error`, the Telegram chat ID, and the Edge Function logs.
Retries stop after 5 attempts; fix the cause and set the row back to `pending`
only when appropriate.

## Flagged payment playbook

1. Open `/admin/payments` and find the `flagged` order.
2. Compare the order amount, provider transaction, bank reference, and customer
   contact. Do not mark paid from the browser console or by editing tables.
3. If the full amount is confirmed, use **Confirm payment** with the bank
   reference. This calls `confirm_payment_manually`.
4. If the amount is wrong or the transfer cannot be verified, keep the order
   flagged, contact the customer, and refund through the bank.
5. After the refund, use **Mark refunded** with the reference and a short note.
   This calls `mark_payment_refunded` and queues the store notification.
6. Check `notifications` and the admin/store Telegram messages.
7. Never edit `ledger_entries`, `order_status_history`, or a settlement row
   directly. Add a correction through the admin RPCs.

## Local integration testing

Docker Desktop and the Supabase CLI are required. Start Docker, then:

```bash
npx supabase start
npx supabase db reset
npm run test
```

Critical flows that still need local integration coverage:

1. `create_order` with COD and KHQR; verify stock, totals, and attribution.
2. Two orders racing for the last unit; exactly one succeeds.
3. KHQR webhook: paid, wrong amount, late, duplicate reference, duplicate
   delivery, and expired order reopen.
4. Settlement: positive net, negative carry-forward, transfer, deduction, and
   duplicate-order rejection.
5. Permission walls: anonymous cannot read `orders`, `ledger_entries`, or
   `store_private`; Store A cannot read Store B; owners cannot change status
   without the allowed RPC.
6. Scheduled jobs: expiry returns stock, completion respects the return window,
   reminders enqueue once, and notify drains the queue.

Do not mark these complete until they have been run and the results are in the
tracker.

## Security checklist

- Run `npm run security:check` against the current anon environment; it only
  reads and fails if a protected table or admin RPC is reachable.
- No service-role key or provider secret in `src/`, `dist/`, or frontend env.
- Anonymous users cannot read `orders`, `ledger_entries`, `store_private`,
  `notifications`, `webhook_events`, or `telegram_link_codes`.
- Store owners cannot read another store's orders, products, ledger, or
  settlement data.
- `khqr_webhook` verifies `x-rbk-signature` and the delivery timestamp.
- `telegram_webhook` verifies `x-telegram-bot-api-secret-token`.
- `notify` requires a service-role JWT.
- Run the Supabase security and performance advisors after every schema change
  and fix findings before release.

## Rollback and incidents

- Frontend: promote the previous Vercel/Netlify deployment.
- Edge Functions: redeploy the previous commit.
- Database: migrations are forward-only. Do not edit an applied migration;
  write a new compensating migration.
- Scheduled jobs: unschedule the noisy job first, then fix the root cause.
- Suspected key leak: rotate the key, update Vault/secrets/env, redeploy, and
  inspect function and database logs for unauthorized use.

## Post-deploy smoke test

1. Sign in as a store owner and open the dashboard.
2. Create one COD order and one KHQR order.
3. Pay the KHQR order with the provider sandbox and confirm `paid`.
4. Confirm the store sees both orders and the admin sees all orders.
5. Ship, deliver, and complete the COD order.
6. Run a settlement and confirm the ledger and payout rows.
7. Confirm Telegram messages and the notification queue are healthy.
8. Confirm the cron jobs and `pg_net` responses have no unexpected errors.
