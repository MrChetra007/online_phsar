# Project Plan: Local Dropshipping Platform for Cambodia

Working name: **TBD** (placeholder: "Local Dropship Shop")
Owner / super admin: Tra
Start market: Battambang, then all of Cambodia
Document status: v1.2 draft, 2026-10-26 (flat commission, store-run couriers and COD, extra order statuses, KHQR webhook in MVP)

Changes from v1.1: flat editable commission (one rate for all orders); stores arrange and pay couriers and collect COD cash themselves; `paid_out` status and delivered -> returned / refunded paths added; KHQR webhook moved into the MVP; atomic stock handling written down.

---

## 1. Summary

A curated online shop where local store owners list small, easy-to-ship products and ship the orders themselves. The platform owner runs the storefront, marketing, payment collection (KHQR), and customer support, and keeps a commission on each order. Stores pay nothing to join.

```
Store owner (stock + shipping)  ->  Platform (marketing, orders, payment)  ->  Customer
```

What makes it different from Khmer24 / Shopee / Facebook sellers:

- Customers buy from one trusted brand, not from random sellers.
- Local suppliers mean 1-3 day delivery instead of weeks.
- COD plus ABA/Bakong QR, Khmer-language support, Telegram-based ordering for stores.
- Stores get orders and payouts with zero upfront cost.

Honest framing: this is a **shop business that happens to need software**, not a software product. The hard parts are reliable stores, steady order flow, COD handling, and marketing. The app only automates what has already been proven by hand.

---

## 2. Goals and non-goals

### Goals (first 3 months)

1. Prove that customers in Battambang will order and that stores will ship on time.
2. Get 3-5 reliable stores and 30+ real delivered orders.
3. Keep every money movement traceable (no lost cash, no disputes without a record).
4. Build an MVP small enough to ship in 2-3 weeks of focused work.

### Non-goals (do not build yet)

- Multiple resellers, referral links, commission tiers
- Automatic payouts to stores
- In-app chat, reviews and ratings
- Courier / shipping API integrations (each store arranges and pays its own courier)
- Skincare and other regulated or high-dispute categories
- Native mobile app (responsive web first)
- Custom domains, themes, or store-builder features

KHQR payment collection and verification (webhook, polling fallback) IS in scope, see section 6.2.

---

## 3. Business model

### 3.1 Who does what

| Party          | Responsibility                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Store owner    | Lists products and stock, sets retail price and delivery fee, packs and ships, **arranges and pays the courier**, **collects COD cash**, handles wrong/damaged items |
| Platform (you) | Storefront, marketing and ads, collects KHQR payments, customer support, pays stores for KHQR orders, collects commission on COD orders, resolves disputes           |
| Customer       | Orders, pays (QR or COD), receives, confirms or reports a problem                                                                                                    |

### 3.2 Pricing and commission

- The **store sets one retail price** per product (and per variant if needed). Customers see the same price everywhere.
- The platform keeps a **flat commission percentage** out of the item subtotal: **30% to start**, editable by the super admin in `platform_settings`. The same rate applies to every order.
- Delivery fee is passed to the store with **no commission**.
- The rate is **copied onto each order at creation**, so changing the setting never alters old orders.
- Orders still record a `source` (`platform` or `store_link`) for analytics only; it does not change the rate. A per-source rate can be added later if the data shows it is needed.
- The app shows a store "you will receive $X" preview while it types a price.

Worked example (item $14.30, delivery $1.00):

```
Customer pays:        $14.30 + $1.00 = $15.30
Commission (30%):     $14.30 x 0.30 = $4.29
Store keeps/receives: $14.30 - $4.29 + $1.00 = $11.01
```

- **KHQR order:** the customer pays the platform $15.30; the platform pays the store $11.01 after delivery and the hold period.
- **COD order:** the courier hands $15.30 to the store; the store owes the platform $4.29 commission (see section 6.3).

The 30% is a **starting guess**. Validate it against real supplier prices and local competitor prices (Facebook, Khmer24) before fixing it.

