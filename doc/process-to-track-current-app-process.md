# Process Tracker: Current App State

Last updated: 2026-10-27
Branch: `main`
Latest feature commit: `4d60f37 feat: add printable invoices and province selector`

This is the working handoff document. Read it first when resuming the project.
Update it at the end of every build step, commit, deployment, or blocker.

---

## 1. How to use this document

1. Read this file and `doc/AI_BUILD_GUIDE.md` before changing code.
2. Find the current step in [Step status](#5-step-status).
3. Read [Where to start next](#8-where-to-start-next).
4. Follow the project rules in [Working rules](#2-working-rules).
5. After the step, update this file with:
   - what was built
   - checks run and results
   - remote/deployment changes
   - blockers and the next exact action
   - the new commit hash, if any

Do not mark a step fully complete until its acceptance checks pass. If only
local checks pass, mark it **Implemented, live acceptance pending**.

---

## 2. Working rules

- One step at a time. Finish, verify, report, then stop.
- Give a short plan before writing code.
- Run after every step: `npm run typecheck`, `npm run lint`, `npm run test`,
  `npm run format:check`, `npm run build`.
- Do not claim live behavior works unless it was actually tested.
- All database changes are new numbered migrations. Never edit `001_schema.sql`.
- Regenerate `src/lib/database.types.ts` after migrations that affect typed
  queries. The current KHQR columns are not in the generated types yet because
  the frontend does not query them through the typed client.
- Components never call Supabase directly. Use `src/api/`.
- Business rules, prices, stock, commission, and payment state live in the
  database or Edge Functions, not in React.
- Money is integer USD cents. Display through `formatMoney`.
- All customer-facing text must exist in English and Khmer in
  `src/lib/i18n/translations.ts`.
- Never put service-role keys, KHQR tokens, or webhook secrets in the frontend
  or in git.
- Never mark a payment paid from the browser.
- Unpaid KHQR orders must remain hidden from stores until paid.
- Do not add out-of-scope features.

---

## 3. Product snapshot

A curated Cambodian marketplace starting in Battambang. Guests browse stores,
place orders, pay by KHQR or cash on delivery, and track orders with an order
code plus phone number. Store owners manage products and orders. A super admin
runs categories, stores, payments, disputes, settings, and settlements.

- Stack: React, TypeScript, Vite, Tailwind v4, Supabase.
- Languages: English and Khmer.
- Roles: `super_admin`, `store_owner`, guest customer.
- Commission: 30% default, server-computed.
- Payments: one platform KHQR.dev merchant account for all stores.
- Money: integer USD cents everywhere.

---

## 4. Completed application surface

Known recent commits:

| Commit    | Scope                              |
| --------- | ---------------------------------- |
| `7d7bf93` | Route splitting and error boundary |
| `3471c2f` | Hardening checks and runbook        |
| `4fe2607` | Scheduled jobs                     |
| `410ad24` | Telegram notifications             |
| `83dcf8b` | Weekly settlements                 |
| `392c3ce` | Store dashboard and admin panel    |
| `8a7816e` | Project process tracker            |
| `ecf9ab8` | KHQR payments                      |
| `697871e` | Guest order tracking               |
| `e2b5130` | Cart and COD checkout              |
| `cc5e8e6` | Public catalog                     |
| `f6357ed` | Categories and product management  |
| `1816a89` | Auth and store onboarding          |

Implemented routes:

| Route                         | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| `/`                           | Home                                     |
| `/login`, `/signup`           | Authentication                           |
| `/search`                     | Search                                   |
| `/cart`                       | Cart                                     |
| `/checkout`                   | Guest checkout, COD or KHQR              |
| `/order/:orderCode`           | COD order confirmation                   |
| `/pay/:orderCode`             | KHQR payment page                        |
| `/track`                      | Guest order tracking                     |
| `/c/:slug`                    | Category page                            |
| `/p/:productId`               | Product page                             |
| `/s/:slug`                    | Public store page                        |
| `/store`                      | Store dashboard                           |
| `/store/orders`               | Store order list and status tabs          |
| `/store/orders/:orderId`      | Store order detail and actions            |
| `/store/statement`            | Store balance, ledger, and settlements    |
| `/store/products/new`         | Create product                            |
| `/store/products/:productId`  | Edit product                             |
| `/admin`                      | Admin panel and store approvals          |
| `/admin/orders`               | All orders with status/payment/store filters |
| `/admin/orders/:orderId`      | Admin order detail and actions           |
| `/admin/payments`             | Flagged and refund-due payments          |
| `/admin/disputes`             | Open customer disputes                   |
| `/admin/settlements`          | Weekly settlement and balance actions    |
| `/admin/settings`             | Platform settings editor                 |
| `/admin/categories`           | Category management                      |

Implemented behavior:

- Auth, role guards, and store onboarding.
- Categories, products, variants, images, and public catalog.
- Cart and COD checkout with server-computed delivery fee, totals, and a
  searchable bilingual province selector.
- Downloadable post-checkout invoice for COD and paid KHQR orders.
- Guest tracking with cancel, confirm received, report problem, and reopen.
- KHQR checkout selection, QR generation, polling, signed webhook, and
  payment-status UI.
- Store order list with tabs, order detail, allowed status actions, restock, and
  translated errors.
- Store statement with balance, ledger, past settlements, and COD commission
  owed.
- Telegram link-code generation from the store dashboard.
- Telegram bot linking for store chats and Khmer-first order, payment, dispute,
  reminder, and payout alerts with retry tracking.
- Admin panel with all-orders filtering, required-note status changes, payment
  review, dispute resolution, store approvals, and platform settings.
- Weekly settlement page with eligible-order selection, payout/carry-forward
  confirmation, store transfers, deductions, ledger, and settlement history.
- Scheduled database jobs for unpaid QR expiry, order completion, shipping
  reminders, cleanup, and Telegram notification dispatch.
- English and Khmer strings for all current customer flows.

---

## 5. Step status

| Step | Scope                          | Status                                      |
| ---- | ------------------------------ | ------------------------------------------- |
| 0    | Project and database setup     | Complete                                    |
| 1    | Foundation and i18n            | Complete                                    |
| 2    | Auth and roles                 | Complete                                    |
| 3    | Store onboarding and approval  | Complete                                    |
| 4    | Categories and products        | Complete                                    |
| 5    | Public catalog                 | Complete                                    |
| 6    | Cart and COD checkout          | Complete                                    |
| 7    | Guest order tracking           | Complete                                    |
| 8    | KHQR payments                  | Implemented locally; live acceptance pending |
| 9    | Store dashboard orders         | Implemented locally; live acceptance pending |
| 10   | Admin panel                    | Implemented locally; live acceptance pending |
| 11   | Settlement                     | Implemented locally; live acceptance pending |
| 12   | Telegram notifications         | Implemented locally; live acceptance pending |
| 13   | Scheduled jobs                 | Implemented locally; live acceptance pending |
| 14   | Hardening, tests, deploy       | Local hardening complete; deploy pending   |

---

## 6. Step 8 KHQR details

### What was built

Frontend:

- `src/features/checkout/CheckoutPage.tsx`: COD/KHQR radio selection. If COD is
  disabled, KHQR is selected automatically and COD is disabled with an
  explanation.
- `src/features/checkout/paymentContext.ts`: validated session-storage handoff
  for `orderId`, `orderCode`, store, phone, amount, and expiry.
- `src/pages/PaymentPage.tsx`: QR display, amount, countdown, paid/flagged/
  cancelled/expired/error states, polling every 5 seconds after a 2-second
  initial delay, and reopen flow.
- `src/api/payments.ts`: `generateKhqr` and `verifyKhqrPayment` wrappers.
- `src/App.tsx`: `/pay/:orderCode` route.
- `src/lib/i18n/translations.ts`: English and Khmer `payment.*` strings.

Backend:

- `supabase/migrations/004_khqr_payments.sql`
  - Adds `khqr_md5`, `khqr_tran_id`, `khqr_checkout_url`.
  - Adds a unique index on `khqr_md5`.
  - Adds service-only `set_order_khqr`.
  - Replaces `reopen_expired_order` to clear old QR data and reserve fresh
    stock.
- `supabase/functions/generate_khqr/index.ts`
  - Creates or reuses a QR.
  - Caps QR lifetime at 10 minutes and the stored order expiry.
  - Calls KHQR.dev `generate_qr`.
- `supabase/functions/verify_khqr_payment/index.ts`
  - Polls KHQR.dev `check_transaction_by_md5`.
  - Calls `mark_order_paid` with the provider amount.
  - Expires due orders when the provider reports an expired QR.
- `supabase/functions/khqr_webhook/index.ts`
  - Verifies HMAC-SHA256 over the raw body.
  - Enforces a 5-minute `x-rbk-delivery` replay window.
  - Claims the event, matches by `md5`, converts amounts to USD cents, and
    calls `mark_order_paid`.
  - Duplicate events return `duplicate` without changing the order.
- `supabase/functions/_shared/khqr.ts`: provider URL, currency conversion,
  HMAC, CORS, and response helpers.
- `supabase/config.toml`: JWT settings for the three functions.

### Provider contract in use

- Generate: `POST /v1/generate_qr` with `{ amount }`.
- QR image: `GET /v1/generate_khqr_image/<md5>`.
- Check: `POST /v1/check_transaction_by_md5` with `{ md5 }`.
- Webhook signature: HMAC-SHA256 hex over the raw body.
- Delivery header: Unix milliseconds.
- Provider limits: generation 1/second, checks 180/minute.
- QR lifetime: about 10 minutes.
- Currency: `USD` by default; `KHR` requires `KHQRDEV_KHR_PER_USD`.

### Function secrets

- `KHQRDEV_TOKEN` (required)
- `KHQRDEV_WEBHOOK_SECRET` (required)
- `KHQRDEV_CURRENCY` (`USD` or `KHR`, default `USD`)
- `KHQRDEV_KHR_PER_USD` (required when using `KHR`)
- `KHQRDEV_BASE_URL` (optional, default `https://api.khqr.dev/v1`)

### Local verification

Last run: 2026-10-26

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run test`: 14 files, 65 tests passed
- `npm run format:check`: passed
- `npm run build`: passed, with the existing Vite chunk-size warning

### Acceptance status

| Acceptance check                         | Status                                      |
| ---------------------------------------- | ------------------------------------------- |
| Correct payment marks the order paid     | Code path ready; live/provider test pending |
| Wrong amount is flagged, not paid        | Code path ready; live/provider test pending |
| Duplicate webhook changes nothing        | Code path ready; live/provider test pending |
| Expired order reopens with fresh stock   | Code path ready; live acceptance pending    |

Step 8 is committed locally but is not fully accepted until the migration and
functions are live and the four checks above are simulated or run against the
provider.

---

## 6a. Step 9 store dashboard details

### What was built

API:

- `src/api/storeOrders.ts`: list store orders, load one order with items and
  history, change status through `set_order_status`, and restock through
  `restock_order`.
- `src/api/statement.ts`: `get_store_balance`, ledger rows, past settlements,
  and COD commission owed from delivered/completed COD orders.
- `src/api/stores.ts`: `createTelegramLinkCode` wrapper.

UI:

- `src/features/store-dashboard/StoreOrdersPage.tsx`: status tabs (all, pending,
  confirmed, shipped, delivered, returns, closed), customer summary, totals, and
  links to detail.
- `src/features/store-dashboard/StoreOrderDetailPage.tsx`: customer contact
  data, items, commission and payout preview, delivery details, history
  timeline, allowed actions only, restock, translated errors, and explicit COD
  cash wording when marking delivered.
- `src/features/store-dashboard/StoreStatementPage.tsx`: balance with
  positive/negative explanation, COD commission owed, ledger rows with
  info-only markers, and past settlements.
- `src/features/store-dashboard/TelegramConnectSection.tsx`: one-time code and
  instructions on the store dashboard.
- `src/lib/orderStatus.ts`: shared order and payment badge labels/tones.
- `src/lib/datetime.ts`: shared date formatting.

Routes added:

- `/store/orders`
- `/store/orders/:orderId`
- `/store/statement`

### Security and visibility

- Orders are read through the existing RLS policies; no new migration was
  needed.
- Unpaid KHQR orders stay hidden because `orders_read` and
  `store_can_see_order` only expose COD or paid KHQR orders.
- Store A cannot read Store B's order detail because the detail query is limited
  by the same RLS policy.
- Status actions are limited by `set_order_status` and `_transition_allowed`;
  the UI only shows the next allowed actions.
- The browser still cannot mark payments paid, edit ledger rows, or change
  balances.

### Local verification

Last run: 2026-10-27

- `npm run typecheck`: passed
- `npm run lint`: passed with no warnings
- `npm run test`: 14 files, 65 tests passed
- `npm run format:check`: passed
- `npm run build`: passed, with the existing Vite chunk-size warning

### Acceptance status

| Acceptance check                           | Status                                      |
| ------------------------------------------ | ------------------------------------------- |
| Store A cannot see Store B's orders        | RLS path ready; live acceptance pending     |
| An unpaid KHQR order never appears         | RLS path ready; live acceptance pending     |
| Invalid actions show the translated error  | UI path ready; live acceptance pending      |

---

## 6b. Step 10 admin panel details

### What was built

API:

- `src/api/admin.ts`: all-order list and detail (items, history, store name),
  payment review list, open-dispute list, admin status changes through
  `set_order_status`, `confirm_payment_manually`, `mark_payment_refunded`,
  `resolve_dispute`, and platform settings read/update.
- `src/components/OrderStatusBadge.tsx`: shared order/payment badges, moved out
  of the store-dashboard feature so both dashboards reuse it.

UI:

- `src/features/admin/AdminNav.tsx`: shared admin navigation.
- `src/features/admin/AdminOrdersPage.tsx`: all orders with status, payment
  status, and store filters.
- `src/features/admin/AdminOrderDetailPage.tsx`: customer, store, items,
  commission and payout, payment reference, delivery, history timeline, admin
  status transitions with a required note, optional courier/tracking fields when
  shipping, manual payment confirmation, refund marking, and dispute resolution.
- `src/features/admin/AdminPaymentsPage.tsx`: flagged and refund-due payments
  with confirm/refund dialogs.
- `src/features/admin/AdminDisputesPage.tsx`: open disputes with the customer's
  problem note and a resolve dialog.
- `src/features/admin/AdminSettingsPage.tsx`: grouped editor for commission,
  payout hold, return window, ship deadline, unpaid QR expiry, COD toggle, local
  delivery province, shop name/contact, admin Telegram chat ID, and maintenance
  mode. It validates numeric ranges and warns that a new commission rate only
  affects new orders.
- `src/features/admin/AdminPage.tsx`: store approvals now share the admin nav.

Routes added:

- `/admin/orders`
- `/admin/orders/:orderId`
- `/admin/payments`
- `/admin/disputes`
- `/admin/settings`

### Security and visibility

- `RequireRole role="super_admin"` guards every route, and the database still
  enforces `is_super_admin()` in RLS and inside each admin RPC.
- Store owners cannot reach the pages or call the admin functions through RLS
  and function checks.
- Every admin status change sends a note through `set_order_status`; the
  database saves it in `order_status_history`.
- The settings editor updates only `platform_settings.value`; RLS keeps writes
  admin-only. `create_order` copies the current commission into
  `orders.commission_percent`, so a new rate affects only new orders.
- No new migration was needed, and `database.types.ts` already contained the
  admin RPCs and settings columns.

### Local verification

Last run: 2026-10-27

- `npm run typecheck`: passed
- `npm run lint`: passed with no warnings
- `npm run test`: 14 files, 65 tests passed
- `npm run format:check`: passed
- `npm run build`: passed, with the existing Vite chunk-size warning

### Acceptance status

| Acceptance check                                    | Status                                       |
| --------------------------------------------------- | -------------------------------------------- |
| Store owner cannot reach admin screens or functions | Route + RLS/RPC path ready; live pending     |
| A commission change affects only new orders         | Snapshot path ready; live acceptance pending |
| Every admin status change has a note in history     | UI path ready; live acceptance pending       |

---

## 6c. Step 11 settlement details

### What was built

API:

- `src/api/settlement.ts`: settlement summary from `get_settlement_summary`,
  eligible-order loading, store settlement data (orders, ledger, history, order
  choices), `create_settlement`, `record_commission_settled`, and
  `record_deduction`.
- `src/lib/ledger.ts`: shared ledger-type labels for the store and admin views.

UI:

- `src/features/admin/AdminSettlementsPage.tsx`:
  - summary table with eligible orders, KHQR payable, COD commission owed,
    current balance, and estimated net;
  - store detail with the same metrics plus eligible orders and checkboxes;
  - projected net for the selected orders with a confirmation dialog;
  - bank reference required only when the settlement pays the store;
  - negative net shown as "store owes the platform" and carried forward;
  - forms to record a store transfer and an order deduction;
  - balance ledger and past settlements with direction, reference, and note.
- `src/features/admin/AdminNav.tsx`: added the settlements link.
- `src/App.tsx`: added `/admin/settlements`.

### Security and settlement rules

- Route guard `RequireRole role="super_admin"` plus `is_super_admin()` inside
  every settlement RPC.
- The database rejects ineligible orders, requires a reference for payouts,
  and records an audit trail in `ledger_entries` and `settlements`.
- `settlement_orders.order_id` is unique, so the same order cannot be settled
  twice; the UI also hides already-settled orders.
- The UI never edits or deletes ledger rows. The database is append-only.
- Eligibility uses `payout_hold_days` and `delivered_at` in the browser for the
  preview, but `create_settlement` rechecks everything before writing.
- Only stores returned by `get_settlement_summary` are listed, so stores with
  no eligible orders and a zero balance are omitted.
- No new migration was needed, and `database.types.ts` already contained the
  settlement RPCs.

### Local verification

Last run: 2026-10-27

- `npm run typecheck`: passed
- `npm run lint`: passed with no warnings
- `npm run test`: 14 files, 65 tests passed
- `npm run format:check`: passed
- `npm run build`: passed, with the existing Vite chunk-size warning

### Acceptance status

| Acceptance check                                            | Status                                 |
| ----------------------------------------------------------- | -------------------------------------- |
| Positive-net store produces a payout record with reference  | UI/DB path ready; live pending         |
| COD-only store carries a negative balance, later cleared    | Transfer path ready; live pending      |
| The same order cannot be settled twice                      | Unique constraint ready; live pending  |

---

## 6d. Step 12 Telegram notification details

### What was built

- `supabase/functions/telegram_webhook/index.ts`: receives Telegram updates,
  accepts store link codes in private chats, calls `link_telegram_chat`, and
  replies in Khmer and English.
- `supabase/functions/notify/index.ts`: reads pending and failed notifications,
  loads the order and store details with the service role, formats Khmer-first
  messages, sends them through the Telegram Bot API, and records
  `sent`/`failed`, `attempts`, and `last_error`.
- `supabase/functions/_shared/telegram.ts`: shared escaping, money/date
  formatting, constant-time secret comparison, message truncation, and the
  Telegram send call.
- `supabase/config.toml`: `telegram_webhook` has JWT verification disabled;
  `notify` keeps JWT verification enabled and also requires a `service_role`
  token.

No frontend or database migration change was needed during Step 12.

### Behavior and security

- The webhook only links private chats. Codes are single-use and expire after
  15 minutes in the existing database function.
- The webhook validates `X-Telegram-Bot-Api-Secret-Token` when
  `TELEGRAM_WEBHOOK_SECRET` is configured.
- `notify` rejects callers whose verified JWT role is not `service_role`.
- The bot reads pending rows and retries failed rows until `attempts = 5`.
- Customer name, phone, and address are included only in messages to the
  owning store chat and the admin chat.
- Every notification event has a Khmer-first message: new order, payment
  flagged, cancelled/refused/returned, failed delivery, customer problem,
  payout sent, shipping reminder, and late shipment.
- Order data remains visible in the store and admin dashboards, so Telegram is
  not the only source of truth.
- An unpaid KHQR order notifies the admin immediately, but the store is only
  notified after the existing payment trigger marks it paid.

### Required setup before live acceptance

1. Create the bot with `@BotFather` and obtain the bot token.
2. Set the function secrets. Keep them out of git and the frontend.
3. Deploy `telegram_webhook` and `notify`.
4. Register the webhook URL and the same secret token with Telegram.
5. Set `admin_telegram_chat_id` in `/admin/settings` to a private admin chat,
   not a group.
6. Configure a notify trigger: either a dashboard Database Webhook on
   `notifications` insert, or the Step 13 cron/pg_net schedule.

Commands use placeholders; replace the token and secret locally:

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN=<token> TELEGRAM_WEBHOOK_SECRET=<secret> --project-ref wdbelxrhvkikrncsgshg
npx supabase functions deploy telegram_webhook notify --project-ref wdbelxrhvkikrncsgshg
curl "https://api.telegram.org/bot<token>/setWebhook" \
  -d "url=https://wdbelxrhvkikrncsgshg.supabase.co/functions/v1/telegram_webhook" \
  -d "secret_token=<secret>"
```

A dashboard Database Webhook must send `Authorization: Bearer <service-role-key>`
to the `notify` endpoint. Store that key only in server-side configuration.

### Local verification

Last run: 2026-10-27

- `npx -y deno check` on `_shared/telegram.ts`, `telegram_webhook`, and
  `notify`: passed
- `npm run typecheck`: passed
- `npm run lint`: passed with no warnings
- `npm run test`: 14 files, 65 tests passed
- `npm run format:check`: passed
- `npm run build`: passed, with the existing Vite chunk-size warning

No live Telegram message was sent because the bot token, deployment, webhook
registration, and notify trigger do not exist yet.

### Acceptance status

| Acceptance check                                         | Status                                  |
| -------------------------------------------------------- | --------------------------------------- |
| New COD order messages the store and admin               | Code path ready; live pending           |
| KHQR order messages the store only after payment         | Trigger path ready; live pending        |
| Failed send is retried later and recorded                | Retry metadata ready; live pending      |
| Customer contact goes only to the store and admin chats  | Enforced in code; live pending          |

---

## 6e. Step 13 scheduled job details

### What was built

- `supabase/migrations/005_scheduled_jobs.sql` enables `pg_cron`, `pg_net`, and
  Supabase Vault.
- `public.invoke_notify()` reads the project URL and legacy service-role JWT
  from Vault and posts to `/functions/v1/notify` through `pg_net`.
- The migration is idempotent: it removes same-named jobs before recreating
  them.
- No frontend or `database.types.ts` change was needed.

Scheduled jobs:

| Job name             | Schedule      | Action                           |
| -------------------- | ------------- | -------------------------------- |
| `expire-unpaid-orders` | `* * * * *`   | `expire_unpaid_orders()`         |
| `complete-due-orders`  | `0 * * * *`   | `complete_due_orders()`          |
| `shipping-reminders`   | `*/30 * * * *` | `enqueue_shipping_reminders()`   |
| `cleanup`              | `30 3 * * *`  | `cleanup_rate_limits()`          |
| `telegram-notify`      | `* * * * *`   | `invoke_notify()`                |

`pg_cron` schedules are UTC; the 03:30 cleanup is 10:30 in Cambodia.

### Vault setup required before notify runs

Create these once in the SQL editor; the job skips safely while either is
missing:

```sql
select vault.create_secret('https://wdbelxrhvkikrncsgshg.supabase.co', 'project_url');
select vault.create_secret('<legacy service_role JWT>', 'notify_service_role_key');
```

- Use the legacy service-role JWT, because `notify` verifies the JWT role.
- Do not put the service-role key in git, the frontend, or a migration.
- `pg_net` keeps the decrypted key in its request queue until the request is
  sent, so restrict database login access as usual.
- Deploy `notify` before relying on the job.

### Local verification

Last run: 2026-10-27

- `npm run typecheck`: passed
- `npm run lint`: passed with no warnings
- `npm run test`: 14 files, 65 tests passed
- `npm run format:check`: passed
- `npm run build`: passed, with the existing Vite chunk-size warning

The SQL migration was reviewed but not executed locally: there is no local
Supabase database, and the Docker daemon is not running. Remote job behavior
has not been tested.

### Acceptance status

| Acceptance check                                                | Status                                |
| --------------------------------------------------------------- | ------------------------------------- |
| Expired unpaid KHQR order is cancelled and stock returns        | Function path ready; live pending     |
| Delivered orders complete after the return window               | Function path ready; live pending     |
| Shipping reminder is sent once per order                        | Dedupe path ready; live pending       |
| Telegram notify runs on schedule                                | Vault/deploy pending                  |

---

## 6f. Step 14 hardening details

### Completed locally

- Unit tests now cover 18 files and 74 tests. Added datetime, order-status,
  ledger-label, and translation-completeness tests.
- `npm run security:check` probes the hosted project with the public anon key:
  it confirmed 12 protected tables and `get_settlement_summary` are blocked,
  while the six public catalog tables remain readable.
- Reviewed the frontend source: no service-role or provider secrets. A scan of
  the production bundle found only the `sb_secret_` key-prefix detector inside
  the Supabase client; it found no literal `service_role` key.
- Reviewed RLS and grants: `orders`, `order_items`, `order_status_history`,
  `stock_movements`, `ledger_entries`, `settlements`, `settlement_orders`, and
  `store_private` are authenticated-only with owner/admin checks. Webhook
  handlers verify the KHQR HMAC and timestamp and the Telegram secret header.
- Lighthouse mobile run against the production preview:
  - Home: performance 90, accessibility 100, best practices 100, SEO 100.
  - Checkout: performance 91, accessibility 100, best practices 100, SEO 63.
    The SEO failure is the intentional `robots.txt` block on private routes.
  - No failing binary audits remain.
- Added route-level lazy loading with a localized loading fallback. The largest
  JavaScript chunk dropped from about 803 kB to 242 kB, and the Vite
  chunk-size warning is gone.
- Added a top-level error boundary with a translated recovery screen and reload
  action for render or lazy-chunk failures.
- Regenerated `src/lib/database.types.ts` from the hosted schema; it now matches
  the manual 004/005 schema, including KHQR columns and RPCs.
- Added `doc/runbook.md` for deploy, key rotation, scheduled-job checks, flagged
  payments, rollback, and post-deploy smoke tests.
- Added a meta description, `robots.txt`, darker primary-button colors, and
  removed the duplicate home-link `aria-label`.

### Still pending

- Local Docker integration tests were deferred by owner decision on 2026-10-27.
  The critical-flow checklist remains in `doc/runbook.md`.
- Supabase security/performance advisors and the remote deploy need the database
  password or dashboard access.
- Frontend host deployment and the full two-store end-to-end acceptance run.

### Acceptance status

| Acceptance check                                       | Status                                 |
| ------------------------------------------------------ | -------------------------------------- |
| Helper unit tests                                      | Passed                                 |
| Anonymous protected-table and admin-RPC checks         | Passed against hosted project          |
| Webhook authenticity review                            | Passed by code review                  |
| Lighthouse catalog and checkout                        | Passed; checkout SEO intentionally low |
| Supabase advisors                                       | Blocked on remote access               |
| Local integration suite                                 | Deferred by owner                      |
| Deployed happy path with two stores through settlement | Blocked on deployment                  |

---

## 7. Remote and environment state

Last known Supabase project:

- Name: `online-store`
- Ref: `wdbelxrhvkikrncsgshg`
- Region: Tokyo
- Function base URL:
  `https://wdbelxrhvkikrncsgshg.supabase.co/functions/v1`
- Webhook URL:
  `https://wdbelxrhvkikrncsgshg.supabase.co/functions/v1/khqr_webhook`

Last known remote status:

- Migration `004_khqr_payments.sql` and `005_scheduled_jobs.sql`: schema applied
  manually by the owner on 2026-10-27. Migration history is still empty, so
  repair `001`–`005` as applied before any future `db push`.
- Edge Functions: five active v1 deployments (`generate_khqr`, `khqr_webhook`,
  `verify_khqr_payment`, `notify`, `telegram_webhook`). Redeploy `notify` and
  `telegram_webhook` after the secret setup because their current deployments
  predate the final Step 12 commit.
- KHQR secrets: not configured. `secrets list` shows only the default Supabase
  function secrets.
- Telegram bot token, webhook secret, webhook registration, and notify trigger:
  not configured.
- `pg_cron`/`pg_net`/Vault and the `telegram-notify` job: schema is applied, but
  Vault values and job runs are not verified.
- CLI project, function, secret, and migration-list reads work. `db dump` still
  needs Docker, so remote schema inspection is limited.
- `deno` is not installed globally, but `npx -y deno check` works and the Step
  12 functions pass it.
- The Docker daemon is not running; local integration tests were deferred by the
  owner.
- Anon permission probes on 2026-10-27 blocked `orders`, `ledger_entries`,
  `store_private`, and the other protected tables, and blocked
  `get_settlement_summary`.
- No frontend host is configured; the production build is only local.
- Do not apply remote changes, set secrets, or reveal key values without owner
  approval.

Last known test data:

- Test store: `5041987f-4be5-4e84-8406-bee04ba7aeeb`
- Store slug: `test-store-766970`
- Delivery fees: local 150 cents, other 200 cents
- Variant `da42fbaa-319f-4556-96e6-ff9644d89d4a`: stock 7
- Variant `c2360bb1-b66a-428b-9f0d-a6940023a0e8`: stock 3

These values may have changed. Verify before relying on them.

---

## 8. Where to start next

### Preferred next action

Step 14 local hardening is complete; Docker integration tests are deferred by
owner decision. The owner applied all five schemas manually. Remaining deploy
work:

1. Run the Supabase security and performance advisors; fix findings.
2. Set the function secrets and Vault values, repair migration history, and
   redeploy `notify` and `telegram_webhook`.
3. Register both webhooks and deploy the frontend.
4. Run the full two-store happy path through settlement.
5. Update this document with the results.

Do not mark Step 14 complete until the deployed acceptance run passes.

Step 13 live acceptance remains pending:

1. Create Vault secrets `project_url` and `notify_service_role_key`.
2. Redeploy the `notify` Edge Function.
3. Confirm the five rows exist in `cron.job` and inspect `cron.job_run_details`.
4. Test QR expiry with stock return, completion after the return window, a
   single shipping reminder, and the notify dispatch.
5. Update this document with the results.

Step 12 live acceptance remains pending:

1. Create the bot with `@BotFather`; set `TELEGRAM_BOT_TOKEN` and
   `TELEGRAM_WEBHOOK_SECRET`.
2. Redeploy `telegram_webhook` and `notify`.
3. Register the webhook URL and secret with Telegram.
4. Set `admin_telegram_chat_id` in `/admin/settings`.
5. Confirm the Step 13 `telegram-notify` job or a Database Webhook invokes
   `notify`.
6. Test a COD order, a paid KHQR order, and a forced failed send.
7. Update this document with the results.

Step 11 acceptance is still pending:

1. Create a positive-net store with an eligible KHQR order, settle it, and
   confirm the payout record and reference.
2. Create a COD-only store with a negative balance, settle it, confirm the debt
   carries forward, then record a transfer and confirm the balance clears.
3. Try to settle the same order twice and confirm the database rejects it.
4. Update this document with the results.

Step 10 acceptance is still pending:

1. Sign in as a store owner and confirm `/admin` and the admin API calls are
   blocked.
2. Change `commission_percent`, create a new order, and confirm the new rate is
   used; confirm an older order keeps its original rate.
3. Change an order status as admin and confirm the note appears in the history.
4. Update this document with the results.

Step 9 acceptance is still pending and was deferred at the owner's request:

1. Sign in as two different store owners and confirm Store A cannot see Store
   B's orders.
2. Create an unpaid KHQR order and confirm it never appears in the store order
   list or statement.
3. Attempt an invalid status change and confirm the translated error appears.
4. Update this document with the results.

### Step 8 live acceptance (still blocked on provider secrets)

Finish when credentials and approval are available:

1. Set `KHQRDEV_TOKEN` and `KHQRDEV_WEBHOOK_SECRET`; set `KHQRDEV_CURRENCY` and
   `KHQRDEV_KHR_PER_USD` if using KHR.
2. Redeploy `generate_khqr`, `verify_khqr_payment`, and `khqr_webhook`.
3. Register the webhook URL in KHQR.dev.
4. Test the four Step 8 acceptance cases.
5. Update this document with results.

Deploy commands:

```bash
supabase functions deploy generate_khqr --project-ref wdbelxrhvkikrncsgshg
supabase functions deploy verify_khqr_payment --project-ref wdbelxrhvkikrncsgshg
supabase functions deploy khqr_webhook --no-verify-jwt --project-ref wdbelxrhvkikrncsgshg
```

---

## 9. Known open items

- Live KHQR acceptance is blocked by missing provider secrets and webhook
  registration; the schema and functions are deployed.
- Step 9 acceptance is pending; the RLS and UI paths are implemented.
- Step 10 acceptance is pending; the admin routes, RPC calls, settings editor,
  and notes are implemented locally.
- Step 11 acceptance is pending; the settlement page, payouts, transfers, and
  deductions are implemented locally.
- Step 11 needed no new migration and no regenerated `database.types.ts`.
- Step 12 acceptance is pending; the bot webhook and notification sender are
  implemented locally.
- Step 12 needs `TELEGRAM_BOT_TOKEN` and, preferably,
  `TELEGRAM_WEBHOOK_SECRET`; neither is configured remotely.
- Step 13 schema is applied remotely, but the scheduled jobs remain unverified
  until Vault secrets exist.
- Step 13 acceptance is pending; `005_scheduled_jobs.sql` adds the five cron
  jobs and the Vault-backed `invoke_notify()` function.
- Migration 005 was reviewed but not executed locally because no local Supabase
  database is running and the Docker daemon is off.
- Step 13 needs Vault secrets `project_url` and `notify_service_role_key`; the
  second must be the legacy service-role JWT.
- Step 14 added 9 tests for datetime, status metadata, ledger labels, and
  translation completeness; the suite is now 18 files and 74 tests.
- `npm run security:check` is a read-only anon probe using `.env.local`; it does
  not replace the Supabase advisors.
- Lighthouse mobile scored home 90/100/100/100 and checkout 91/100/100/63.
  Checkout SEO is intentionally low because private routes are disallowed in
  `robots.txt`.
- Route-level lazy loading removed the Vite chunk-size warning; the largest
  script chunk is now about 242 kB instead of about 803 kB.
- A top-level error boundary catches render and lazy-chunk failures and offers a
  reload action.
- Local Docker integration tests are deferred by owner decision; advisors and
  deployment are still pending.
- `doc/runbook.md` was added but its deploy and recovery steps are not executed.
- Step 14 regenerated `src/lib/database.types.ts` from the remote schema after
  migrations 004/005; it now includes the KHQR columns, `set_order_khqr`, and
  `invoke_notify`.
- Failed Telegram notifications retry until 5 attempts, then stay `failed`.
- Step 12 needed no new migration and no regenerated `database.types.ts`.
- The store dashboard does not show the bot username yet. Tell owners the bot
  username or add a public setting/link after the bot is created.
- Settlement eligibility is previewed in the browser using `payout_hold_days`
  and `delivered_at`; `create_settlement` rechecks it server-side.
- The settlement page only lists stores returned by `get_settlement_summary`;
  a store with no eligible orders and a zero balance is omitted.
- Step 10 needed no new migration and no regenerated `database.types.ts`.
- The admin order list loads up to 500 orders and filters in the browser; add
  server-side paging if order volume grows.
- The Telegram link code can now be consumed by `telegram_webhook`; live
  linking still needs the bot token and webhook registration.
- Step 9 needed no new migration and no regenerated `database.types.ts`.
- The remote schemas are applied, but repairing migration history and future
  pushes need the database password or an approved Management API path.
- `npx -y deno check` works even though `deno` is not installed globally; use it
  for Edge Function type checks.
- `doc/khqr_platform_guide.md` and
  `doc/khqrdev_payment_implementation.md` are untracked reference documents.
- Open product decisions still exist in `doc/AI_BUILD_GUIDE.md` section 7,
  including currency display, brand/domain, COD settlement rules, and who may
  mark COD delivered.

---

## 10. Useful commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run security:check
npm run types:generate
npm run format:check
npm run build

supabase projects list
supabase functions list --project-ref wdbelxrhvkikrncsgshg
supabase secrets list --project-ref wdbelxrhvkikrncsgshg
```

---

## 11. Update log

### 2026-10-27

- Replaced the checkout province free-text input with a searchable combobox
  covering all 25 Cambodian provinces, with bilingual labels, English/Khmer
  search keywords, keyboard and ARIA support, and localized display everywhere
  an order or store province is shown.
- Added `src/lib/provinces.ts`, `src/components/SearchSelect.tsx`, and province
  unit tests. Committed with the invoice work as
  `4d60f37 feat: add printable invoices and province selector`. Passed
  typecheck, lint, 81 tests, Prettier, and production build; the main chunk is
  485.95 kB.
- Added a downloadable, print-ready invoice after checkout. The invoice is a
  self-contained bilingual HTML file with store, order, customer, delivery,
  payment, item, and total details plus a print/save-as-PDF action.
- The invoice now downloads automatically once per order/tab on the COD
  confirmation and paid KHQR screens, with session and in-memory guards; the
  manual button remains as a fallback.
- Extended checkout and KHQR payment state with a validated order snapshot so
  the invoice can be downloaded from both the COD confirmation and paid KHQR
  screens. Customer text is HTML-escaped before rendering.
- Invoice changes passed typecheck, lint, 78 tests, Prettier, and production
  build before the province work added three more tests.
- Added product thumbnails to store-owner and admin order detail item rows,
  loaded through the order item variant/product relation with a branded
  initial fallback when an image is unavailable.
- Also normalized the store order quantity label to match the admin detail view.
- Order-detail image changes committed as `105ec95 feat: add product images to
  order details`. Passed typecheck, lint, 74 tests, Prettier, and production
  build.
- Committed toast notifications, admin overview refresh, and related store/admin
  success flows as `4cb62c7 feat: add toast notifications and refresh admin
  overview`.
- Added a reusable toast system mounted inside the router: success, warning,
  error, and info tones; four-toast cap; 4.2 s auto-dismiss; dismiss controls;
  action links; accessible `status`/`alert` roles; and reduced-motion-aware
  animation.
- Replaced inline success notices across the app with toasts for add-to-cart,
  product create/edit, store details, private store settings, store onboarding,
  admin overview suspend, admin settings, categories, payments, disputes,
  settlements, admin order actions, and store order status changes.
- Product editor now shows a warning toast when photos fail after the product
  itself is saved, without keeping stale route-state or inline notices.
- Toast changes are uncommitted. Passed typecheck, lint, 74 tests, Prettier, and
  production build; the main chunk is now 485.51 kB and no longer warns.
- Committed the storefront redesign as `8713c2a feat: redesign storefront
  experience`.
- Added product search autosuggestions with a 250 ms debounce, thumbnail, store,
  price, keyboard navigation, ARIA combobox/listbox behavior, and bilingual
  states; committed as `9442dff feat: add search autosuggestions`.
- Redesigned the admin overview with a dark platform hero, live store counts,
  four quick-action cards, a store directory grouped by status, store logo
  tiles, and a proper suspend confirmation dialog.
- Admin overview changes are uncommitted. Passed typecheck, lint, 74 tests,
  Prettier, and production build; the main-chunk warning remains.
- Redesigned login and signup around a shared `AuthShell`: dark brand panel with
  workspace messaging and three feature highlights, plus a white form card.
  Added bilingual auth workspace copy without changing form validation or auth
  behavior.
- Auth redesign committed as `53b70ec feat: redesign auth screens`. Passed
  typecheck, lint, 74 tests, Prettier, and production build; the main-chunk
  warning remains.
- Added a dedicated responsive admin workspace outside the public shell with a
  collapsible desktop sidebar persisted as `kos.adminSidebarCollapsed`, mobile
  drawer, admin identity card, super-admin badge, storefront shortcut, language,
  and logout actions.
- Removed the old `AdminNav`, moved admin routes under `AdminLayout`, added
  payments/disputes/categories icons and bilingual admin navigation copy, and
  normalized admin page widths.
- Admin workspace changes are uncommitted. Passed typecheck, lint, 74 tests,
  Prettier, and production build; the build still reports the main-chunk warning
  that should be reviewed in a later performance pass.
- Started the store-owner workspace refresh: added a dedicated responsive shell
  outside the public storefront, a collapsible desktop sidebar, a mobile drawer,
  persisted collapse state, store status/language/logout actions, and new
  overview/products/settings routes.
- Split the former single dashboard into overview, products, and settings pages;
  restyled store products and aligned orders/statement/order-detail cards with
  the workspace design.
- Store-owner workspace committed as `7edfeac feat: add store workspace sidebar`.
  Passed typecheck, lint, 74 tests, Prettier, and production build; the build
  reports a 520 kB main-chunk warning that should be reviewed in a later
  performance pass.
- Started a storefront design refresh after owner feedback that the current UI
  was not good enough. Direction: modern marketplace, storefront first.
- Redesigned the customer shell, home, product card/grid, category, search,
  storefront, product detail, cart, checkout, order confirmation, payment, and
  tracking pages with a warm stone canvas, dark ink sections, and emerald
  accents.
- Added shared SVG icons and a mobile bottom navigation; kept bilingual copy,
  focus states, existing order/payment behavior, and 74 passing tests.
- Passed typecheck, lint, 74 tests, Prettier, and production build after the
  refresh.
- Lighthouse mobile after the refresh: home 87/100/100/100. Fixed the mobile
  logo accessible name, footer contrast, and section subtitle contrast; the
  product collage is desktop-only so mobile LCP is the hero copy.
- Committed route splitting and runtime hardening as `7d7bf93`; recorded later
  documentation follow-ups as `f01b90c` and `bd334da`.
- Committed Step 13 as `4fe2607`.
- Started Step 14: added 9 helper/translation tests, bringing the suite to 18
  files and 74 tests.
- Added `npm run security:check`; it confirmed anon access is blocked for 12
  protected tables and the settlement summary RPC.
- Added `doc/runbook.md` for deploy, key rotation, scheduled jobs, flagged
  payments, rollback, and smoke tests.
- Fixed Lighthouse findings: meta description, `robots.txt`, darker primary
  colors, and the duplicate home-link label.
- Committed Step 14 local hardening as `3471c2f`.
- Added route-level lazy loading; the largest script chunk dropped from about
  803 kB to 242 kB and the Vite chunk-size warning cleared.
- Lighthouse mobile after splitting: home 90/100/100/100; checkout
  91/100/100/63 (intentional private-route SEO block).
- Regenerated `src/lib/database.types.ts` from the hosted schema and confirmed
  it matches the remote types exactly.
- Added `npm run types:generate` to regenerate UTF-8 types without a BOM on
  Windows.
- Added a top-level error boundary for render and lazy-chunk failures.
- Passed typecheck, lint, 74 tests, Prettier, and production build.
- Local Docker integration tests deferred by owner; Supabase advisors and
  deployment remain pending.
- Remote preflight on 2026-10-27: owner applied all five schemas manually and
  the five functions are active v1; only default Supabase function secrets
  exist. Migration history is empty, so the runbook now repairs `001`–`005`
  before any future push.
- Committed Step 12 as `410ad24`.
- Implemented Step 13 scheduling: migration 005 enables `pg_cron`, `pg_net`, and
  Vault, schedules the four maintenance jobs, and adds `invoke_notify()` every
  minute.
- Added idempotent job replacement and safe skipping until the two Vault
  secrets exist.
- Passed typecheck, lint, 65 tests, Prettier, and build. Migration SQL was
  reviewed but not executed locally because Docker is unavailable.
- Step 13 live acceptance is pending on applying the migration, Vault secrets,
  and `notify` deployment.
- Implemented Step 12 Telegram: `telegram_webhook` links private chats with
  one-time codes; `notify` sends Khmer-first order, payment, dispute, reminder,
  and payout messages and records attempts/errors.
- Added shared Telegram formatting/send helpers and function config. No
  migration or frontend change was needed.
- Passed Deno check on the new functions, plus typecheck, lint, 65 tests,
  Prettier, and build.
- Step 12 live acceptance is pending on the bot token, deployment, webhook
  registration, admin chat ID, and a notify trigger.
- Committed Step 11 as `83dcf8b`.
- Implemented Step 11 settlement: summary table, eligible-order selection,
  payout/carry-forward confirmation, store transfers, deductions, ledger, and
  settlement history.
- Added `/admin/settlements` and the settlements admin navigation link.
- No new migration was needed; existing settlement RPCs already enforce
  eligibility, references, and one-settlement-per-order.
- Passed typecheck, lint, 65 tests, Prettier, and build.
- Step 11 live acceptance is now pending.
- Committed Steps 9 and 10 as `392c3ce`.
- Implemented Step 10 admin panel: all orders with filters, order detail actions
  with required notes, payment review, open disputes, and platform settings.
- Added `/admin/orders`, `/admin/orders/:orderId`, `/admin/payments`,
  `/admin/disputes`, and `/admin/settings`, plus shared admin navigation.
- Moved order/payment badges to `src/components/OrderStatusBadge.tsx` for reuse.
- No new migration was needed; admin RPCs and settings already exist with
  `is_super_admin()` checks.
- Passed typecheck, lint, 65 tests, Prettier, and build.
- Step 9 acceptance remains pending and was deferred at the owner's request;
  Step 10 live acceptance is now pending.
- Implemented Step 9 store dashboard orders, statement, and Telegram link code.
- Added `/store/orders`, `/store/orders/:orderId`, and `/store/statement`.
- Added API wrappers for order status actions, restock, balance, ledger, and
  settlements.
- No new migration was needed; RLS already hides unpaid KHQR orders and other
  stores' orders.
- Passed typecheck, lint, 65 tests, Prettier, and build.
- Step 9 live acceptance remains pending.

### 2026-10-26

- Completed and committed Step 8 KHQR payments as `ecf9ab8`.
- Passed typecheck, lint, 65 tests, Prettier, and build.
- Left remote migration and Edge Function deployment untouched by owner choice.
- Created this process tracker.
