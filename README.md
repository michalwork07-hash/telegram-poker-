# Telegram Poker Mini App

Texas Hold'em multiplayer poker as a Telegram Mini App, with chip purchases via TON blockchain.

---

## Prerequisites

- Node.js 18+
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- (Optional) A TON wallet address for chip purchases

## Installation

```bash
# 1. Clone and enter the project
git clone <repo-url> && cd telegram-poker

# 2. Install server + bot dependencies
npm install

# 3. Install client dependencies
npm --prefix client install

# 4. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your BOT_TOKEN, WEBAPP_URL, and TON_WALLET_ADDRESS
```

## Running in Development

```bash
# Terminal 1 — game server (http://localhost:3000)
npm run dev:server

# Terminal 2 — Telegram bot (long polling)
npm run dev:bot

# Terminal 3 — React dev server (http://localhost:5173)
npm run dev:client
```

Or run server + bot together:
```bash
npm run dev
```

## Getting a Bot Token

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy the token into `.env` as `BOT_TOKEN=...`

## Setting the WebApp URL in BotFather

1. Message @BotFather → `/mybots` → select your bot → **Bot Settings** → **Menu Button** → **Configure menu button**
2. Enter your `WEBAPP_URL` (must be HTTPS in production)

For local dev, use a tunnel:
```bash
npx localtunnel --port 5173
# or
npx ngrok http 5173
```
Set the tunnel URL as `WEBAPP_URL` in `.env`.

## Building for Production

```bash
npm run build          # builds client to client/dist/
npm start              # serves API + static files on PORT=3000
```

## TON Payment Integration

1. Set `TON_WALLET_ADDRESS` in `.env` to your receiving wallet
2. The client uses **TON Connect** to send transactions directly from the user's wallet
3. After payment, configure your TON API provider (e.g., [TON API](https://tonapi.io)) to call:
   ```
   POST /api/ton/webhook
   { tx_hash, from_address, amount_nano, telegram_id }
   ```
4. Set `TON_WEBHOOK_SECRET` and pass `x-ton-signature` header for verification

Chip packages:
| Chips | Price |
|-------|-------|
| 500   | 0.5 TON |
| 2000  | 1.5 TON |
| 5000  | 3.0 TON |

## Project Structure

```
telegram-poker/
├── server/              Express + Socket.io game server
│   ├── index.js         Entry point
│   ├── db.js            SQLite (users, chips, sessions)
│   ├── auth.js          Telegram WebApp HMAC auth
│   ├── gameService.js   Game orchestration (wraps engine)
│   └── routes/          REST API endpoints
├── client/              React + Vite Telegram Mini App
│   └── src/
│       ├── App.jsx
│       ├── screens/     Lobby, Game, Shop
│       └── components/  Header, PokerTable, PlayerSeat, ActionBar
├── bot/
│   └── bot.js           Telegram bot (long polling)
├── game-server/         Original node-poker-stack engine (untouched)
├── .env.example
└── package.json
```

## Deployment Options

### Railway
```bash
# Push to GitHub, connect repo in Railway
# Set env vars in Railway dashboard
# Railway auto-detects Node and runs `npm start`
```

### Render
- New Web Service → connect repo
- Build command: `npm run build`
- Start command: `npm start`
- Set env vars in Render dashboard

### VPS (Ubuntu/Debian)
```bash
npm run build
npm install -g pm2
pm2 start server/index.js --name poker-server
pm2 start bot/bot.js --name poker-bot
pm2 save && pm2 startup
```

Use Nginx as reverse proxy for HTTPS (required for Telegram WebApp).

---

## Original node-poker-stack

## node-poker-stack -- a node.js Texas Holdem game server and web client

node-poker-stack is a [node.js](http://nodejs.org) Texas Holdem game server and web client. Some notable features
are real-time game-play and chat, multiple game rooms, support up to 10 players per room with a combination
of human and bot players.

## Features

### Game Features

* Texas Holdem game engine for up to 10 players per room based on [node-poker](https://github.com/mjhbell/node-poker).
* Configure bots to join at intervals and play against humans or other bots. They will make use of a hand evaluator, and were very useful for debugging game logic.
* Multiple simultaneous game rooms with individual game rules (blinds, buyins, # of players, etc).
* Real-time game and chat interaction between clients via web sockets.
* Robust game records are stored which include each player action and along with game results.
* Rudimentary friend system to check whether friends are online, chat, and join their games.
* A basic web client server is available (node.js + backbone.js + websocket web browser client).

### Built Using Pomelo

* Real-time communication between server and client.
* Distributed architecture to scale painlessly.
* Pluggable architecture to easily add new features.
* SDKs for a variety of clients (javascript, flash, android, iOS, cocos2d-x, C).
* See [Pomelo Framework](http://github.com/NetEase/pomelo) for more information.

### Whats Missing?

* User and table data is persisted to file store rather than database.
* Web browser client could be improved (uses vanilla bootstrap.js).
* Add more client platforms (android, ios, phonegap, etc).

## Instructions

1. git clone https://github.com/vampserv/node-poker-stack.git
2. ./npm-install.sh
3. node game-server/app
4. open another terminal window
5. node web-server/app
6. go to http://localhost:3002 to access web client
7. register a new user and login
8. create a game room, join the game, and wait
9. bots will join the game to play


## License

(The MIT License)

Copyright (c) 2012-2014 Edward Yang

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