### 3.3 Unit economics check (per order, illustrative)

| Item                                 | Amount     |
| ------------------------------------ | ---------- |
| Item subtotal                        | $14.30     |
| Commission earned (30%)              | $4.29      |
| Payment / QR / packaging costs       | ~$0.20     |
| Ads or content cost per order        | ~$1.00     |
| Failed delivery / returns (averaged) | ~$0.50     |
| **Net to you**                       | **~$2.60** |

This leaves out your own time, bank fees, and ad cost above $1 per order. Store-link orders earn the same commission but cost almost nothing to acquire.

### 3.4 Risks to the model

- Customers compare prices with Facebook and Khmer24; a price 30% above local shops will not sell.
- Stores may redirect customers to order directly and skip the platform. Trust in the platform, payment protection, and real marketing value are the defense; a flat rate at least removes any reason for a store to prefer its own link over the platform.
- COD refusals cost shipping both ways; see section 6.5.
- COD commission is money the store owes you after it has already collected the cash; see section 6.3.

---

## 4. Users and features

### 4.1 Roles

| Role          | Who            | Access                                        |
| ------------- | -------------- | --------------------------------------------- |
| `super_admin` | You            | Everything                                    |
| `store_owner` | Approved store | Own store, own products, own orders only      |
| Customer      | Public / guest | Catalog, checkout, own order via code + phone |

### 4.2 MVP features (build first)

**Customer**

- Browse by category, search, product page with photos, sizes, price
- Cart limited to **one store per order**
- Guest checkout: name, phone, address, province, payment method
- Payment: dynamic **KHQR** (exact amount + order code, scanned with any Cambodian banking app) or COD
- Order confirmation page with order code and tracking link
- Tracking page: look up by order code + phone
- Cancel before the store marks it shipped
- Confirm received, or report a problem within the return window

**Store owner**

- Dashboard login (email or phone)
- Manage products: name, description, photos, category, variants (size/color), stock, price
- Delivery fee settings: local (Battambang) and rest of Cambodia
- Orders list by status; confirm / reject; mark shipped (courier + tracking note); mark delivered (for COD, this confirms cash collected)
- Telegram alerts for new orders and reminders
- Statement: payouts received, commission owed on COD orders, deductions, running balance
- Own store page and shareable link: `/s/store-slug`

**Super admin**

- Approve / suspend stores
- Manage categories (dynamic, platform-wide) and platform settings (including the commission rate)
- View all orders, change status with a reason, handle refused / returned / refunded
- Confirm KHQR payments manually when automatic verification fails
- Record COD commission received from stores (transfers)
- Weekly settlement per store: payouts, COD commission netting, deductions; mark paid with reference
- Telegram alerts: new order, failed delivery, late shipment, complaint

### 4.3 Later (after real orders prove the need)

- Phone OTP login and customer order history
- Telegram inline buttons ("Mark as shipped")
- Stock sync helpers, low-stock alerts
- Admin analytics: margin, best sellers, ad cost vs orders
- Request-a-category button for stores
- Optional per-source or per-category commission rates

---

## 5. Categories and settings

### 5.1 Categories

- Stored in the database, not in code. One shared list for every store.
- Stores **pick** from the list; only the super admin can add, rename, reorder, hide, or delete.
- Supports parent / child categories.
- Launch with: Clothes. Add Shoes and Bags once clothes sell steadily. Accessories next. Skincare only after trust and quality controls exist.
- Per-category rule for v1: `requires_size` only. Add per-category return window or commission later if needed.

### 5.2 Platform settings (key-value, super admin only)

| Key                         | Starting value        | Meaning                                                       |
| --------------------------- | --------------------- | ------------------------------------------------------------- |
| `commission_percent`        | 30                    | Flat commission on every order's item subtotal                |
| `payout_hold_days`          | 3                     | Days after delivery before an order is included in settlement |
| `return_window_days`        | 3                     | Days a customer can report a problem                          |
| `store_ship_deadline_hours` | 48                    | Expected time from confirmation to shipped                    |
| `unpaid_qr_expiry_minutes`  | TBD (15-30 suggested) | How long an unpaid KHQR order holds stock                     |
| `cod_enabled`               | true                  | Allow cash on delivery                                        |
| `shop_name`                 | ""                    | Public shop name                                              |
| `shop_contact_phone`        | ""                    | Shown to customers                                            |
| `admin_telegram_chat_id`    | ""                    | Receives admin alerts                                         |
| `maintenance_mode`          | false                 | Pauses checkout                                               |

