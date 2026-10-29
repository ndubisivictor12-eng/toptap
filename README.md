# TopTap

TopTap is a Telegram Mini App tap-and-earn game. Player balances are stored by Supabase, and each request is authenticated against Telegram's signed Mini App launch data.

## Supabase setup

1. In the Supabase SQL Editor for project `ipygbcnhmdtwnspfymdq`, run `supabase/migrations/202610290001_toptap.sql` once. It creates a separate `toptap_players` table; the legacy `users` table is left alone.
2. Deploy `supabase/functions/toptap/index.ts` as an Edge Function named `toptap`, with JWT verification disabled. The function verifies Telegram's signature itself before it reads or changes player data.
3. In Supabase Function Secrets, add `TELEGRAM_BOT_TOKEN` using the token from BotFather. Enter it directly in Supabase; never put it in this repository or in the web app.
4. Publish the updated `index.html`, `style.css`, and `app.js` to the existing GitHub Pages site, then reopen the bot in Telegram.

Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. The service role key is used only inside the function and must never be placed in front-end files.

## Local preview

Open `index.html` in a browser to view the interface. Earning points requires opening the hosted app through Telegram, because the backend checks Telegram launch data.

## Game rules

- A tap awards one TAP while the player has energy.
- Players start with 1,000 energy; one energy point returns every three seconds, up to the maximum.
- Balance and energy changes are applied atomically in Postgres.
