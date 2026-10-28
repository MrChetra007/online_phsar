# Telegram Bot Integration Guide — HotelPage (reusable)

How this project wires **one platform Telegram bot** to **many hotels**, so an
owner can connect their hotel and get booking notifications with Confirm /
Decline buttons. Follow it top-to-bottom on a fresh project and you skip the
`401` trap that cost us a debugging session (see §8).

> **Scope and honesty note.** Written against this repo's actual code
> (`supabase/functions/telegram-webhook`, `_shared/telegram.ts`,
> `create-online-booking`, `public-config`, `schema_v1.sql`). Button/field names
> in the Telegram UI or Supabase dashboard may differ. Anything marked
> **CONFIRM** is unverified.

---

## 0. How it fits together

One bot (`@stay_direct_bot`) serves every hotel. Each hotel stores its own chat
id; the bot never needs a per-hotel token.

| Piece | What it does |
|---|---|
| `telegram-webhook` Edge Function | Receives bot updates: `/start <token>` connects a hotel; `bk:c:<id>` / `bk:d:<id>` confirm/decline a booking. |
| `create-online-booking` Edge Function | After a guest books, calls `sendMessage` to notify the owner (best-effort). |
| `public-config` Edge Function | Serves the bot **username** to the browser (so the deep link is not baked into the build). |
| `_shared/telegram.ts` | Bot API helpers + bilingual message builders. Server-only. |
| `hotels.telegram_chat_id` | Set when an owner connects; `NULL` = not connected. |
| `hotels.telegram_link_token` | One-time token from `generate_telegram_link_token()`, consumed by `/start`. |
| `hotels.telegram_error_at` | Set when a send fails (owner blocked the bot) → dashboard warning. |
| `bookings.tg_message_id` | The notification message id, so Confirm/Decline can `editMessageText`. |

Secrets flow: the bot token and webhook secret live **only** as Edge Function
secrets. The service-role key is auto-injected and never leaves the function.

---

## 1. Create the bot (@BotFather)

1. Telegram → **@BotFather** → `/newbot` → pick a name and a username ending in
   `bot` (e.g. `stay_direct_bot`).
2. Save the **token** (`123456789:AA...`) and the **username** (no `@`).
3. Optional: `/setcommands`, `/setdescription`, `/setuserpic`.

---

## 2. Set the secrets

```sh
supabase secrets set TELEGRAM_BOT_TOKEN=123456789:AA...          # from @BotFather
supabase secrets set TELEGRAM_WEBHOOK_SECRET=<random long string> # shared with setWebhook
supabase secrets set TELEGRAM_BOT_USERNAME=stay_direct_bot       # NO leading @
```

Verify names (values are write-only — Supabase never returns them):

```sh
supabase secrets list --project-ref <project-ref>
# expect: TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, TELEGRAM_BOT_USERNAME
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected
> automatically — do **not** set them yourself.

---

## 3. Deploy the functions

`telegram-webhook` and `public-config` must be reachable without a Supabase JWT
(Telegram calls server-to-server; guests are anonymous). This repo pins that in
`supabase/config.toml`:

```toml
[functions.telegram-webhook]
verify_jwt = false

[functions.public-config]
verify_jwt = false
```

Deploy (the `--no-verify-jwt` flag is belt-and-braces; the config above is the
source of truth):

```sh
supabase functions deploy telegram-webhook --no-verify-jwt --project-ref <project-ref>
supabase functions deploy public-config   --no-verify-jwt --project-ref <project-ref>
```

---

## 4. Register the webhook — **the step that bit us**

Point Telegram at the deployed function **and give it the same secret**:

```sh
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://<project-ref>.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
# -> {"ok":true,"result":true,"description":"Webhook was set"}
```

**`secret_token` MUST equal `TELEGRAM_WEBHOOK_SECRET` (byte-for-byte).** Telegram
sends it back on every call in the `X-Telegram-Bot-Api-Secret-Token` header, and
the function rejects a mismatch with `401 forbidden`. If you ever run
`setWebhook` *without* `secret_token` (or with a different string), every update
is silently rejected — exactly the bug in §8.

The secret is **optional** in Telegram's API and in our function (fail-open if
unset), but for a guessable function URL you should always set it.

---

## 5. Verify — fail fast (do this before touching the app)

```sh
# 1. Bot identity — username must match TELEGRAM_BOT_USERNAME.
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"

