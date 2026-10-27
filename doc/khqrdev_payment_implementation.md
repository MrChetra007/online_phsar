# KHQR.dev Automated Payments — Implementation Guide

A copy-paste guide to add **automated KHQR payments** (Cambodia) to any
Supabase + web app, using the KHQR.dev API and webhooks. Derived from the
working QRserve implementation.

> TL;DR: the server creates a QR via KHQR.dev and stores the `md5` on an
> invoice row. When the customer pays, KHQR.dev POSTs a **signed webhook**;
> an edge function verifies the HMAC, marks the invoice `paid`, and upgrades
> the account. Credentials live in **Supabase Edge Function secrets**.
> The client shows the QR and polls the invoice row until `paid`.

---

## 1. How it flows

```
Browser ──POST /khqr-payment──► Edge Function ──generate_qr──► KHQR.dev
   ▲                               │
   │                               └─ insert invoice(status=pending, khqrdev_md5)
   │
   ├── render QR image  (https://api.khqr.dev/v1/generate_khqr_image/<md5>)
   └── poll invoice.status every ~3s ──► Supabase

Customer pays in bank app ──► KHQR.dev ──signed webhook──► Edge Function /khqr-webhook
                                   verify HMAC → mark invoice paid → upgrade account
```

Two edge functions:

| Function | Auth | Reads | Writes |
|---|---|---|---|
| `khqr-payment` | Supabase JWT (user) | `KHQRDEV_TOKEN` (env) | invoice row |
| `khqr-webhook` | HMAC signature (no JWT) | `KHQRDEV_WEBHOOK_SECRET` (env) | invoice + account |

---

## 2. Prerequisites

1. A **KHQR.dev** store with:
   - **API token** (Bearer, starts with `RBK_`) → dashboard → API tab
   - **Webhook Secret** → dashboard → Webhook tab
2. A Supabase project with the CLI linked (`supabase link`).
3. A public webhook URL: `https://<project-ref>.supabase.co/functions/v1/khqr-webhook`.

---

## 3. Secrets (Supabase Edge Function secrets)

Never put these in the DB, git, or the frontend bundle.

```bash
supabase secrets set KHQRDEV_TOKEN=RBK_xxxxxxxx
supabase secrets set KHQRDEV_WEBHOOK_SECRET=xxxxxxxx
```

Verify:

```bash
supabase secrets list
```

> Edge functions read them with `Deno.env.get(...)`. Changing a secret does
> **not** require a redeploy, but changing the function code does.

---

## 4. Database schema (minimal)

Adapt table/column names to your domain (here: `tenant` = `restaurant`).

```sql
-- Single-row config table. The boolean PK trick enforces exactly one row.
create table if not exists public.platform_settings (
  id boolean not null default true primary key check (id),
  currency text not null default 'USD' check (currency in ('USD','KHR')),
  app_config jsonb not null default '{}'::jsonb, -- editable prices, sandbox flags
  updated_at timestamptz not null default now()
);
insert into public.platform_settings (id) values (true) on conflict do nothing;

-- One invoice/payment row per billing cycle (or per order).
create table if not exists public.subscription_invoices (
  id uuid not null default gen_random_uuid() primary key,
  restaurant_id uuid not null,           -- FK to your account/tenant table
  plan_id text not null,
  period_start date not null,
  period_end date not null,
  base_fee numeric not null default 0,
  total_amount numeric not null,          -- amount charged (server-computed!)
  currency text not null default 'USD',
  khqrdev_md5 text,                       -- md5 returned by KHQR.dev generate_qr
  khqrdev_tran_id text,                   -- KHQR.dev transaction id
  khqrdev_checkout_url text,              -- optional full-page checkout URL
  status text not null default 'pending'
    check (status in ('pending','paid','expired','void')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Fast webhook lookup by md5 (must be unique enough for .single())
create unique index if not exists idx_invoices_khqrdev_md5
  on public.subscription_invoices (khqrdev_md5)
  where khqrdev_md5 is not null;

create index if not exists idx_invoices_restaurant
  on public.subscription_invoices (restaurant_id, created_at desc);
```

RLS (adjust to your roles): the webhook uses the **service role** and bypasses
RLS, so only the browser needs policies. Let account owners read their own
invoices; nobody except super admins writes.

