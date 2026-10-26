# Process Tracker: Current App State

Last updated: 2026-10-27
Branch: `main`
Latest commit: `8a7816e docs: add project process tracker`

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
| `/admin/settings`             | Platform settings editor                 |
| `/admin/categories`           | Category management                      |

Implemented behavior:

- Auth, role guards, and store onboarding.
- Categories, products, variants, images, and public catalog.
- Cart and COD checkout with server-computed delivery fee and totals.
- Guest tracking with cancel, confirm received, report problem, and reopen.
- KHQR checkout selection, QR generation, polling, signed webhook, and
  payment-status UI.
- Store order list with tabs, order detail, allowed status actions, restock, and
  translated errors.
- Store statement with balance, ledger, past settlements, and COD commission
  owed.
- Telegram link-code generation from the store dashboard.
- Admin panel with all-orders filtering, required-note status changes, payment
  review, dispute resolution, store approvals, and platform settings.
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
| 11   | Settlement                     | Not started                                 |
| 12   | Telegram notifications         | Not started                                 |
| 13   | Scheduled jobs                 | Not started                                 |
| 14   | Hardening, tests, deploy       | Not started                                 |

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

- Migration `004_khqr_payments.sql`: not applied.
- Edge Functions: not deployed.
- KHQR secrets: not configured.
- CLI can list projects, but `db push`/`migration list` still need the database
  password or a working link.
- `deno` is not installed, so Edge Functions have not been Deno-typechecked.
- Do not apply remote changes without owner approval.

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

Step 10 is implemented locally. Run its acceptance checks before starting Step
11:

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

### Step 8 live acceptance (still blocked)

Finish when credentials and approval are available:

1. Apply migration 004 to the Supabase project.
2. Set `KHQRDEV_TOKEN` and `KHQRDEV_WEBHOOK_SECRET`; set `KHQRDEV_CURRENCY` and
   `KHQRDEV_KHR_PER_USD` if using KHR.
3. Deploy `generate_khqr`, `verify_khqr_payment`, and `khqr_webhook`.
4. Register the webhook URL in KHQR.dev.
5. Test the four Step 8 acceptance cases.
6. Update this document with results.

Deploy commands:

```bash
supabase functions deploy generate_khqr --project-ref wdbelxrhvkikrncsgshg
supabase functions deploy verify_khqr_payment --project-ref wdbelxrhvkikrncsgshg
supabase functions deploy khqr_webhook --no-verify-jwt --project-ref wdbelxrhvkikrncsgshg
```

---

## 9. Known open items

- Live KHQR acceptance is blocked by missing remote migration, secrets, and
  function deployment.
- Step 9 acceptance is pending; the RLS and UI paths are implemented.
- Step 10 acceptance is pending; the admin routes, RPC calls, settings editor,
  and notes are implemented locally.
- Step 10 needed no new migration and no regenerated `database.types.ts`.
- The admin order list loads up to 500 orders and filters in the browser; add
  server-side paging if order volume grows.
- The Telegram link code can be generated, but the bot and
  `telegram_webhook` that consume it are not built until Step 12.
- Step 9 needed no new migration and no regenerated `database.types.ts`.
- Remote DB migration needs the database password or an approved Management API
  path.
- Edge Functions cannot be Deno-typechecked locally until `deno` is installed.
- `src/lib/database.types.ts` has not been regenerated after migration 004.
- The Vite build reports an existing chunk larger than 500 kB.
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
npm run format:check
npm run build

supabase projects list
supabase functions list --project-ref wdbelxrhvkikrncsgshg
supabase secrets list --project-ref wdbelxrhvkikrncsgshg
```

---

## 11. Update log

### 2026-10-27

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