Only a safe subset (shop name, contact phone) is readable by the public.

---

## 6. Orders, money, and payouts

### 6.1 Order status flow

```
pending -> confirmed -> shipped -> delivered -> completed -> paid_out
   |           |           |           |
   v           v           v           v
cancelled   rejected    refused     returned -> refunded
                           |           |
                           v           v
                        returned    refunded
                           |
                           v
                        refunded
```

Reading the diagram: `shipped -> refused -> returned -> refunded` (COD refusal at the door), `delivered -> returned -> refunded` (customer reports a problem and sends the item back), and `delivered -> refunded` (refund with no physical return, for example a partial refund).

| Status      | Set by                                                     | Meaning                                                                        |
| ----------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `pending`   | system                                                     | Order placed, waiting for store (and for payment, if KHQR)                     |
| `confirmed` | store                                                      | Store accepts and will ship                                                    |
| `rejected`  | store                                                      | Out of stock or cannot ship; customer refunded                                 |
| `cancelled` | customer / admin / system                                  | Cancelled before shipping, or unpaid KHQR expired                              |
| `shipped`   | store                                                      | Handed to courier                                                              |
| `delivered` | store (confirms delivery / COD cash collected) or customer | Customer has the item                                                          |
| `completed` | system                                                     | Return window passed with no problem                                           |
| `paid_out`  | system / admin                                             | Included in a weekly settlement: store paid (KHQR) or commission settled (COD) |
| `refused`   | store / admin                                              | Customer refused at the door (COD)                                             |
| `returned`  | store / admin                                              | Item sent back                                                                 |
| `refunded`  | admin                                                      | Money returned to customer                                                     |

A problem found **after** `completed` or `paid_out` is handled as a ledger `deduction` against the store, not by moving the order back in the status flow.

Every change writes a row to `order_status_history` (who, when, old, new, note).

### 6.2 Payment methods

- **KHQR (dynamic, per order):**
  1. At checkout an Edge Function generates a KHQR for that order with the exact amount, the order code, and an expiry time.
  2. The customer scans and pays with any Cambodian banking app. All money lands in the platform's single merchant account.
  3. The order stays `pending` with `payment_status = unpaid` until the **server** confirms the payment. The browser can never mark an order paid.
  4. **Primary: webhook.** A `khqr_webhook` Edge Function receives the payment callback. It must (a) verify the sender is genuine, (b) match amount and order reference, (c) be **idempotent**, so a repeated callback cannot pay an order twice (every event id is stored in `webhook_events` with a unique constraint), and (d) never mark paid on a wrong amount.
  5. **Fallback: polling.** If the webhook is missing or late, `verify_khqr_payment` polls the KHQR transaction-check API for a few minutes after checkout.
  6. On a verified payment: `payment_status = paid`, `paid_at` and `payment_reference` are saved, a `customer_payment` ledger entry is written, and only then does the store get its Telegram alert.
  7. If neither works, admin can confirm manually from a proof screenshot (last resort).
  8. A wrong amount is flagged for admin, never auto-marked paid. An expired QR can be regenerated for the same order, if stock is still available.
  - Implementation details (QR fields, merchant account type, verification endpoint, webhook support and signature method, token requirements) come from the KHQR documentation and are **not yet filled in**; see open decision 9. If the API turns out to offer no webhook, the plan falls back to polling plus manual confirm.
