# Khmer Online Shop

React + TypeScript + Vite + Tailwind v4 + Supabase.
Business rules: [`doc/project_plan_v1.md`](doc/project_plan_v1.md).
Build contract: [`doc/AI_BUILD_GUIDE.md`](doc/AI_BUILD_GUIDE.md).
Database: [`doc/schema/001_schema.sql`](doc/schema/001_schema.sql) (applied copy in `supabase/migrations/`).

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

### Cart and COD checkout

- Cart `/cart`: one store only, persisted in `localStorage`, with quantity controls and a clear-cart confirmation. Adding an item from another store asks before replacing the cart.
- Checkout `/checkout`: name, Cambodian phone, address, province, and cash on delivery. KHQR is shown as coming soon until the payment step.
- Delivery is an estimate: the checkout shows both local and other-province fees, because the final fee is chosen by `create_order` from the province setting.
- `create_order` rechecks maintenance, COD availability, store status, stock, and rate limits. Errors such as `SOLD_OUT`, `RATE_LIMITED`, and `MAINTENANCE` are shown in the customer's language.
- Confirmation `/order/<code>` shows the order code and a tracking link. The tracking page is a temporary placeholder until the tracking step.
- A successful order uses the session `store_link` attribution when present and clears it afterward.

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
  migrations/   # numbered SQL files; never edit an applied migration
doc/            # plan, build guide, schema
```
