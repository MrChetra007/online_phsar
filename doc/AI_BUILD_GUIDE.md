# AI Build Guide: Local Dropshipping Platform

Put this file in the project root (or `docs/`) and point your AI assistant at it. It is written to the AI.
Companion files: `docs/project_plan.md` (v1.2, the business rules) and `supabase/migrations/001_schema.sql` (the database).
If this guide and the plan disagree, **the schema file wins on data and permissions, the plan wins on business intent**. Tell the owner about any conflict instead of silently choosing.

---

## 0. How to work (read first, follow always)

1. **One step at a time.** Do only the step the owner asked for. Finish it, run its checks, report, and stop. Do not start the next step.
2. **Small changes, shown clearly.** Before writing code for a step, give a 3-6 line plan (files to create or change). Then build.
3. **Never invent facts.** KHQR integration details (QR fields, merchant account, verification endpoint, webhook format, tokens) are **not known yet**. Do not guess them. Mark them `TODO(khqr)` and ask the owner for `docs/khqr_notes.md`. Do not invent statistics, prices, or legal claims either; use explicit placeholders.
4. **Ask before deciding.** If a requirement is missing or two documents conflict, ask one short question. Do not pick silently.
5. **Do not change the schema casually.** All database changes are new numbered migration files (`002_...sql`), never edits to `001`. Say why the change is needed first.
6. **Run what you build.** After each step run: type-check, lint, build, and the step's acceptance checks. If you cannot run something, say so plainly. Do not claim it works.
7. **Report format** at the end of every step: what was built, files touched, checks run and results, anything left undone or uncertain, and the proposed next step. Keep it short.
8. **No secrets in code or git.** Keys live in `.env.local` (frontend, public keys only) and Supabase function secrets (private keys). Never put the service-role key in the browser.

---

## 1. What we are building (one paragraph)

A curated online shop for Cambodia, starting in Battambang. Local store owners list products and ship orders with their own courier. The platform runs the storefront and marketing, collects **KHQR** payments into one platform account, and keeps a **flat commission (30% to start, editable)**. For **COD** orders the store keeps the cash and owes the platform the commission. Customers are guests (no account). Stores and the super admin log in. Money is **integer USD cents** everywhere.

Roles: `super_admin` (the owner), `store_owner`, and guest customers.

---

## 2. Stack and project rules

- React + TypeScript + Vite + Tailwind. Supabase (Postgres, Auth, Storage, Edge Functions). Frontend on Vercel or Netlify.
- Languages: **Khmer and English**, switchable. All user-facing text goes through an i18n layer from day one (`src/lib/i18n`). Khmer needs a font that supports it (e.g. Noto Sans Khmer, loaded properly). Mobile-first: most users will be on phones.
- **Components never call Supabase directly.** All data access lives in `src/api/`. Components import typed functions from there.
- **Business logic is in the database functions**, not React. The frontend calls functions and displays results. Do not recompute prices, commission, stock, or status rules in the browser (display previews only, and label them as estimates).
- Money: store and pass integers (cents). One helper `formatMoney(cents)` returns `$14.30`. Never use floats for money.
- Types: generate from the database (`supabase gen types typescript --local > src/lib/database.types.ts`) and re-generate after every migration.
- Errors: database functions raise short codes (see section 4). Map every code to a translated message in one file `src/lib/errors.ts`. Never show raw database errors to users.

Target structure:

```
src/
  api/                 # ONLY place that talks to Supabase (one file per area)
    client.ts          # createClient, nothing else
    catalog.ts  orders.ts  tracking.ts  store.ts  admin.ts  settlement.ts
  features/
    catalog/  checkout/  tracking/  store-dashboard/  admin/
  components/          # shared UI (Button, Input, Money, StatusBadge, ...)
  lib/                 # money.ts, errors.ts, i18n/, phone.ts, database.types.ts
supabase/
  migrations/          # 001_schema.sql and later numbered files
  functions/           # generate_khqr, khqr_webhook, verify_khqr_payment, notify, telegram_webhook
docs/
  project_plan.md  AI_BUILD_GUIDE.md  khqr_notes.md (owner fills)  supplier_agreement_km_en.md
```

---