- **COD (store-run):** the platform does not touch the courier or the cash.
  1. The store ships with its own courier and pays the courier.
  2. The courier collects the cash from the customer and hands it to the **store**.
  3. The store marks the order `delivered`, which confirms the cash was collected.
  4. The store now owes the platform the commission for that order; this becomes a ledger entry and is settled weekly (section 6.3).
  5. Because the platform cannot see the cash, repeated fake "delivered" or "refused" claims by a store are a risk; admin spot-checks by calling customers.

### 6.3 Settlement (weekly, manual)

An order is **eligible for settlement** when all are true:

1. Status is `delivered` or `completed`
2. `payout_hold_days` have passed since delivery
3. Payment is confirmed: KHQR `paid`, or COD marked delivered by the store
4. No open dispute, return, or refund

Each store has one running balance made of:

- **Plus:** `store_payable` for eligible KHQR orders (item subtotal minus commission, plus delivery fee)
- **Minus:** `commission_receivable` for eligible COD orders (item subtotal x commission percent)
- **Minus:** deductions (refunds charged to the store, late-shipment penalties)

Weekly run:

1. Admin opens "Settlement" grouped by store and sees each store's net balance.
2. **Net positive:** admin transfers that amount by bank, enters the reference, marks paid.
3. **Net negative** (typical for a COD-heavy store): the store owes the platform. The balance carries forward and is netted against future KHQR payouts, or the store transfers it. Admin records the transfer as `commission_settled`.
4. Orders included in the run move to `paid_out`; ledger entries are written.
5. The store sees a statement: orders, COD commission owed, deductions, and amount paid or owed.

Settlement method for stores that only sell COD, and any threshold for requiring a transfer, is open decision 11.

### 6.4 Ledger

Every money movement is a row in `ledger_entries` (order_id, store_id, type, amount, note, created_at). Types: `customer_payment` (KHQR received by the platform), `cod_collected_by_store` (informational, cash the store collected), `commission`, `delivery_fee_passthrough`, `store_payable`, `commission_receivable` (COD commission the store owes), `commission_settled`, `payout_paid`, `refund`, `deduction`. Balances are computed from the ledger, never from a hand-edited number.

### 6.5 Rules for refunds, returns, and COD refusals (decide and write down before onboarding stores)

- Wrong, damaged, or not-as-described item: **store refunds**; for KHQR orders the amount is deducted from its next settlement, for COD orders the store refunds the customer directly and the commission on that order is cancelled.
- Store rejects or cannot ship: customer is refunded in full (KHQR) or never charged (COD); no cost to customer.
- Customer refuses COD without a valid reason: the store has paid the courier both ways. Default proposal: the **store bears the cost**, because it controls its courier and packing. If you want to attract early stores, the platform can reimburse the first refusal as a promotion (open decision 3). Repeat refusers are flagged by phone number.
- Store ships late (over `store_ship_deadline_hours`): warning, then deduction or suspension.
- These rules go into a one-page supplier agreement (Khmer + English) that each store accepts, even by Telegram confirmation. The agreement must also state that the store owes the platform its commission on COD orders and when it is due.

### 6.6 Currency and amounts

- Store all amounts as **integers** in USD cents for v1. Display riel conversion later if needed.
- Each order item stores `unit_price`, `quantity`, and name snapshot at purchase time.
- Never use floats for money.

### 6.7 Stock handling

- `create_order` reserves stock **atomically**: for each item it runs one guarded decrement ("subtract the quantity only where stock is at least the quantity") inside the same transaction as the order insert. If any item fails, the whole order is rolled back and the customer sees "sold out".
- Two customers can never both take the last item, because the check and the decrement are one statement, not a read followed by a write.
- Stock is **returned** when an order is `cancelled`, `rejected`, or auto-cancelled after the KHQR expiry. It is returned for `returned` orders only after the store confirms the item is resellable.
- A scheduled job cancels unpaid KHQR orders after `unpaid_qr_expiry_minutes` and releases their stock.
- Every stock change is logged (order id, variant, delta, reason) so counts can be audited.

---

## 7. Notifications (Telegram)

One-way notifications first; buttons later.

**To store owners**

