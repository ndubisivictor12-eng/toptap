# TopTap

TopTap is a Telegram Mini App prototype for a tap-and-earn game.

## Preview

Open `index.html` in a browser and tap the green coin. The current prototype
stores a demo balance in that browser only. It is not a real or secure points
system yet.

## Telegram setup

The page includes Telegram's official Mini App script and calls `ready()` and
`expand()` when opened inside Telegram. It still needs a public HTTPS address
before BotFather can launch it. After hosting, configure the bot's Mini App
entry point to use that address.

Never put a Telegram bot token in these front-end files or publish it in a
repository. Real accounts and points need a backend that verifies Telegram's
signed launch data and records point changes server-side.
