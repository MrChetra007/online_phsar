# KHQR.dev Integration Guide — For Platform Owners (Any Project)

A reusable guide for any app or SaaS that takes **Bakong KHQR** payments through **KHQR.dev**, where **each merchant (tenant) gets paid into their own account**. Works for online shops, bookings, schools, subscriptions, invoices, and so on. Give merchants the companion file: `khqr_merchant_guide.md`.

> **Scope and honesty note.** Based on the KHQR.dev spec supplied by the platform owner (API, checkout and webhook docs). Anything marked **CONFIRM** is not in that spec; verify it with KHQR.dev before promising it to merchants. Dashboard button names may differ from what is written here.

---

## 0. Adapting this guide to your project

Replace the generic words with your own:

| Generic term | Hotel booking example | Online shop example | School example |
|---|---|---|---|
| Platform | the booking app | the shop SaaS | the school system |
| Merchant (tenant) | a hotel | a shop | a school |
| Customer | a guest | a buyer | a parent |
| Order | a booking | an order | a fee invoice |
| Paid amount | deposit or total | total | tuition fee |

If you are **your own only merchant** (a single-business app), you only need one token and one webhook secret, and you can keep them in your normal server secrets instead of a per-merchant store. Everything else applies.

Decide these before building:
1. **What is paid:** full amount, deposit %, or fixed fee?
2. **Currency:** USD or KHR per merchant (a KHQR.dev store has one currency).
3. **When the QR can be created:** immediately at checkout, or only after the merchant approves the order?
4. **Where secrets live:** a vault or secrets manager for multi-merchant; server env for a single merchant.

---

## 1. The model

Every merchant has **its own KHQR.dev store**, linked to **its own Bakong/bank account**. The store provides an **API token** and a **Webhook Secret**. Your platform:

1. creates payment QR codes with the merchant's token,
2. receives a signed webhook when the status changes,
3. marks the order paid.

**Money goes straight to the merchant. The platform never holds funds**, so you need no payouts, ledger or refund logic.

```
Customer ──pays──▶ Merchant's Bakong account
    ▲                      │
    │ KHQR popup           ▼
Platform ◀──signed webhook── KHQR.dev (merchant's store)
    │
    └─ order marked "Paid" → merchant sees it (dashboard / chat alert)
```

**Avoid the "one token, you collect and pay out" design.** The documented API links a token to one store and one account, so a single token would route every merchant's money into your account. You would then hold other people's funds (ledger, payouts, disputes, possible regulation). Use one token per merchant unless KHQR.dev confirms sub-merchant routing (see section 3).