```sql
alter table public.subscription_invoices enable row level security;

create policy "read own invoices" on public.subscription_invoices
  for select using (
    restaurant_id in (select restaurant_id from public.users where id = auth.uid())
  );
```

Store the price source in `app_config` so prices are editable without a redeploy:

```jsonc
{ "starter_price_manual": 15, "pro_price_manual": 25, "sandbox_mode": false, "sandbox_amount": 0.1 }
```

---

## 5. Edge function: create the payment (`khqr-payment`)

`supabase/functions/khqr-payment/index.ts`

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// KHQR.dev rate limit: 1 req/s for generate_qr. Reuse an unexpired invoice's
// khqrdev_md5 instead of creating a fresh QR every page load.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: { user }, error: userError } = await authClient.auth.getUser()
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const { data: caller } = await serviceClient
      .from('users')
      .select('restaurant_id, is_super_admin')
      .eq('id', user.id)
      .single()

    const { restaurant_id, plan_id, period_start, period_end, force_new } = await req.json()
    if (!restaurant_id || !plan_id || !period_start || !period_end) {
      return json({ error: 'Missing required fields' }, 400)
    }
    if (!caller?.is_super_admin && caller?.restaurant_id !== restaurant_id) {
      return json({ error: 'Forbidden' }, 403)
    }

    // ── Credentials from env ──────────────────────────────────────────
    const khqrdevToken = Deno.env.get('KHQRDEV_TOKEN')
    if (!khqrdevToken) return json({ error: 'KHQR.dev token not configured' }, 500)

    // ── Pricing: app_config override first, then plans fallback ───────
    const { data: settings } = await serviceClient
      .from('platform_settings')
      .select('currency, app_config')
      .eq('id', true)
      .single()

    const cfg = settings?.app_config || {}
    const override =
      plan_id === 'pro' ? cfg.pro_price_manual
      : plan_id === 'starter' ? cfg.starter_price_manual
      : null

    let monthlyFee: number
    if (override !== undefined && override !== null && override !== '') {
      monthlyFee = Number(override)
    } else {
      const { data: plan } = await serviceClient
        .from('plans').select('monthly_fee').eq('id', plan_id).single()
      if (!plan) return json({ error: 'Plan not found' }, 400)
      monthlyFee = Number(plan.monthly_fee)
    }

    if (cfg.sandbox_mode === true && cfg.sandbox_amount) {
      monthlyFee = Number(cfg.sandbox_amount)
    }

    const totalAmount = parseFloat(monthlyFee.toFixed(2))

    // ── Reuse an existing unexpired invoice for this account ──────────
    const { data: existing } = await serviceClient
      .from('subscription_invoices')
      .select('*')
      .eq('restaurant_id', restaurant_id)
      .in('status', ['pending'])
      .order('created_at', { ascending: false })
      .limit(1)

    if (existing?.length) {
      const inv = existing[0]
      const elapsedMs = Date.now() - new Date(inv.created_at).getTime()
      const isExpired = elapsedMs >= 9.5 * 60 * 1000           // QR lives 10 min
      const amountMismatch = Math.abs(Number(inv.total_amount) - totalAmount) > 0.001
      const planMismatch = inv.plan_id !== plan_id

      if (force_new || isExpired || amountMismatch || planMismatch) {
        await serviceClient
          .from('subscription_invoices')
          .update({ status: 'expired' })
          .eq('id', inv.id)
      } else if (inv.khqrdev_md5) {
        return json({
          invoice: inv,
          md5: inv.khqrdev_md5,
          checkout_url: inv.khqrdev_checkout_url,
          qr_image_url: `https://api.khqr.dev/v1/generate_khqr_image/${inv.khqrdev_md5}`,
          remaining_seconds: Math.max(10, Math.floor((10 * 60 * 1000 - elapsedMs) / 1000)),
          amount: totalAmount,
          deduped: true,
        }, 200)
      }
    }

    // ── Create QR via KHQR.dev ────────────────────────────────────────
    const qrRes = await fetch('https://api.khqr.dev/v1/generate_qr', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${khqrdevToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: totalAmount }),
      signal: AbortSignal.timeout(8000),
    })

    if (qrRes.status === 429) return json({ error: 'Rate limited. Retry shortly.' }, 429)
    if (!qrRes.ok) {
      const errBody = await qrRes.text().catch(() => 'unknown error')
      return json({ error: `KHQR.dev error: ${errBody}` }, 502)
    }

    const qrJson = await qrRes.json()
    const { md5, tran_id, checkout_url } = (qrJson.data || qrJson) as {
      md5: string; tran_id: string; checkout_url: string
    }
    if (!md5) return json({ error: 'KHQR.dev did not return a valid md5' }, 502)

    const { data: invoice, error: invoiceError } = await serviceClient
      .from('subscription_invoices')
      .insert({
        restaurant_id, plan_id, period_start, period_end,
        base_fee: monthlyFee, total_amount: totalAmount,
        currency: settings?.currency || 'USD',
        khqrdev_md5: md5, khqrdev_tran_id: tran_id,
        khqrdev_checkout_url: checkout_url,
        status: 'pending',
      })
      .select()
      .single()

    if (invoiceError) return json({ error: invoiceError.message }, 500)

    return json({
      invoice, md5, checkout_url,
      qr_image_url: `https://api.khqr.dev/v1/generate_khqr_image/${md5}`,
    }, 200)
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ error: 'Internal server error' }, 500)
  }
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
```

Placeholders to change for your app: the `users` lookup and the
`restaurant_id`/`plan_id` fields.

---

## 6. Edge function: webhook (`khqr-webhook`)

`supabase/functions/khqr-webhook/index.ts`

Security model:
- `X-RBK-Signature` = hex **HMAC-SHA256** of the **raw body** using the Webhook Secret.
- `X-RBK-Delivery` = unix timestamp in **milliseconds** (reject if > 5 min old).

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // 1. Raw body FIRST (before any JSON parse — HMAC is over raw bytes)
  const bodyBytes = new Uint8Array(await req.arrayBuffer())

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // 2. Webhook secret from env (+ pricing config for the amount check)
  const { data: settings } = await serviceClient
    .from('platform_settings').select('app_config').eq('id', true).single()

  const secret = Deno.env.get('KHQRDEV_WEBHOOK_SECRET')
  if (!secret) {
    console.error('Webhook secret not configured')
    // 200 so KHQR.dev does NOT retry a config problem
    return json({ ok: false, reason: 'webhook_secret_not_configured' }, 200)
  }

  // 3. Replay window (X-RBK-Delivery is unix ms)
  const delivery = Number(req.headers.get('x-rbk-delivery'))
  if (!Number.isFinite(delivery) || Math.abs(Date.now() - delivery) > 300_000) {
    return json({ ok: false, reason: 'expired_timestamp' }, 400)
  }

  // 4. HMAC-SHA256, constant-time compare
  const signature = (req.headers.get('x-rbk-signature') ?? '').toLowerCase()
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, bodyBytes)
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0')).join('')

  const a = new TextEncoder().encode(signature)
  const b = new TextEncoder().encode(expected)
  let diff = a.length ^ b.length
  for (let i = 0; i < a.length && i < b.length; i++) diff |= a[i] ^ b[i]
  if (diff !== 0) return json({ ok: false, reason: 'invalid_signature' }, 400)

  // 5. Parse only after signature verified
  let payload: { event: string; data: { md5?: string; tran_id?: string; paid_at?: string; amount?: number } }
  try { payload = JSON.parse(new TextDecoder().decode(bodyBytes)) }
  catch { return json({ ok: false, reason: 'invalid_json' }, 400) }

  const { event, data } = payload
  if (event !== 'payment.success') return json({ ok: true, result: 'ignored' }, 200)

  const { md5 } = data
  if (!md5) return json({ ok: false, reason: 'missing_md5' }, 400)

  // 6. Find the invoice
  const { data: invoice } = await serviceClient
    .from('subscription_invoices')
    .select('id, restaurant_id, plan_id, period_end, status, total_amount')
    .eq('khqrdev_md5', md5)
    .single()

  if (!invoice) return json({ ok: true, result: 'unknown_invoice' }, 200)

  // 7. Amount verification (same price source as khqr-payment)
  const cfg = settings?.app_config || {}
  const override =
    invoice.plan_id === 'pro' ? cfg.pro_price_manual
    : invoice.plan_id === 'starter' ? cfg.starter_price_manual
    : null

  let expectedFee: number
  if (override !== undefined && override !== null && override !== '') {
    expectedFee = Number(override)
  } else {
    const { data: plan } = await serviceClient
      .from('plans').select('monthly_fee').eq('id', invoice.plan_id).single()
    expectedFee = plan?.monthly_fee != null ? Number(plan.monthly_fee) : 25
  }

  const invoiceAmount = Number(invoice.total_amount)
  if (!cfg.sandbox_mode && invoiceAmount < expectedFee) {
    console.error(`Underbilling: invoice ${invoiceAmount} < configured ${expectedFee}`)
    return json({ ok: false, reason: 'amount_mismatch' }, 400)
  }
  if (data.amount !== undefined && Number(data.amount) < invoiceAmount) {
    return json({ ok: false, reason: 'underpaid' }, 400)
  }

  // 8. Idempotency — never downgrade a paid invoice
  if (invoice.status === 'paid') return json({ ok: true, result: 'duplicate' }, 200)

  // 9. Mark paid
  const { error: invErr } = await serviceClient
    .from('subscription_invoices')
    .update({
      status: 'paid',
      paid_at: data.paid_at ? new Date(data.paid_at).toISOString() : new Date().toISOString(),
      khqrdev_tran_id: data.tran_id || invoice.id,
    })
    .eq('id', invoice.id)

  if (invErr) {
    console.error('Failed to update invoice:', invErr)
    return json({ ok: false, reason: 'db_error' }, 500) // 500 → KHQR.dev retries
  }

  // 10. Upgrade the account (+30 days from period_end)
  const newExpiry = new Date(invoice.period_end)
  newExpiry.setDate(newExpiry.getDate() + 30)

  const { error: accErr } = await serviceClient
    .from('restaurants')
    .update({
      plan: invoice.plan_id,
      plan_expires_at: newExpiry.toISOString(),
      grace_period_ends_at: null,
    })
    .eq('id', invoice.restaurant_id)

  if (accErr) {
    console.error('Failed to update account:', accErr)
    return json({ ok: false, reason: 'account_update_failed' }, 500)
  }

  console.log(`Payment confirmed: invoice ${invoice.id}, account ${invoice.restaurant_id}`)
  return json({ ok: true, result: 'paid', invoice_id: invoice.id }, 200)
})

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json' },
  })
}
```

