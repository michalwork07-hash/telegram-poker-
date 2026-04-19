require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const { getOrCreateUser, getUser, adjustChips } = require('./db');
const { validateTelegramWebAppData } = require('./auth');
const GameService = require('./gameService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
const gameService = new GameService(io);
app.set('gameService', gameService);

app.use('/api/user',  require('./routes/users'));
app.use('/api/chips', require('./routes/chips'));
app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/ton',   require('./routes/ton'));

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '..', 'client', 'dist');
  app.use(express.static(clientDist));
  app.get('*', (_, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.use((socket, next) => {
  const { initData, telegramId, username, firstName } = socket.handshake.auth;
  const botToken = process.env.BOT_TOKEN;

  if (botToken && initData) {
    try {
      const tgUser = validateTelegramWebAppData(initData, botToken);
      socket.data.uid = String(tgUser.id);
      socket.data.username = tgUser.username || tgUser.first_name;
      const user = getOrCreateUser(socket.data.uid, tgUser.username, tgUser.first_name);
      socket.data.chips = user.chips;
    } catch (err) {
      return next(new Error('Auth failed: ' + err.message));
    }
  } else if (telegramId) {
    // Dev mode: pass telegramId directly
    socket.data.uid = String(telegramId);
    socket.data.username = username || 'Player';
    const user = getOrCreateUser(socket.data.uid, username || '', firstName || '');
    socket.data.chips = user.chips;
  } else {
    return next(new Error('No auth credentials'));
  }
  next();
});

io.on('connection', socket => {
  const uid = socket.data.uid;
  console.log(`[socket] connected uid=${uid}`);

  socket.on('getTables', (_, cb) => {
    if (typeof cb === 'function') cb({ code: 200, tables: gameService.getTables() });
  });

  socket.on('createTable', (msg, cb) => {
    const tid = gameService.createTable(uid, msg);
    if (typeof cb === 'function') cb({ code: 200, tid });
    // Auto-join the creator
    gameService.joinTable(tid, uid, socket);
  });

  socket.on('joinTable', (msg, cb) => {
    const err = gameService.joinTable(msg.tid, uid, socket);
    if (typeof cb === 'function') cb(err ? { code: 500, error: err } : { code: 200 });
  });

  socket.on('leaveTable', (msg, cb) => {
    if (msg?.tid) gameService.leaveTable(msg.tid, uid, socket);
    if (typeof cb === 'function') cb({ code: 200 });
  });

  socket.on('joinGame', (msg, cb) => {
    const err = gameService.joinGame(msg.tid, uid, msg.buyIn);
    if (typeof cb === 'function') cb(err ? { code: 500, error: err } : { code: 200 });
  });

  socket.on('startGame', (msg, cb) => {
    const err = gameService.startGame(msg.tid, uid);
    if (typeof cb === 'function') cb(err ? { code: 500, error: err } : { code: 200 });
  });

  socket.on('execute', (msg, cb) => {
    const err = gameService.performAction(msg.tid, uid, msg);
    if (typeof cb === 'function') cb(err ? { code: 500, error: err } : { code: 200 });
  });

  socket.on('getBalance', (_, cb) => {
    const user = getUser(uid);
    if (typeof cb === 'function') cb({ chips: user?.chips ?? 0 });
  });

  socket.on('disconnect', () => {
    console.log(`[socket] disconnected uid=${uid}`);
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