- New **paid** order, or new COD order (product, size, quantity, customer name, phone, address, delivery fee, payout or commission amount). Unpaid KHQR orders are not sent to stores.
- Reminder if not marked shipped after 24 hours
- Order cancelled / refused / returned
- Payout sent, or settlement balance owed

**To admin**

- Every new order
- Refused or failed delivery
- Store has not shipped by deadline
- Customer reported a problem
- Store balance owed to the platform above a threshold
- Low stock on a popular item (later)

**Linking a store to Telegram**

1. Store clicks "Connect Telegram" in the dashboard and gets a one-time code.
2. Store sends the code to the bot.
3. Bot saves `telegram_chat_id` on the store.

**Implementation**

- Bot created with @BotFather; token stored as an Edge Function secret.
- Database trigger or webhook on `orders` insert and status change calls an Edge Function.
- A single `notify()` function sends the message and logs to `notifications` (status: sent / failed). Later channels (SMS, Messenger) plug into the same function.
- Customer phone numbers and addresses go only to the store that owns the order, never into a shared group.
- Telegram is **not** the only channel: everything also appears in the dashboard.

---

## 8. Technical architecture

### 8.1 Stack

- **Frontend:** React + TypeScript + Vite + Tailwind
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **Hosting:** Vercel or Netlify for the frontend; Supabase hosted project
- **Future option:** Spring Boot + **PostgreSQL** (not MySQL, to avoid a second migration)

Supabase comfortably handles this business for a long time. Moving to Spring Boot later is about control (complex payouts, integrations, background jobs), not capacity, so do not build for it now.

### 8.2 Rules that keep migration easy

1. Components never call Supabase directly; all data access lives in `src/api/`.
2. Business logic (create order, stock deduction, commission, settlement calculation, status transitions) runs in **Postgres functions or Edge Functions**, not in React.
3. All schema changes are versioned **SQL migration files** in `supabase/migrations/`.
4. RLS controls **who can see what**; business rules live in functions, not only in RLS.
5. UUID primary keys, integer money, enum-style status fields.
6. Supabase-specific pieces (Auth, Storage, Realtime) are isolated behind small wrappers.

### 8.3 Project structure

```
project/
  src/
    api/              # only place that talks to Supabase
    features/
      catalog/
      checkout/
      tracking/
      store-dashboard/
      admin/
    components/
    lib/
  supabase/
    migrations/       # versioned SQL
    functions/        # create_order, notify, settlement, khqr_webhook, telegram webhook
  docs/
    project_plan.md
    supplier_agreement_km_en.md
```

### 8.4 Data model (core tables)

