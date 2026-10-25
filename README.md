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
- `001_schema.sql` is already applied to the hosted project. The copy in `supabase/migrations/` is the versioned baseline.
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