## 3. How the database works (the contract)

**Customers never touch tables.** Guests use these functions (callable without login):

| Function | Purpose |
|---|---|
| `create_order(store_id, items, name, phone, address, province, payment_method, source)` | Places an order. `items` = `[{"variant_id": "...", "quantity": 2}]`. Returns `{order_id, order_code, payment_method, subtotal, delivery_fee, total_amount, qr_expires_at}`. Price, delivery fee, and commission are computed server-side. |
| `track_order(order_code, phone)` | Safe order view, or `null` if code/phone don't match. Includes `can_cancel`, `can_reopen`, `can_confirm_received`, `can_report_problem`, and the QR string only while payable. |
| `customer_cancel_order(code, phone)` | Cancel while `pending` or `confirmed`. |
| `customer_confirm_received(code, phone)` | `shipped` -> `delivered`, or records confirmation. |
| `report_problem(code, phone, note)` | Opens a dispute inside the return window. |
| `reopen_expired_order(code, phone)` | Re-reserves stock for an expired KHQR order; then a new QR must be generated. |

**Store owners and admin** (logged in; the function checks who they are):

| Function | Who |
|---|---|
| `set_order_status(order_id, new_status, note, courier_name, tracking_note)` | store (own orders) or admin (note required when admin acts) |
| `restock_order(order_id, note)` | store or admin, once, for `returned` / `refunded` orders |
| `create_telegram_link_code(store_id)` | store owner |
| `get_store_balance(store_id)` | store or admin |
| `set_store_status(store_id, status, note)` | admin |
| `confirm_payment_manually(order_id, note)` | admin |
| `mark_payment_refunded(order_id, reference, note)` | admin |
| `resolve_dispute(order_id, note)` | admin |
| `record_deduction(store_id, order_id, amount, note)` | admin |
| `record_commission_settled(store_id, amount, reference, note)` | admin |
| `get_settlement_summary()` | admin |
| `create_settlement(store_id, order_ids[], reference, note)` | admin |

**Service role only** (Edge Functions and scheduled jobs; never from the browser): `set_order_qr`, `claim_webhook_event`, `finish_webhook_event`, `mark_order_paid`, `expire_unpaid_orders`, `complete_due_orders`, `enqueue_shipping_reminders`, `link_telegram_chat`, `cleanup_rate_limits`.

**Direct table access (RLS):** public can read active categories, active stores, active products/variants/images, and public settings. Store owners can read and edit **their own** store, `store_private`, products, variants, images, and read their own orders, ledger, and settlements. Orders are **never written directly** from the client.

**Order statuses** (`order_status`): `pending, confirmed, rejected, cancelled, shipped, delivered, completed, paid_out, refused, returned, refunded`.
Allowed moves through `set_order_status`:

```
pending   -> confirmed | rejected        (store, admin)    | cancelled (admin)
confirmed -> shipped | rejected          (store, admin)    | cancelled (admin)
shipped   -> delivered | refused         (store, admin)
refused   -> returned                    (store, admin)
delivered -> returned                    (store, admin)    | completed, refunded (admin)
returned  -> refunded                    (admin)
```
`completed` is normally set automatically after the return window; `paid_out` is set only by `create_settlement`.

**Payment status** (`payment_status`): `unpaid, paid, flagged, expired, refund_due, refunded`. A store only sees a KHQR order after it is `paid`; COD orders are visible immediately.

**Order visibility rule for the UI:** do not show a store an unpaid KHQR order. The database already hides it; do not work around this.

**Notifications:** triggers write rows to `notifications` (ids only, `status = 'pending'`). The `notify` Edge Function reads them with the service role, loads the order details, sends Telegram messages, and marks them `sent` or `failed`. Events: `new_order` (admin and store), `payment_flagged`, `order_cancelled`, `order_refused`, `order_returned`, `failed_delivery`, `customer_problem`, `payout_sent`, `ship_reminder`, `late_shipment`.

---

## 4. Error codes (map each to Khmer + English text)