| Table                  | Purpose / key columns                                                                                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`             | user id, role (`super_admin`, `store_owner`), name, phone                                                                                                                                                                                                                                                   |
| `stores`               | owner_id, name, slug (unique), status (`pending`, `active`, `suspended`), telegram_chat_id, delivery_fee_local, delivery_fee_other, bank/payout info                                                                                                                                                        |
| `categories`           | parent_id, name_km, name_en, slug, sort_order, is_active, requires_size                                                                                                                                                                                                                                     |
| `products`             | store_id, category_id, name, description, status, created_at                                                                                                                                                                                                                                                |
| `product_variants`     | product_id, label (size/color), price, stock, sku                                                                                                                                                                                                                                                           |
| `product_images`       | product_id, url, sort_order                                                                                                                                                                                                                                                                                 |
| `stock_movements`      | variant_id, order_id, delta, reason, created_at                                                                                                                                                                                                                                                             |
| `orders`               | order_code, store_id, source (`platform`/`store_link`), customer_name, phone, address, province, payment_method, payment_status, payment_reference, qr_string, qr_expires_at, paid_at, status, subtotal, delivery_fee, commission_percent, commission_amount, store_payout_amount, delivered_at, created_at |
| `order_items`          | order_id, variant_id, name_snapshot, unit_price, quantity                                                                                                                                                                                                                                                   |
| `order_status_history` | order_id, old_status, new_status, changed_by, note, created_at                                                                                                                                                                                                                                              |
| `ledger_entries`       | order_id, store_id, type, amount, note, created_at                                                                                                                                                                                                                                                          |
| `settlements`          | store_id, period, net_amount, direction (`platform_pays` / `store_pays`), reference, settled_at                                                                                                                                                                                                             |
| `settlement_orders`    | settlement_id, order_id                                                                                                                                                                                                                                                                                     |
| `webhook_events`       | provider, event_id (unique), payload, processed_at                                                                                                                                                                                                                                                          |
| `notifications`        | target, channel, message, status, created_at                                                                                                                                                                                                                                                                |
| `telegram_link_codes`  | store_id, code, expires_at                                                                                                                                                                                                                                                                                  |
| `platform_settings`    | key, value (jsonb), description, updated_at                                                                                                                                                                                                                                                                 |

For COD orders, `store_payout_amount` is informational (what the store keeps); the amount that matters for settlement is `commission_amount`.

### 8.5 Security (RLS and access)

- Public can read active categories, active stores' active products, and a safe subset of settings.
- Store owners can read and write **only their own** store, products, variants, and orders.
- Super admin has full access.
- Customers have no direct table access. Order creation and tracking go through **security-definer functions**: `create_order(...)` and `track_order(order_code, phone)`. The frontend never queries `orders` by phone directly.
- Order codes are random and non-sequential, so order code + phone cannot be guessed.
- Rate-limit order creation and tracking lookups by IP and phone to reduce abuse.
- Validate everything server-side: stock, price from the database (never from the client), commission.
- The webhook endpoint accepts only requests that pass the KHQR provider's authenticity check and rejects replays.
- Never log or expose customer phone numbers outside the owning store and admin.

### 8.6 Core database functions

- `create_order(store_id, items[], customer, payment_method, source)`: checks and decrements stock atomically (section 6.7), reads prices from the database, snapshots items, computes delivery fee, commission, and store payout, writes the order and status history, triggers notification.
- `set_order_status(order_id, new_status, note)`: validates allowed transitions per role, writes history and ledger entries, returns stock where required.
- `track_order(order_code, phone)`: returns a safe subset of order data.
- `get_settlement_summary()` and `create_settlement(store_id, order_ids[], reference)`: weekly settlement flow, including COD commission netting.
- `generate_khqr(order_id)` (Edge Function): builds the KHQR for the order and saves `qr_string` and `qr_expires_at`.
- `khqr_webhook` (Edge Function): authenticates the callback, deduplicates through `webhook_events`, matches amount and reference, marks the order paid, writes the ledger entry, triggers the store notification.
- `verify_khqr_payment(order_id)` (Edge Function): polling fallback using the KHQR verification API, with the same checks.
- `confirm_payment_manually(order_id, note)`: admin fallback when automatic verification fails.
- `record_commission_settled(store_id, amount, reference)`: admin records a COD commission transfer from a store.
- `expire_unpaid_orders()` (scheduled): cancels expired unpaid KHQR orders and releases stock.

---

## 9. Build plan

Assumes focused 1-2 week sprints. Run the manual pilot in parallel with building, not after.

### Phase 0: Validate by hand (weeks 1-2, no software)

- Recruit 3-5 stores in Battambang (clothes first) and collect photos, sizes, prices, stock.
- Set a tentative retail price per item; check against Facebook and Khmer24 prices.
- Take orders through a Facebook page and Telegram; payment to your ABA QR for prepaid orders; COD orders collected by the store; track in a spreadsheet, including commission owed on COD.
- Pay stores manually after delivery and settle COD commission weekly.
- Target: 10-20 real orders.
- **Decision gate:** if fewer than ~10 orders, or stores do not ship reliably or do not pay COD commission, fix the offer or stores before building more.

### Phase 1: MVP build (weeks 2-4)

- Supabase project, migrations, RLS, roles
- Catalog, product pages, categories, store pages
- Guest checkout, atomic order creation, tracking page
- KHQR: generate QR at checkout, webhook confirmation, polling fallback, expiry and regenerate, admin manual-confirm fallback
- Store dashboard: products, variants, orders, status updates, statement
- Admin: stores, categories, settings, orders, payment confirmation, settlement (payouts and COD commission)
- Telegram bot notifications (stores + admin)
- Deploy, seed with pilot stores and products

### Phase 2: Real-orders pilot (weeks 5-8)

- Move pilot orders into the app; keep Facebook / TikTok as traffic sources.
- Add store links (`/s/store-slug`), recorded as order source for analytics.
- Fix whatever stores and customers actually struggle with.
- Track metrics (section 10) weekly.

### Phase 3: Improve (week 9+)

- Phone OTP login and order history
- Telegram inline buttons, stock alerts
- Admin analytics
- Onboard more stores and the next category (shoes, then bags)
- Consider automating payouts once manual settlement takes too much time (roughly 50-100 orders/week)

---

## 10. Metrics

Weekly:

- Orders (platform vs store-link)
- Delivered %, refused %, returned %, cancelled %
- KHQR vs COD share
- COD commission owed vs received (aging)
- Average time confirm -> shipped
- Average order value and gross margin per order
- Ad / content cost per order
- Active stores (shipped at least one order this week)
- Repeat customers

Go / no-go signals after 8 weeks:

- Steady weekly orders and rising
- Refused + returned under ~15% of orders
- Net margin per order is positive after ads and failures
- At least 3 stores ship on time without chasing
- Stores pay COD commission on time without chasing

---

## 11. Risks and mitigations

| Risk                                           | Impact                                   | Mitigation                                                                                                                                        |
| ---------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unreliable stores                              | Late or missing shipments kill trust     | Hand-pick stores, ship deadline, deductions, suspension                                                                                           |
| Stores keep COD cash and do not pay commission | Platform earns nothing on COD orders     | Net against KHQR payouts, weekly transfer rule, balance threshold, suspend stores that fall behind, push KHQR                                     |
| Not enough orders                              | Stores lose interest, no revenue         | Start with free content (TikTok, Facebook), prove demand in Phase 0, do not buy ads before something sells                                        |
| COD refusals                                   | Shipping cost both ways                  | Clear cost rules, flag repeat refusers, encourage QR with small incentive                                                                         |
| Thin or negative margin                        | Business loses money                     | Check prices against local market, track margin per order, adjust commission                                                                      |
| Price comparison with local sellers            | No sales                                 | Pick products with a real edge (design, quality, guarantee, fast Battambang delivery)                                                             |
| Holding other people's money                   | Cash-flow and legal exposure             | Pay only after delivery + hold, keep clean ledger, ask a local accountant or lawyer about vendor-fund rules once volume grows (not verified here) |
| Customer data exposure                         | Privacy and trust loss                   | RLS, functions for guest access, never expose phone/address beyond owning store and admin                                                         |
| Duplicate or forged payment callbacks          | Orders marked paid without money         | Authenticate webhook, idempotency table, amount check, manual review for mismatches                                                               |
| Overselling                                    | Cancelled orders, angry customers        | Atomic stock decrement, release on expiry and cancellation                                                                                        |
| Scope creep                                    | MVP never ships                          | Respect the non-goals list; add features only after real orders ask for them                                                                      |
| Solo founder time                              | Orders and messages need daily attention | Keep the catalog small, batch settlements weekly, automate notifications first                                                                    |
| Fake or poor-quality products                  | Reputation damage                        | Quality check samples before listing, return rules, store accountability                                                                          |

---

## 12. Open decisions

1. ~~Customer price rule~~ **Decided:** one retail price set by the store.
2. **Final commission number:** 30% flat is the starting value and is editable; confirm with real supplier costs.
3. **Who bears refused-COD shipping cost:** default is the store (it arranges the courier); optionally the platform reimburses the first refusal as a promotion.
4. **Currency:** USD cents only, or USD + KHR display.
5. **Curated shop or store-builder:** this plan assumes a curated shop; adding themes, custom domains, and store branding would make it a separate SaaS.
6. **Brand and domain name.**
7. ~~Courier choice~~ **Decided:** the platform does not integrate with couriers; each store arranges and pays its own.
8. **Legal / business registration** and tax requirements once income grows.
9. **KHQR integration details** (from the existing KHQR documentation): QR string fields and merchant account type, how to check a transaction (endpoint, identifier, response), **whether a webhook exists and how its authenticity is verified**, API token / merchant registration requirements, and whether it works from Supabase Edge Functions.
10. **KHQR order expiry:** how long an unpaid order holds stock (for example 15-30 minutes) before it is auto-cancelled.
11. **COD commission settlement:** netting against KHQR payouts only, weekly bank transfer by the store, or both; and what balance owed triggers a required transfer or a suspension.
12. **Who confirms COD delivery:** the store alone, or also the customer, and how disputes about "delivered" are handled.

---

## 13. Immediate next steps

1. Finalize the open decisions above (at least 2, 3, 9, 11).
2. Write the supplier pitch and one-page agreement (Khmer + English), including the COD commission rule.
3. Visit 3-5 Battambang stores; collect products, prices, photos.
4. Start the Phase 0 manual pilot (Facebook page + Telegram + spreadsheet).
5. In parallel, write the first SQL migration: roles, stores, categories, products, variants, stock movements, orders, order items, status history, ledger, settlements, webhook events, settings, RLS, and `create_order`.
6. Build the MVP in the order: catalog -> checkout -> store dashboard -> admin -> Telegram.

---

## Appendix A: Starter SQL (categories and settings)

```sql
create table categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references categories(id) on delete set null,
  name_km text not null,
  name_en text not null,
  slug text not null unique,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  requires_size boolean not null default false,
  created_at timestamptz not null default now()
);