> Return **200** for anything you don't want retried (unknown md5, duplicates,
> non-payment events). Return **400/500** only when a retry could help.

---

## 7. Deploy

```bash
# The webhook must accept requests without a Supabase JWT (HMAC is the auth)
supabase functions deploy khqr-webhook --no-verify-jwt
supabase functions deploy khqr-payment
```

Non-secret env vars (`SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) are injected automatically by Supabase.

---

## 8. Register the webhook in KHQR.dev

In the KHQR.dev dashboard → store → **Webhook**, set the URL to:

```
https://<project-ref>.supabase.co/functions/v1/khqr-webhook
```

Copy the **Webhook Secret** from the same screen into `KHQRDEV_WEBHOOK_SECRET`.

---

## 9. Frontend contract

Create payment:

```ts
const token = (await supabase.auth.getSession()).data.session?.access_token

const res = await fetch(`${SUPABASE_URL}/functions/v1/khqr-payment`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ restaurant_id, plan_id, period_start, period_end, force_new: false }),
})
const data = await res.json()          // { invoice, md5, qr_image_url, amount }
// render: <img :src="data.qr_image_url">  + countdown from data.remaining_seconds
```

Poll for confirmation (RLS lets the owner read their own invoice):

```ts
setInterval(async () => {
  const { data } = await supabase
    .from('subscription_invoices').select('status').eq('id', invoiceId).single()
  if (data?.status === 'paid') { /* show success, refresh account */ }
}, 3000)
```

The QR image endpoint (`/v1/generate_khqr_image/<md5>`) needs no token and no
size parameter — QR size is CSS only.

---

## 10. Testing checklist

1. `supabase secrets list` shows `KHQRDEV_TOKEN` + `KHQRDEV_WEBHOOK_SECRET`.
2. Open the payment UI → a QR appears; an invoice row is created with `status='pending'`, `khqrdev_md5` set.
3. After paying, the invoice flips to `status='paid'` with `paid_at` set, and the account plan/expiry updates.
4. **Prove the webhook is live** with an unsigned probe:

   ```bash
   # valid delivery timestamp, no signature -> expect 400 invalid_signature
   # (a 200 webhook_secret_not_configured means the secret/env is missing)
   curl -i -X POST "https://<ref>.supabase.co/functions/v1/khqr-webhook" \
     -H "Content-Type: application/json" \
     -H "x-rbk-delivery: $(date +%s%3N)" --data "{}"
   ```

5. Simulate a real webhook with a signed body:

   ```bash
   SECRET=your_webhook_secret
   BODY='{"event":"payment.success","data":{"md5":"<invoice md5>","tran_id":"t1"}}'
   TS=$(date +%s%3N)
   SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')
   curl -i -X POST "https://<ref>.supabase.co/functions/v1/khqr-webhook" \
     -H "Content-Type: application/json" \
     -H "x-rbk-delivery: $TS" -H "x-rbk-signature: $SIG" --data "$BODY"
   ```

   Use the `khqrdev_md5` of a `pending` invoice. Expect `{"ok":true,"result":"paid"}`.

---

## 11. Gotchas learned (read this before debugging)

- **`shutdown` / `EarlyDrop` in logs is NOT an error.** It means the function
  finished and the worker was reclaimed. Successful functions end with it.
  Don't chase it — look for the `console.log`/`console.error` lines instead.
- **The webhook fires once.** If your handler returns `200` (even for a
  misconfig or unknown invoice) KHQR.dev will not resend. A payment made while
  the secret was missing stays `pending` forever — you must re-pay with a fresh
  QR, or mark it paid manually.
- **Return the right status codes.** `200` = done, don't retry. `400/500` =
  retry-able (bad DB write, account update failure).
- **HMAC must be over the raw bytes**, computed *before* JSON parsing. Do not
  register a JSON body parser ahead of the webhook route.
- **`X-RBK-Delivery` is milliseconds**, not seconds. A seconds value fails the
  5-minute window instantly (this silently kills valid webhooks).
- **Types:** if the webhook reads `data.amount`, declare `amount?: number` in
  the payload type or `deno check`/lint may complain.
- **Rate limit:** KHQR.dev `generate_qr` is 1 req/s. Reuse an unexpired
  invoice's QR instead of generating on every page load.
- **QR lifetime is ~10 minutes**; treat anything older as expired and make a new one.
- **Compute the amount server-side** from your own price config; never trust a
  client-submitted total.
- **Amount check uses the same source as creation** (here `app_config` first,
  then a `plans` fallback) so creation and verification can't drift.

---

## 12. Security checklist

- [ ] Token + webhook secret in **Supabase secrets only** (never DB/bundle/git).
- [ ] Webhook deployed with `--no-verify-jwt`; authentication is purely the HMAC.
- [ ] Replay window enforced (5 min) via `X-RBK-Delivery`.
- [ ] Constant-time signature compare (length check first).
- [ ] Idempotent apply (skip if already `paid`).
- [ ] Server-side amount verification before marking paid.
- [ ] RLS: owners read their own invoices; writes go through the service role.
- [ ] Rotate token/secret if exposed or staff leave.

---

## 13. Mapping to this repo

| Concern | File |
|---|---|
| Create payment | `supabase/functions/khqr-payment/index.ts` |
| Confirm payment | `supabase/functions/khqr-webhook/index.ts` |
| Price config UI | `src/components/PlatformSettingsCard.vue`, `src/views/super-admin/SuperAdminSettings.vue` |
| Payment modals | `src/components/SubscriptionGateModal.vue`, `src/components/ProPlanPicker.vue`, `src/views/public/TrialWallView.vue` |
| Schema + RLS | `002_khqr_billing.sql`, `004_khqrdev_payment.sql` |
| API reference | `khqr_platform_guide.md` |