`MAINTENANCE, COD_DISABLED, STORE_UNAVAILABLE, INVALID_CUSTOMER, INVALID_PHONE, INVALID_ITEMS, RATE_LIMITED, SOLD_OUT, NOT_FOUND, CANNOT_CANCEL, INVALID_STATE, INVALID_NOTE, RETURN_WINDOW_CLOSED, NOT_AUTHENTICATED, FORBIDDEN, ORDER_NOT_FOUND, INVALID_TRANSITION, NOTE_REQUIRED, PAYMENT_NOT_CONFIRMED, ALREADY_RESTOCKED, INVALID_AMOUNT, REFERENCE_REQUIRED, ORDER_NOT_ELIGIBLE, ORDER_NOT_FOUND_OR_DUPLICATE, NOTHING_TO_SETTLE, INVALID_SETTING, APPEND_ONLY`

The code is the error message text from Supabase (`error.message`); extra info is in `error.details`. `SOLD_OUT` details hold the variant id: refresh that item and tell the customer. Unknown codes get one generic friendly message and are logged to the console.

---

## 5. Build steps

Each step ends with **Acceptance checks**. Do not mark a step done until they pass.

### Step 0: Project and database setup
- Create the Vite + React + TS + Tailwind project; add routing, Supabase client, ESLint, Prettier.
- Initialise Supabase locally (`supabase init`, `supabase start`), put `001_schema.sql` in `supabase/migrations/`, apply it.
- Create `.env.local.example` (public URL and anon key only). Generate database types.
- Add `docs/` files. Add a README with the exact commands to run the project.

Acceptance: `npm run dev` and `npm run build` pass; the migration applies on a fresh local database with no errors; types file generated.

### Step 1: Foundation (i18n, money, errors, layout)
- i18n with Khmer and English and a language switcher saved in the browser. Khmer font loaded.
- `formatMoney`, phone helper (accept `+855`, spaces, leading 0; match the database normalisation), `errors.ts`.
- App shell: mobile-first header, footer, loading and error states, shared components.

Acceptance: switching language changes all visible text; `formatMoney(1430) === "$14.30"`; a unit test for money and phone helpers.

### Step 2: Auth and roles
- Store-owner sign up and login (email or phone as configured in Supabase). Admin logs in the same way.
- Read the user's `profiles.role`. Route guards: `/store/*` for store owners, `/admin/*` for admin. Redirect others.
- **Never** let the client choose a role. New users are always `store_owner`; the owner promotes the first admin with the SQL line in the migration header.

Acceptance: a new user lands in the store area; they cannot open `/admin`; a manual attempt to update their own role fails.

### Step 3: Store onboarding and approval
- Store owner creates a store (name, unique slug, description, province, delivery fees local/other, logo later). It starts `pending`.
- Store owner edits private info (contact phone, bank details) on a separate form (`store_private`).
- Admin lists pending stores and approves/suspends through `set_store_status`.
- A pending or suspended store shows a clear banner. Suspended stores cannot edit products.

Acceptance: pending store is invisible to the public; after admin approval the store page `/s/slug` loads; the owner cannot change their own status.

### Step 4: Categories and product management
- Admin: manage categories (add, rename, reorder, hide; Khmer and English names; `requires_size`; parent/child).
- Store owner: create and edit products with category, description, status (`draft/active/hidden`), variants (label such as size, price in cents, stock, SKU, active flag), and images.
- Images upload to the Storage bucket `product-images` under the path `<store_id>/<product_id>/<filename>`; save the public URL in `product_images`. Limit 5 MB and jpeg/png/webp; compress on the client before upload.
- Price inputs accept dollars and convert to cents. Show the store a "you will receive $X" preview (item price minus the current commission percent, read from the public-safe source or a function; **ask the owner** how the commission percent should be exposed to stores if it is not available, because `commission_percent` is not a public setting).
- Stock edits are allowed directly; the database logs them.

Acceptance: a store sees and edits only its own products; an active product from an active store appears on the public side; uploading to another store's folder fails.

### Step 5: Public catalog
- Home (categories, featured), category page, search (by name; keep it simple), store page `/s/:slug`, product page (photos, variants, price, stock state).
- The `/s/:slug` entry should remember `source = store_link` for the checkout; every other entry uses `platform`. The rate is the same; this is for analytics only.
- Skeleton loaders, empty states, and good mobile performance (lazy images, sensible sizes).