Manual payments (the merchant's own bank details/QR image) can run alongside online KHQR, and are a good phase 1.

---

## 2. What KHQR.dev provides (from the spec)

| Item | Detail |
|---|---|
| Base URL | `https://api.khqr.dev/v1` |
| Auth | `Authorization: Bearer <RBK_TOKEN>` (the store's permanent token) |
| Account resolution | Merchant account, currency (USD/KHR) and store label come from the store's dashboard link. Requests send only the amount. |
| Create payment | `POST /v1/generate_qr` → `qr`, `md5`, `tran_id`, `checkout_url` |
| Minimum amount | 0.01 (USD) / 100 (KHR) |
| Redirect URLs | `return_url`, `success_url`, `cancel_url` optional; their domain **must be verified** in the dashboard (Domains tab) |
| Status check | `POST /v1/check_transaction_by_md5` → paid / scanned (200), unpaid (404), expired (400) |
| QR image | `GET /v1/generate_khqr_image/{md5}` (no token needed) |
| Checkout UI | JS popup `KHQR.pay(md5)` from `https://checkout.khqr.dev/static/js/checkout.min.js`, full-page redirect `checkout_url`, or an iframe. Countdown is 10 minutes. |
| Browser events | `khqrPaymentSuccess`, `khqrPaymentCancel`, `khqrPaymentExpired` (UI only) |
| Webhooks | POST JSON to the store's Webhook URL on status change: `payment.success`, `payment.scanned` (one-time), `payment.expired` |
| Payload shape | `{ "event": "...", "timestamp": <unix s>, "data": { "hash", "tran_id", "md5", "currency", "status", "paid_at", ... } }` (confirm exact fields on a real delivery) |
| Webhook security | `X-RBK-Signature` = hex HMAC-SHA256 of the **raw body** using the store's **Webhook Secret**; `X-RBK-Delivery` = unix **ms** timestamp (reject beyond 5 minutes) |
| Rate limits | `generate_qr`: 1/s (429 and a 3 s lock if exceeded; spamming blocks 60 s). `generate_khqr_image`: 60/min. `check_transaction_by_md5`: 180/min. |
| Lifecycle | unpaid → scanned → paid (or expired). Backend tracks up to 24 h; checkout timer is 10 min. |
| CSP | Allow `connect-src 'self' https://checkout.khqr.dev wss://checkout.khqr.dev;` |

---

## 3. Questions to confirm with KHQR.dev (CONFIRM)

1. **Fees:** per transaction or per store? Who pays?
2. **Store creation:** can you create stores for merchants under your account, or must each merchant register? Must the bank account belong to the store's owner?
3. **One token, many accounts:** can one token route to different merchant accounts (sub-merchants)? Plan assumes **no**.
4. **Domain verification:** is one verified platform domain enough for all merchants' stores?
5. **Webhooks:** retry policy on errors, exact payload fields (`amount`, `currency`), how to rotate a Webhook Secret.
6. **Sandbox/test mode** and how to simulate a payment.
7. **Currency:** can a merchant have a USD store and a KHR store?
8. **Refunds and disputes:** how are they handled?
9. **Reliability:** uptime expectations and an urgent support contact.

---

## 4. One-time platform setup

1. **Verify your domain** in the KHQR.dev dashboard if you will use redirect URLs. The popup works without them.
2. **Backend:** an endpoint that creates payments, and a **webhook endpoint reachable without your normal login/JWT** (the HMAC signature is the authentication; on Supabase deploy with `--no-verify-jwt`).
3. **Secret storage:** a vault or secrets manager for merchants' tokens and webhook secrets.
4. **Frontend:** load the checkout script, add the CSP rule, and handle the browser events as UI hints only.
5. **Merchant settings screen:** token and Webhook Secret fields (write-only), a read-only **Webhook URL** with a copy button, an enable toggle, and the merchant's currency.

---

## 5. Onboarding a merchant (checklist)

- [ ] Merchant chooses online KHQR (optional) and its currency (USD/KHR).
- [ ] Merchant has a KHQR.dev store linked to **its own** account, with matching currency (**CONFIRM** the exact steps).
- [ ] Token and Webhook Secret entered by the merchant in **your** settings screen. Never accept them by chat or email.
- [ ] Merchant's store **Webhook URL** set to a URL unique to that merchant, e.g. `https://api.yourapp.com/webhooks/khqr/<merchant_id>` (the settings screen shows it).
- [ ] **Test payment** with a small amount through a real banking app; the order flips to **Paid** exactly once.
- [ ] Enable online KHQR for that merchant.
- [ ] Merchant has read `khqr_merchant_guide.md` and knows the support contact.

---

## 6. Payment flow

1. Customer places an order (and, if you require it, the merchant approves it).
2. Customer presses **Pay**. Your server loads that merchant's token from the secret store, computes the amount **on the server**, and calls `generate_qr`. Save a `payments` row (`md5`, `tran_id`, `amount`, `currency`, status `unpaid`). Reuse an unexpired payment instead of creating a new one on every page load (1 req/s limit).
3. The page opens `KHQR.pay(md5)`. Browser events only update the UI. **Never fulfil an order from a browser event or redirect.**
4. KHQR.dev POSTs the webhook. Your endpoint verifies it and applies the event idempotently.
5. The order shows **Paid** to the customer and the merchant; optionally notify the merchant (chat, email).

### Safety nets
- A scheduled job re-checks `unpaid`/`scanned` payments older than a few minutes with `check_transaction_by_md5` (stay under 180/min) and applies results through the **same idempotent path**. Stop when expired or older than 24 h.
- The payment currency must equal the merchant store's currency.

---

## 7. Data model (generic reference, Postgres)

Adapt names to your schema. `orders` and `merchants` are your own tables.

```sql
create table merchant_payment_settings (
  merchant_id        uuid primary key references merchants(id) on delete cascade,
  khqr_enabled       boolean not null default false,
  currency           text not null check (currency in ('USD','KHR')),
  token_secret_ref   text,   -- pointer into your secret store; NEVER the token itself
  webhook_secret_ref text,
  manual_instructions text,
  manual_qr_url      text
);

create table payments (
  id          uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references merchants(id) on delete cascade,
  order_id    uuid not null references orders(id) on delete cascade,
  md5         text not null unique check (length(md5) = 32),
  tran_id     text,
  amount      numeric(12,2) not null check (amount > 0),
  currency    text not null check (currency in ('USD','KHR')),
  status      text not null default 'unpaid'
              check (status in ('unpaid','scanned','paid','expired')),
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);

-- idempotency: each (payment, event) is processed at most once
create table payment_events (
  id          bigint generated always as identity primary key,
  payment_id  uuid not null references payments(id) on delete cascade,
  event       text not null,
  delivery_id text,
  received_at timestamptz not null default now(),
  unique (payment_id, event)
);
```

**`applyPaymentEvent(merchantId, event, data, deliveryId)` must (in one transaction):**
1. Map `payment.success` → `paid`, `payment.scanned` → `scanned`, `payment.expired` → `expired`; ignore other events.
2. Lock the payment row where `md5 = data.md5` **and** `merchant_id = merchantId` (a payment must belong to the merchant whose secret verified the request). Unknown → return OK without changes.
3. If the payload includes `amount`/`currency`, compare to the row; on mismatch, log and stop.
4. Insert into `payment_events`; if the unique key already exists → return `duplicate`.
5. Never move a `paid` payment backwards.
6. Update `payments` (status, `tran_id`, `paid_at`) and, on success, mark the order paid (store `payment_method = 'khqr'`).

---

## 8. Reference code (Node.js / Express)

Create a payment (server side):

```js
const res = await fetch("https://api.khqr.dev/v1/generate_qr", {
  method: "POST",
  headers: { Authorization: `Bearer ${merchantToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({ amount }),            // amount decided by YOUR server
  signal: AbortSignal.timeout(8000),            // network timeout
});
if (res.status === 429) throw new Error("rate_limited");   // back off, don't hammer
const { data } = await res.json();             // data.md5, data.tran_id, data.checkout_url
```

Webhook endpoint (one URL per merchant, verified on the **raw** body):

```js
import express from "express";
import crypto from "node:crypto";

const app = express();

app.post(
  "/webhooks/khqr/:merchantId",
  express.raw({ type: "application/json", limit: "16kb" }),
  async (req, res) => {
    const secret = await loadWebhookSecret(req.params.merchantId); // from your secret store
    if (!secret) return res.status(400).send("Invalid signature");

    // 1. replay window (X-RBK-Delivery is unix ms)
    const delivery = Number(req.header("x-rbk-delivery"));
    if (!Number.isFinite(delivery) || Math.abs(Date.now() - delivery) > 300_000)
      return res.status(400).send("Expired timestamp");

    // 2. HMAC over the raw bytes, constant-time compare (check length first)
    const signature = (req.header("x-rbk-signature") ?? "").toLowerCase();
    const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
      return res.status(400).send("Invalid signature");

    // 3. only now parse and apply (idempotent)
    let payload;
    try { payload = JSON.parse(req.body.toString("utf8")); }
    catch { return res.status(400).send("Bad request"); }

    const result = await applyPaymentEvent({
      merchantId: req.params.merchantId,
      event: payload.event,
      data: payload.data ?? {},
      deliveryId: String(delivery),
    });
    res.status(200).json({ ok: true, result }); // 200 for duplicates/unknown too
  }
);
```

Other stacks (Laravel, FastAPI, Go, Spring Boot) follow the same four steps: skew check, raw-body HMAC, constant-time compare, idempotent apply. Do not register a global JSON body parser before this route.

---

## 9. Security rules

- Tokens and webhook secrets: **secret store only**. Never in git, env files shared across tenants, front-end bundles, logs, chat or screenshots.
- Verify the HMAC over the raw bytes **before** parsing JSON; constant-time compare; enforce the 5-minute window.
- One Webhook URL and one secret **per merchant**; a payment must belong to the merchant whose secret verified the request.
- Process each `(payment, event)` once; never downgrade `paid`.
- The server decides amount and currency; never trust the browser.
- Return generic errors; log details without tokens or personal data.
- Rotate a merchant's token/secret when staff leave or exposure is suspected.

---

## 10. Operations

| Situation | What to do |
|---|---|
| "I paid, still pending" | Check `payments` and `payment_events`; call `check_transaction_by_md5`; if paid, apply through the idempotent path. |
| Webhook returns 400 | Wrong merchant in URL, wrong Webhook Secret, clock skew over 5 min, or a proxy/body parser altered the raw body. |
| Webhook never arrives | Webhook URL not set in the merchant's store, endpoint blocked by auth/WAF, or store points to another environment. |
| `429` from `generate_qr` | Too many QR requests; reuse the active payment, add backoff. |
| Wrong amount paid | The merchant handles it with the customer; the platform doesn't move funds. |
| Refund | Outside the platform: the merchant refunds from its own bank app and records a note. |
| Merchant leaves | Disable KHQR, ask them to remove the webhook, delete both secrets, keep payment history. |

Monitor: webhook error rate, payments stuck in `unpaid`/`scanned`, amount-mismatch logs.

---

## 11. Testing checklist

- [ ] Bad signature → 400
- [ ] Stale timestamp (> 5 min) → 400
- [ ] Same `payment.success` delivered twice → order paid once; second returns `duplicate`
- [ ] `payment.scanned` after `payment.success` does not move status backwards
- [ ] Merchant A's secret cannot confirm merchant B's payment
- [ ] Amount/currency mismatch (if in payload) rejected and logged
- [ ] Expired QR shows a clear "try again" state
- [ ] Two quick `generate_qr` calls handled without exposing errors to the customer
- [ ] A real small payment for each new merchant before enabling

---

## 12. Policy and money decisions

- What you charge merchants is separate from KHQR.dev's fees (**CONFIRM** theirs). State on your pricing page whether KHQR.dev fees apply.
- Terms: payments go directly to the merchant; the merchant is responsible for refunds and customer disputes; the platform provides software only.
- I'm not a lawyer. Check Cambodian regulations on payment facilitation with a professional, especially if you ever consider collecting money on merchants' behalf (this design avoids that).