# 2. Webhook health — want pending_update_count 0 and NO last_error_message.
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"

# 3. Our secret check: no header -> 401, correct header -> 200 "ok".
BODY='{"update_id":1,"message":{"chat":{"id":1,"type":"private"},"text":"/start x"}}'
curl -s -o /dev/null -w "%{http_code}\n" -X POST -H "Content-Type: application/json" \
  -d "$BODY" "https://<project-ref>.supabase.co/functions/v1/telegram-webhook"          # 401
curl -s -w "\n%{http_code}\n" -X POST -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: $TELEGRAM_WEBHOOK_SECRET" \
  -d "$BODY" "https://<project-ref>.supabase.co/functions/v1/telegram-webhook"          # ok 200
```

Also open the function URL in a browser (GET):

| Response | Meaning |
|---|---|
| `ok` | reachable, JWT off — good |
| `forbidden` (401, plain text) | reached our code; the secret check failed (header mismatch) |
| `{"code":401,...UNAUTHORIZED...}` (401, JSON) | the **Supabase JWT gate** is on → redeploy with `--no-verify-jwt` |

Tip: a response carrying header `x-deno-execution-id` means **our function ran**,
so the JWT gate is off — the 401 came from our own code.

---

## 6. Connect a hotel (app flow)

1. Owner: **Dashboard → Hotel → Telegram → Connect**.
2. The app calls `generate_telegram_link_token()` (SECURITY DEFINER, owner-scoped)
   → a one-time token saved in `hotels.telegram_link_token`.
3. The app builds `https://t.me/<bot>?start=<token>` using the username served by
   `public-config`, and opens it.
4. Owner presses **Start**; Telegram sends `/start <token>` to the webhook.
5. `handleStart` looks up the hotel by token, sets `telegram_chat_id`, clears the
   token, and replies “✅ Connected”. The dashboard polls `my_hotel` (~3 s) and
   flips to connected.
6. Disconnect: `disconnect_telegram()` clears `telegram_chat_id`.

---

## 7. Notifications + Confirm / Decline

- `create-online-booking` → `notifyOwner()` sends `buildNewBookingMessage(...)`
  with `bookingKeyboard(id)`, then stores `bookings.tg_message_id`. A Telegram
  failure **never** fails the guest's booking; it stamps `telegram_error_at` for
  the dashboard warning.
- Buttons carry `callback_data` `bk:c:<bookingId>` (confirm) and
  `bk:d:<bookingId>` (decline). The webhook verifies the callback came from the
  hotel's own chat, flips the booking to `confirmed`/`declined`, and
  `editMessageText`es the result. A conflict (`23P01`) shows “dates already
  confirmed”.
- Admin suspension uses `buildHotelSuspendedMessage(...)` via
  `admin-notify-suspension`.

---

## 8. The bug we hit (post-mortem)

**Symptom.** Owner sent `/start <token>`; nothing connected.
`getWebhookInfo` showed `pending_update_count > 0` and
`last_error_message: "Wrong response from the webhook: 401 Unauthorized"`.

**Wrong first guess.** We assumed the function was deployed with JWT
verification ON. It was **not** — a plain GET reaches the Deno runtime
(`x-deno-execution-id` present) and returns our own `forbidden`.

**Real root cause.** The webhook had been registered with a `secret_token` that
did **not** match `TELEGRAM_WEBHOOK_SECRET`, so `telegram-webhook` rejected every
Telegram update with `401 forbidden`.