Acceptance: pages work on a 360px-wide phone; out-of-stock variants cannot be added; inactive items never show.

### Step 6: Cart and checkout (COD first)
- Cart holds items from **one store only**. Adding from another store asks the customer to clear the cart or finish first.
- Cart is kept in browser storage so a refresh does not lose it.
- Checkout form: name, phone, address, province, payment method (COD, KHQR). Show the displayed delivery fee as an estimate; the final total comes from `create_order`.
- Call `create_order`. On success go to the confirmation page with the order code and a tracking link. Tell the customer to **save the order code**.
- Handle `SOLD_OUT`, `RATE_LIMITED`, `MAINTENANCE`, `COD_DISABLED`, `INVALID_PHONE` with clear messages.
- Enable only COD in this step; KHQR is wired in Step 8.

Acceptance: COD order creates; stock decreases; the same last item cannot be bought twice in two tabs; wrong phone formats are rejected with a friendly message.

### Step 7: Order tracking (guest)
- Page: enter order code + phone, call `track_order`. If `null`, show one neutral message ("not found or details don't match").
- Show status timeline from `history`, items, totals, courier and tracking note.
- Buttons driven by flags from `track_order`: cancel, confirm received, report a problem (with a note), reopen expired order.

Acceptance: wrong phone never reveals whether the code exists; each button appears only when its flag is true; `RATE_LIMITED` is shown nicely.

### Step 8: KHQR payment (BLOCKED until the owner supplies the details)
**Stop and ask the owner for `docs/khqr_notes.md` before writing any code here.** It must contain: QR string fields and merchant account type, how a transaction is checked (endpoint, identifier, response), whether a webhook exists and how its authenticity is verified, token or merchant registration requirements, and how amounts are expressed (USD vs KHR). If any item is missing, ask; do not assume.

Once known, build:
1. `generate_khqr` Edge Function: input `order_id`; builds the QR for the exact total and order reference with the expiry from `orders.qr_expires_at`; saves it with `set_order_qr`.
2. `khqr_webhook` Edge Function (deploy with `--no-verify-jwt` because the bank calls it): authenticate the sender, call `claim_webhook_event` first (stop if it returns false), match the order, **convert the amount to USD cents**, call `mark_order_paid`, then `finish_webhook_event` with the result. Possible results: `paid, already_paid, flagged_amount, flagged_late, flagged_duplicate_reference, ignored`.
3. `verify_khqr_payment` Edge Function: polling fallback that checks the provider and calls the same `mark_order_paid`.
4. Payment page: shows the QR, amount, countdown to expiry, and polls `track_order` every few seconds until `payment_status` becomes `paid`. Expired: offer "get a new QR", which calls `reopen_expired_order` and then `generate_khqr`.
5. The browser must **never** mark anything paid.