create table platform_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into platform_settings (key, value, description) values
  ('commission_percent', '30', 'Flat commission on every order item subtotal'),
  ('payout_hold_days', '3', 'Days after delivery before an order is included in settlement'),
  ('return_window_days', '3', 'Days a customer can report a problem'),
  ('store_ship_deadline_hours', '48', 'Expected hours from confirmation to shipped'),
  ('unpaid_qr_expiry_minutes', '30', 'Minutes an unpaid KHQR order holds stock (to be decided)'),
  ('cod_enabled', 'true', 'Allow cash on delivery'),
  ('shop_name', '""', 'Public shop name'),
  ('shop_contact_phone', '""', 'Shown to customers'),
  ('admin_telegram_chat_id', '""', 'Receives admin alerts'),
  ('maintenance_mode', 'false', 'Pauses checkout');

alter table categories enable row level security;
alter table platform_settings enable row level security;

create policy "public read categories" on categories
  for select using (is_active = true);
```

## Appendix B: Order-related additions

```sql
create type order_source as enum ('platform', 'store_link');

create type order_status as enum (
  'pending', 'confirmed', 'rejected', 'cancelled', 'shipped',
  'delivered', 'completed', 'paid_out', 'refused', 'returned', 'refunded'
);

-- on stores
alter table stores
  add column slug text unique,
  add column delivery_fee_local int not null default 0,
  add column delivery_fee_other int not null default 0;

-- on orders
alter table orders
  add column source order_source not null default 'platform',
  add column commission_percent numeric(5,2) not null,  -- copied from commission_percent setting
  add column commission_amount int not null,
  add column delivery_fee int not null default 0,
  add column store_payout_amount int not null,
  add column payment_reference text,   -- from KHQR verification
  add column qr_string text,
  add column qr_expires_at timestamptz,
  add column paid_at timestamptz;

-- payment callback deduplication
create table webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);
```

## Appendix C: Supplier pitch (English draft)

> I'm building an online shop in Battambang. You list your products and set your price. I do the marketing and take the orders. When an order comes in, you get a Telegram message, pack it, and send it with your own courier. No signup fee and no monthly fee. For orders customers pay online, I pay you your price after the customer receives the item, every week, minus my commission. For cash-on-delivery orders, you keep the cash from the courier and pay me my commission each week.

(Khmer version and the one-page agreement to be written next.)
