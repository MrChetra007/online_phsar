# Process Tracker: Current App State

Last updated: 2026-10-26
Branch: `main`
Latest commit: `ecf9ab8 feat: add KHQR payments`

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
| `/store/products/new`         | Create product                           |
| `/store/products/:productId`  | Edit product                             |
| `/admin`                      | Admin panel                              |
| `/admin/categories`           | Category management                      |

Implemented behavior:

- Auth, role guards, and store onboarding.
- Categories, products, variants, images, and public catalog.
- Cart and COD checkout with server-computed delivery fee and totals.
- Guest tracking with cancel, confirm received, report problem, and reopen.
- KHQR checkout selection, QR generation, polling, signed webhook, and
  payment-status UI.
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
| 9    | Store dashboard orders         | Not started                                 |
| 10   | Admin panel                    | Not started                                 |
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

Finish Step 8 live acceptance when credentials and approval are available:

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

### If the owner accepts local Step 8 validation

Start Step 9: Store dashboard orders.

Read `doc/AI_BUILD_GUIDE.md` Step 9 before coding. Required scope:

- Store order list with status tabs.
- Order detail with items and customer contact data.
- Actions through `set_order_status`: confirm, reject, ship, deliver, refuse,
  return.
- Show only the next allowed actions.
- `restock_order` for returned items.
- Statement page with `get_store_balance`, ledger rows, past settlements, and
  COD commission owed.
- Telegram link code from `create_telegram_link_code`.
- Unpaid KHQR orders must never appear for the store.

Acceptance:

- Store A cannot see Store B's orders.
- An unpaid KHQR order never appears.
- Invalid actions show the translated error.

Do not start Step 10 until Step 9 acceptance passes.

---

## 9. Known open items

- Live KHQR acceptance is blocked by missing remote migration, secrets, and
  function deployment.
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

### 2026-10-26

- Completed and committed Step 8 KHQR payments as `ecf9ab8`.
- Passed typecheck, lint, 65 tests, Prettier, and build.
- Left remote migration and Edge Function deployment untouched by owner choice.
- Created this process tracker.
