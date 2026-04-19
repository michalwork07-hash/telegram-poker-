const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'poker.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    telegram_id   TEXT PRIMARY KEY,
    username      TEXT NOT NULL DEFAULT '',
    first_name    TEXT NOT NULL DEFAULT '',
    chips         INTEGER NOT NULL DEFAULT 1000,
    wins          INTEGER NOT NULL DEFAULT 0,
    largest_win   INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id   TEXT NOT NULL,
    type          TEXT NOT NULL,
    amount        INTEGER NOT NULL,
    meta          TEXT,
    created_at    INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS game_sessions (
    id            TEXT PRIMARY KEY,
    table_id      TEXT NOT NULL,
    started_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    ended_at      INTEGER,
    winners       TEXT,
    snapshot      TEXT
  );
`);

const stmts = {
  getUser:     db.prepare('SELECT * FROM users WHERE telegram_id = ?'),
  insertUser:  db.prepare('INSERT OR IGNORE INTO users (telegram_id, username, first_name) VALUES (?, ?, ?)'),
  updateUser:  db.prepare('UPDATE users SET username = ?, first_name = ? WHERE telegram_id = ?'),
  adjustChips: db.prepare('UPDATE users SET chips = chips + ? WHERE telegram_id = ? RETURNING *'),
  setChips:    db.prepare('UPDATE users SET chips = ? WHERE telegram_id = ?'),
  addWin:      db.prepare('UPDATE users SET wins = wins + 1, largest_win = MAX(largest_win, ?) WHERE telegram_id = ?'),
  logTx:       db.prepare('INSERT INTO transactions (telegram_id, type, amount, meta) VALUES (?, ?, ?, ?)'),
  saveSession: db.prepare(`
    INSERT OR REPLACE INTO game_sessions (id, table_id, winners, snapshot, ended_at)
    VALUES (?, ?, ?, ?, unixepoch())
  `),
};

function getOrCreateUser(telegramId, username, firstName) {
  stmts.insertUser.run(telegramId, username || '', firstName || '');
  stmts.updateUser.run(username || '', firstName || '', telegramId);
  const user = stmts.getUser.get(telegramId);
  if (user && user.chips === 1000 && user.wins === 0) {
    // log welcome bonus only for brand-new users
    const count = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE telegram_id = ?').get(telegramId);
    if (count.c === 0) {
      stmts.logTx.run(telegramId, 'welcome_bonus', 1000, null);
    }
  }
  return user;
}

function getUser(telegramId) {
  return stmts.getUser.get(telegramId);
}

function adjustChips(telegramId, delta, type, meta) {
  const rows = stmts.adjustChips.all(delta, telegramId);
  const user = rows[0];
  if (user) stmts.logTx.run(telegramId, type, delta, meta ? JSON.stringify(meta) : null);
  return user;
}

function setChips(telegramId, chips) {
  stmts.setChips.run(chips, telegramId);
}

function recordWin(telegramId, amount) {
  stmts.addWin.run(amount, telegramId);
}

function saveGameSession(id, tableId, winners, snapshot) {
  stmts.saveSession.run(id, tableId, JSON.stringify(winners), JSON.stringify(snapshot));
}

module.exports = { db, getOrCreateUser, getUser, adjustChips, setChips, recordWin, saveGameSession };
