require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const TelegramBot = require('node-telegram-bot-api');
const fetch = require('node-fetch');

const TOKEN    = process.env.BOT_TOKEN;
const APP_URL  = process.env.WEBAPP_URL || 'https://your-domain.com';
const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';

if (!TOKEN) { console.error('BOT_TOKEN not set'); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });

// Set menu button to open Mini App
bot.setMyCommands([
  { command: 'start',   description: 'Start playing poker' },
  { command: 'balance', description: 'Check your chip balance' },
  { command: 'help',    description: 'How to play' },
]);

const GAME_RULES = `
♠ *Texas Hold'em Rules*

1. Each player gets 2 private cards
2. 5 community cards are dealt (flop, turn, river)
3. Make the best 5-card hand
4. Bet, raise, call, or fold each round

*Hand rankings (best → worst):*
Royal Flush → Straight Flush → Four of a Kind → Full House → Flush → Straight → Three of a Kind → Two Pair → Pair → High Card

*Actions:*
• *Check* — pass (when no bet)
• *Call* — match current bet
• *Raise/Bet* — increase the bet
• *Fold* — give up your hand
• *All In* — bet all your chips
`;

bot.onText(/\/start/, async msg => {
  const { id: chatId, username, first_name } = msg.from;

  // Register user
  try {
    await fetch(`${API_BASE}/api/user/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: chatId, username, first_name }),
    });
  } catch (e) { /* server might not be running */ }

  bot.sendMessage(chatId,
    `👋 Welcome, ${first_name}!\n\nYou start with *1000 free chips*.\n\nClick below to play Texas Hold'em:`,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: '🃏 Play Poker', web_app: { url: APP_URL } },
        ]],
      },
    }
  );
});

bot.onText(/\/balance/, async msg => {
  const { id: chatId } = msg.from;
  try {
    const res  = await fetch(`${API_BASE}/api/user/${chatId}`);
    const user = await res.json();
    if (user.error) throw new Error(user.error);
    bot.sendMessage(chatId,
      `🪙 Your balance: *${user.chips.toLocaleString()} chips*\n🏆 Wins: ${user.wins}`,
      { parse_mode: 'Markdown' }
    );
  } catch {
    bot.sendMessage(chatId, "Couldn't fetch balance. Try again later.");
  }
});

bot.onText(/\/help/, msg => {
  bot.sendMessage(msg.from.id, GAME_RULES, { parse_mode: 'Markdown' });
});

// Set the menu button for all chats
bot.setChatMenuButton({ menu_button: { type: 'web_app', text: '🃏 Play', web_app: { url: APP_URL } } })
   .catch(() => {}); // not all bot APIs support this

console.log('Bot is running...');
