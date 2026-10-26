# Khmer Online Shop

React + TypeScript + Vite + Tailwind v4 + Supabase.
Business rules: [`doc/project_plan_v1.md`](doc/project_plan_v1.md).
Build contract: [`doc/AI_BUILD_GUIDE.md`](doc/AI_BUILD_GUIDE.md).
Database: [`doc/schema/001_schema.sql`](doc/schema/001_schema.sql) (applied copy in `supabase/migrations/`).
Current progress: [`doc/process-to-track-current-app-process.md`](doc/process-to-track-current-app-process.md).

## Requirements

- Node.js 22+ and npm
- Supabase CLI (logged in) for type generation and future migrations

## Setup

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

Fill `.env.local` with the **public** project URL and anon key:

```dotenv
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Never put the service-role key in the frontend or in git. Only `.env.local` is used locally; `.env.local.example` is the committed template.

## Supabase

- Hosted project: `online-store` (`wdbelxrhvkikrncsgshg`, Tokyo).
- `001_schema.sql`, `002_auto_approve_stores.sql`, and `003_store_commission.sql` are applied to the hosted project. The copies in `supabase/migrations/` are the versioned baseline.
- `004_khqr_payments.sql` adds the KHQR payment fields and `set_order_khqr`; apply it before deploying the payment functions.
- Auth: **email confirmation is disabled** (Supabase Dashboard → Auth → Providers → Email → turn off "Confirm email"), so sign-up returns a session immediately.
- New users are always `store_owner`. Promote the first admin once, after that user signs up:

```sql
update profiles
set role = 'super_admin'
where id = (select id from auth.users where email = 'you@example.com');
```

### Auth

- Email + password only (phone OTP is planned later).
- Sign-up creates a `store_owner`; the client never sends a role.
- After login: store owners go to `/store/*`, the super admin to `/admin/*`; other roles are redirected.
- Users cannot change their own `role`: `authenticated` only has column-level update rights on `full_name` and `phone`.
- If sign-up shows the "check your email" notice, the dashboard toggle is still on. Turn it off so sign-up returns a session immediately.

### Stores

- A store owner creates one store at `/store`; new stores go live immediately (owner decision, migration `002`).
- The admin can suspend and reactivate stores at `/admin`; only `active` stores load at `/s/<slug>`.
- The store link (`slug`) is permanent. Name, description, province, and delivery fees stay editable.
- To require approval again, add an `auto_approve_stores` setting or change the `status` default and insert policy in a new migration.

### Categories and products

- Super admins manage categories at `/admin/categories`: add, rename in Khmer/English, reorder, hide, and choose parent/child and `requires_size`.
- Store owners manage products at `/store/products/*`: category, description, draft/active/hidden status, variants (label, price, stock, SKU, active), and photos.
- The database enforces ownership through RLS. Draft and hidden products are excluded from the public catalog.
- Photos go to the public `product-images` bucket at `<store_id>/<product_id>/<uuid>.<ext>`. JPEG, PNG, or WebP only, 5 MB max. The client compresses images before upload.
- The payout preview calls the owner-only `get_store_commission_percent()` function from migration `003`. It returns the current commission to store owners only; anonymous callers are denied.
- The category seed contains `Clothes` (`requires_size = true`), so new stores can create a product immediately.

### Public catalog

- Home `/`: category grid, newest active products as "Featured", and a name search.
- Category `/c/<slug>`: products in the category and all of its child categories.
- Search `/search?q=<term>`: simple name search across active products.
- Product `/p/<id>`: photos, active variants, per-variant price and stock, and store link.
- Store `/s/<slug>`: public store page and its active products.
- Only active products from active stores are returned. Out-of-stock variants are shown but cannot be selected.
- Entering through `/s/<slug>` stores `store_link` in the browser session for the order `source`; all other entries default to `platform`. The rate is unchanged.

### Cart and checkout

- Cart `/cart`: one store only, persisted in `localStorage`, with quantity controls and a clear-cart confirmation. Adding an item from another store asks before replacing the cart.
- Checkout `/checkout`: name, Cambodian phone, address, province, and payment method. Cash on delivery and KHQR are available.
- Delivery is an estimate: the checkout shows both local and other-province fees, because the final fee is chosen by `create_order` from the province setting.
- `create_order` rechecks maintenance, COD availability, store status, stock, and rate limits. Errors such as `SOLD_OUT`, `RATE_LIMITED`, and `MAINTENANCE` are shown in the customer's language.
- A COD order goes to confirmation `/order/<code>`, which shows the order code and a tracking link.
- A KHQR order goes to `/pay/<code>`, which shows the QR code, amount, expiry, and automatic payment checks.
- A successful order uses the session `store_link` attribution when present and clears it afterward.

### KHQR payments

- The platform uses one KHQR.dev merchant account for all stores. Orders are matched by the generated KHQR `md5`, so each QR must carry the correct order amount.
- `generate_khqr` creates or reuses the order QR; the QR expires after at most 10 minutes. `verify_khqr_payment` polls the provider, and the signed `khqr_webhook` is the authoritative payment notification.
- A correct payment marks the order paid. A payment with a different amount marks it `flagged` for manual review. Duplicate webhooks are ignored.
- An unpaid QR can expire and release stock. The payment page and tracking page can reopen it with the same order code and phone, which reserves stock again and creates a fresh QR.
- The payment page checks every 5 seconds through `verify_khqr_payment`; it does not use the rate-limited tracking lookup for polling.
- Configure the Edge Function secrets before deploying:
  - `KHQRDEV_TOKEN` (required)
  - `KHQRDEV_WEBHOOK_SECRET` (required)
  - `KHQRDEV_CURRENCY` (`USD` or `KHR`, default `USD`)
  - `KHQRDEV_KHR_PER_USD` (required when using `KHR`)
  - `KHQRDEV_BASE_URL` (optional, default `https://api.khqr.dev/v1`)
- Deploy with:

```bash
supabase functions deploy generate_khqr --project-ref wdbelxrhvkikrncsgshg
supabase functions deploy verify_khqr_payment --project-ref wdbelxrhvkikrncsgshg
supabase functions deploy khqr_webhook --no-verify-jwt --project-ref wdbelxrhvkikrncsgshg
```

- Set the KHQR.dev webhook to `https://wdbelxrhvkikrncsgshg.supabase.co/functions/v1/khqr_webhook`.
- Never put the KHQR.dev token or webhook secret in the frontend or in git.

### Order tracking

- `/track` looks up an order with its code and the phone number used at checkout; the code is pre-filled from the confirmation link.
- `track_order` requires both values. A wrong phone returns the same neutral not-found message as an unknown code.
- The page shows the status timeline, items, totals, delivery details, courier name, and tracking note.
- Cancel, confirm-received, report-problem, and reopen buttons are driven by the `can_*` flags returned by `track_order`. Successful actions refresh the order.
- `RATE_LIMITED` is shown in the customer's language with a retry message.

Regenerate types after every migration:

```bash
supabase gen types typescript --project-id wdbelxrhvkikrncsgshg > src/lib/database.types.ts
```

## Scripts

| Command             | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Start the Vite dev server           |
| `npm run build`     | Type-check and build for production |
| `npm run typecheck` | Type-check only (`tsc -b`)          |
| `npm run lint`      | Run Oxlint                          |
| `npm run test`      | Run unit tests with Vitest          |
| `npm run format`    | Format with Prettier                |
| `npm run preview`   | Preview the production build        |

## Structure

```
src/
  api/          # only place that talks to Supabase (client.ts + one file per area)
  components/   # shared UI (Button, Input, Money, states, shell)
  features/     # feature screens (added per build step)
  lib/          # money, phone, errors, i18n, database.types.ts
  pages/        # routed screens
supabase/
  functions/    # Edge Functions for KHQR generation, polling, and webhooks
  migrations/   # numbered SQL files; never edit an applied migration
doc/            # plan, build guide, schema
```