**Fix.**

```sh
# 1. Set a fresh secret server-side.
supabase secrets set TELEGRAM_WEBHOOK_SECRET=<new random 48-char string> --project-ref <ref>
# 2. Re-register the SAME value with Telegram.
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://<ref>.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=<new random 48-char string>"
# 3. Confirm the error cleared + queue drained.
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

**Rule of thumb.** Whenever Telegram deliveries 401, reset **both** sides to the
same secret (step 1 + 2). Never trust that an earlier `setWebhook` used the
current secret.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `getWebhookInfo.last_error_message` = `...401 Unauthorized` | `secret_token` ≠ `TELEGRAM_WEBHOOK_SECRET` | Re-run §8 (reset both). |
| Browser GET returns `UNAUTHORIZED_...` JSON | Supabase JWT gate on | Deploy with `--no-verify-jwt` (§3). |
| No `last_error_message` but `/start` does nothing | webhook URL wrong/empty | `setWebhook` with the correct URL (§4). |
| Bot username in deep link is wrong/`t.me/undefined` | `TELEGRAM_BOT_USERNAME` unset | Set it; check `public-config` returns it. |
| `{"ok":false,"description":"missing_bot_token"}` in logs | `TELEGRAM_BOT_TOKEN` unset/invalid | `supabase secrets set`, confirm with `getMe`. |
| Owner never gets booking messages | `telegram_chat_id` NULL (not connected) or owner blocked the bot | Reconnect; check `telegram_error_at`. |
| `/start <token>` says “invalid or already used” | token consumed/expired or wrong hotel | Regenerate from the dashboard. |
| Confirm/Decline does nothing | callback not from the hotel's chat, or booking not pending | Check `telegram_chat_id` matches; booking status. |

Logs:

```sh
supabase functions logs telegram-webhook --project-ref <ref>
```

---

## 10. Security

- **Never** commit the bot token or webhook secret, and never put them in
  `VITE_*` (they would ship to the browser).
- If a token is ever exposed (chat, screenshot, logs), rotate it:
  @BotFather → `/revoke` → `supabase secrets set TELEGRAM_BOT_TOKEN=…`, then
  re-run `setWebhook` with the **same** `secret_token` (§4).
- Keep `TELEGRAM_WEBHOOK_SECRET` set (fail-open otherwise).
- Escape every guest-supplied field with `esc()` before HTML messages
  (`_shared/telegram.ts`) to avoid HTML-parse breakage/injection.

---

## 11. Files map

| Path | Role |
|---|---|
| `supabase/config.toml` | `verify_jwt = false` for `telegram-webhook`, `public-config`. |
| `supabase/functions/telegram-webhook/index.ts` | Bot updates handler (`/start`, callbacks). |
| `supabase/functions/_shared/telegram.ts` | Bot API wrappers + message builders. |
| `supabase/functions/create-online-booking/index.ts` | Sends the new-booking notification. |
| `supabase/functions/public-config/index.ts` | Serves the bot username to the browser. |
| `schema_v1.sql` | `generate_telegram_link_token()`, `disconnect_telegram()`, `hotels.telegram_*`, `bookings.tg_message_id`. |
| `src/routes/owner/HotelSettings.tsx` | The Connect / Disconnect card + connect polling. |
| `src/owner/hooks.ts` | `useTelegramBotUsername`, `useGenerateTelegramToken`, `useDisconnectTelegram`. |
| `KNOWN_ISSUES.md` §3 | The post-mortem log for the 401 bug. |

### One-liner setup (fresh project)

```sh
supabase link --project-ref <ref>
supabase secrets set TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… TELEGRAM_BOT_USERNAME=…
supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy public-config   --no-verify-jwt
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://<ref>.supabase.co/functions/v1/telegram-webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET"
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"   # pending 0, no error
```