Acceptance (use the provider's sandbox if one exists; otherwise simulate by calling the service-role function in a test): correct payment flips the order to paid and notifies the store; wrong amount is flagged and not paid; the same webhook sent twice changes nothing; an expired order can be reopened with fresh stock.

### Step 9: Store dashboard (orders)
- Orders list with status tabs. Detail view with items, customer name, phone, address (only the owning store and admin may see these).
- Actions through `set_order_status`: confirm, reject, mark shipped (courier name + tracking note), mark delivered (for COD this confirms the cash was collected; make the wording explicit), refused, returned. Show the next allowed actions only.
- `restock_order` for returned items.
- Statement page: balance (`get_store_balance`), ledger rows, past settlements, amounts owed on COD.
- "Connect Telegram" button that shows a code from `create_telegram_link_code` and instructions.

Acceptance: store A cannot see store B's orders; an unpaid KHQR order never appears; invalid moves show the translated error.

### Step 10: Admin panel
- Orders (all), filter by status, payment status, store. Change status with a required reason.
- Payments: list `flagged` and `refund_due`; actions `confirm_payment_manually`, `mark_payment_refunded`.
- Disputes: list orders with `has_open_dispute`; `resolve_dispute`.
- Settings editor for `platform_settings` (commission percent, hold days, return window, ship deadline, QR expiry minutes, COD on/off, shop name, contact phone, maintenance mode, admin Telegram chat id). Warn that a changed commission applies to **new orders only**.
- Category management (from Step 4) and store approvals (from Step 3) linked here.

Acceptance: a store owner cannot reach any admin screen or function; changing commission changes only new orders; every admin status change has a note recorded in history.

### Step 11: Settlement (weekly, manual)
- Page from `get_settlement_summary()`: per store, eligible orders, KHQR amount payable, COD commission owed, current balance, estimated net.
- Select a store, show the eligible orders, run `create_settlement`. If the net is positive, require the bank transfer reference and show "pay this amount". If negative, show "store owes the platform; carried forward".
- Forms for `record_commission_settled` (store sent money) and `record_deduction` (with note).
- Make every amount's source clear (which orders, which ledger rows). Show a confirmation dialog before any settlement. Never let the UI edit or delete ledger rows (the database forbids it).

Acceptance: a positive-net store produces a payout record with reference; a COD-only store carries a negative balance and later clears it by a recorded transfer; the same order cannot be settled twice.

### Step 12: Telegram notifications
- Create the bot with @BotFather; token stored as a function secret.
- `telegram_webhook` Edge Function (no JWT): when a user sends the one-time code to the bot, call `link_telegram_chat(code, chat_id)` and reply with the store name. Reply politely if the code is invalid or expired.
- `notify` Edge Function: reads `notifications` where `status = 'pending'` (service role), loads order details, formats Khmer-first messages, sends via the Telegram Bot API, marks `sent`/`failed` with attempts and the error. Trigger it on a schedule or through a Database Webhook on insert.
- Customer phone and address go **only** to the owning store's chat and the admin chat. Never to a group.
- Messages must also exist as dashboard data; Telegram is not the only channel.

Acceptance: a new COD order messages the store and admin; a KHQR order messages the store only after payment; a failed send is retried later and recorded.

### Step 13: Scheduled jobs
Enable `pg_cron` and uncomment the four jobs at the bottom of `001_schema.sql` as a new migration: expire unpaid orders (every minute), complete due orders (hourly), shipping reminders (every 30 minutes), cleanup (daily). Also schedule or trigger the `notify` function.

Acceptance: an unpaid KHQR order past its expiry is cancelled and its stock returns; delivered orders complete after the return window; reminders send once per order.

### Step 14: Hardening, tests, deploy
- Tests: unit tests for helpers; integration tests against local Supabase for the critical flows (create order, stock race, payment webhook variants, settlement netting, permission walls).
- Security pass: confirm no service-role key in the frontend bundle; confirm anonymous users cannot read `orders`, `ledger_entries`, `store_private`; confirm owners cannot read each other's data; confirm webhook endpoints verify authenticity.
- Run the Supabase security and performance advisors; fix findings.
- Accessibility and mobile checks; Lighthouse pass on the catalog and checkout pages.
- Deploy: Supabase project (apply migrations, set secrets, deploy functions), frontend on Vercel/Netlify with the public env vars. Write a short `docs/runbook.md`: how to promote an admin, rotate keys, redeploy functions, and handle a flagged payment.

Acceptance: the full happy path works end to end on the deployed site with two test stores, one KHQR order and one COD order, through to a settlement.

---

## 6. Things the AI must never do

- Compute prices, commission, stock, or allowed status moves in the browser as the source of truth.
- Query `orders` by phone number from the frontend, or expose customer phone/address anywhere except the owning store and admin.
- Use the service-role key outside Edge Functions and scheduled jobs.
- Mark a payment as paid from client code.
- Edit, delete, or "fix" ledger or status history rows.
- Guess KHQR, bank, courier, or legal details.
- Add out-of-scope features (reviews, chat, courier APIs, multiple commission tiers, native apps, themes). The plan's non-goals list applies until real orders prove a need.

## 7. Open decisions that affect the build

Ask the owner before building the parts they affect: KHQR details (Step 8), how stores may see the commission percent for the price preview (Step 4), COD commission settlement rule for COD-only stores (Step 11), who may mark COD delivered (Step 9), KHQR order expiry minutes (seeded as 30, a placeholder), currency display (USD only vs adding riel), brand name and domain, and courier guidance for stores.
