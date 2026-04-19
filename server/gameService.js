/**
 * GameService — wraps the existing Table/Game engine with Socket.io broadcasts.
 * Replaces Pomelo channelService with io.to(tid) room messaging.
 */
const { v1: uuid } = require('uuid');
const Table = require('../game-server/app/game/table');
const { getUser, setChips, adjustChips, recordWin, saveGameSession } = require('./db');

// Monkey-patch pomelo-logger out of the game modules
require.cache && (() => {})(); // no-op; logger is patched below
const pomeloLoggerStub = { getLogger: () => ({ debug: () => {}, error: console.error, info: () => {} }) };
require.extensions['.js']; // ensure loaded
// Override pomelo-logger before Table loads it
try { require.cache[require.resolve('pomelo-logger')] = { id: 'pomelo-logger', filename: '', loaded: true, exports: pomeloLoggerStub }; } catch (_) {}

const GAME_SETTINGS = {
  gameMode: {
    normal: { timeout: 30 },
    fast:   { timeout: 15 },
  },
};

// Patch gameSettings used by table.js
try {
  const settingsPath = require.resolve('../game-server/config/gameSettings.json');
  require.cache[settingsPath] = { id: settingsPath, filename: settingsPath, loaded: true, exports: GAME_SETTINGS };
} catch (_) {}

class GameService {
  constructor(io) {
    this.io = io;
    this.tables = {}; // tid -> tableRecord
  }

  getTables() {
    const out = [];
    for (const tid in this.tables) {
      const rec = this.tables[tid];
      const t = rec.table;
      out.push({
        id:         tid,
        smallBlind: t.smallBlind,
        bigBlind:   t.bigBlind,
        minBuyIn:   t.minBuyIn,
        maxBuyIn:   t.maxBuyIn,
        minPlayers: t.minPlayers,
        maxPlayers: t.maxPlayers,
        gameMode:   t.gameMode,
        state:      rec.state,
        players:    t.players.length + t.playersToAdd.length,
        members:    t.members.length,
      });
    }
    return out;
  }

  createTable(uid, opts) {
    const { smallBlind = 5, bigBlind = 10, minBuyIn = 100, maxBuyIn = 5000, minPlayers = 2, maxPlayers = 9, gameMode = 'normal' } = opts || {};
    const tid = uuid();
    const rec = {
      id:           tid,
      creator:      uid,
      state:        'JOIN',
      tableService: this,
    };
    rec.table = new Table(
      Math.round(+smallBlind), Math.round(+bigBlind),
      Math.round(+minPlayers), Math.round(+maxPlayers),
      Math.round(+minBuyIn),   Math.round(+maxBuyIn),
      (gameMode === 'fast' ? 'fast' : 'normal'),
      rec,
    );
    rec.table.members = [];
    this.tables[tid] = rec;
    return tid;
  }

  joinTable(tid, uid, socket) {
    const rec = this.tables[tid];
    if (!rec) return 'table-not-found';
    const user = getUser(uid);
    if (!user) return 'user-not-found';

    socket.join(tid);
    if (!rec.table.members.find(m => m.id === uid)) {
      rec.table.members.push({ id: uid, username: user.username, first_name: user.first_name, chips: user.chips });
    }
    socket.emit('onTableEvent', this._getTableJSON(tid, uid));
    this.io.to(tid).emit('onUpdateUsers', rec.table.members);
    return null;
  }

  leaveTable(tid, uid, socket) {
    const rec = this.tables[tid];
    if (!rec) return;
    socket.leave(tid);
    rec.table.members = rec.table.members.filter(m => m.id !== uid);
    this._savePlayerChips(tid, uid);
    rec.table.removePlayer(uid);
    this.io.to(tid).emit('onUpdateUsers', rec.table.members);
    this._handleGameState(tid);
  }

  joinGame(tid, uid, buyIn) {
    const rec = this.tables[tid];
    if (!rec) return 'table-not-found';
    const t = rec.table;
    buyIn = Math.round(+buyIn);
    if (isNaN(buyIn) || buyIn < t.minBuyIn || buyIn > t.maxBuyIn) return 'invalid-buyin';
    if (t.players.find(p => p.id === uid) || t.playersToAdd.find(p => p.id === uid)) return 'already-joined';

    const user = getUser(uid);
    if (!user) return 'user-not-found';
    if (user.chips < buyIn) return 'not-enough-chips';

    adjustChips(uid, -buyIn, 'buyin', { tid });
    t.AddPlayer(user.username || user.first_name, buyIn, uid);

    const mIdx = t.members.findIndex(m => m.id === uid);
    if (mIdx !== -1) t.members[mIdx].chips = user.chips - buyIn;

    this.io.to(tid).emit('onTableJoin', this._getPlayerJSON(tid, uid, 'playersToAdd') || this._getPlayerJSON(tid, uid));
    this.io.to(tid).emit('onUpdateUsers', t.members);
    this._emitToMember(tid, uid, 'onUpdateMyself', { chips: user.chips - buyIn });
    return null;
  }

  startGame(tid, uid) {
    const rec = this.tables[tid];
    if (!rec) return 'table-not-found';
    if (rec.state !== 'JOIN') return 'table-not-ready';
    if (rec.table.active) return 'table-still-active';
    if (rec.creator !== uid) return 'not-creator';
    if (rec.table.playersToAdd.length < rec.table.minPlayers) return 'not-enough-players';

    rec.table.StartGame();
    this.io.to(tid).emit('onUpdateUsers', rec.table.members);
    this._broadcastGameState(tid);
    return null;
  }

  performAction(tid, uid, action) {
    const rec = this.tables[tid];
    if (!rec) return 'table-not-found';
    if (rec.state !== 'IN_PROGRESS') return 'game-not-ready';

    const playerIdx = this._getPlayerIndex(tid, uid);
    if (playerIdx !== rec.table.currentPlayer) return 'not-your-turn';

    const player = rec.table.players[playerIdx];
    if (!player || player.folded) return 'already-folded';

    rec.table.stopTimer();
    const amt = parseInt(action.amt);
    switch (action.action) {
      case 'call':   player.Call(); break;
      case 'check':  player.Check(); break;
      case 'fold':   player.Fold(); break;
      case 'allin':  player.AllIn(); break;
      case 'bet':
        if (isNaN(amt)) return 'invalid-bet-amt';
        player.Bet(amt); break;
      default: return 'invalid-action';
    }
    this._handleGameState(tid);
    return null;
  }

  _handleGameState(tid) {
    const rec = this.tables[tid];
    if (!rec) return;
    if (rec.table?.game?.roundName === 'GameEnd' && rec.state === 'IN_PROGRESS' && rec.table.active) {
      this._endGame(tid);
    } else {
      this.io.to(tid).emit('onUpdateUsers', rec.table.members);
      this._broadcastGameState(tid);
    }
  }

  _endGame(tid) {
    const rec = this.tables[tid];
    if (!rec) return;
    rec.table.active = false;
    rec.table.stopTimer();

    const winners = rec.table.gameWinners || [];
    winners.forEach(w => {
      adjustChips(w.id, w.chips, 'win', { tid });
      recordWin(w.id, w.amount || 0);
    });

    saveGameSession(rec.table.game.id, tid, winners, this._getTableJSON(tid));
    this.io.to(tid).emit('onUpdateUsers', rec.table.members);
    this._broadcastGameState(tid);

    setTimeout(() => {
      if (this.tables[tid]) {
        rec.table.initNewGame();
        this._broadcastGameState(tid);
      }
    }, 5000);
  }

  _savePlayerChips(tid, uid) {
    const rec = this.tables[tid];
    if (!rec) return;
    const player = rec.table.players.find(p => p.id === uid)
      || rec.table.playersToAdd.find(p => p.id === uid)
      || rec.table.previousPlayers.find(p => p.id === uid);
    if (player && player.chips > 0) {
      adjustChips(uid, player.chips, 'cashout', { tid });
    }
  }

  _broadcastGameState(tid) {
    const rec = this.tables[tid];
    if (!rec) return;
    rec.table.members.forEach(member => {
      const state = this._getTableJSON(tid, member.id);
      this._emitToMember(tid, member.id, 'onTableEvent', state);
    });
    if (rec.state === 'IN_PROGRESS' && rec.table.active) {
      rec.table.startTimer();
    }
  }

  _emitToMember(tid, uid, event, data) {
    this.io.to(tid).fetchSockets().then(sockets => {
      const s = sockets.find(s => s.data.uid === uid);
      if (s) s.emit(event, data);
    }).catch(() => {});
  }

  _getTableJSON(tid, uid) {
    const rec = this.tables[tid];
    if (!rec) return null;
    const t = rec.table;
    return {
      state:           rec.state,
      id:              t.game?.id,
      tid,
      creator:         rec.creator,
      smallBlind:      t.smallBlind,
      bigBlind:        t.bigBlind,
      minPlayers:      t.minPlayers,
      maxPlayers:      t.maxPlayers,
      minBuyIn:        t.minBuyIn,
      maxBuyIn:        t.maxBuyIn,
      gameMode:        t.gameMode,
      players:         this._getPlayersJSON(tid, 'players', uid),
      playersToRemove: t.playersToRemove,
      playersToAdd:    this._getPlayersJSON(tid, 'playersToAdd', uid),
      gameWinners:     this._getPlayersJSON(tid, 'gameWinners', uid),
      actions:         t.actions,
      game:            this._stripProps(t.game, ['deck', 'id']),
      board:           t.game?.board || [],
      currentPlayer:   t.currentPlayer,
      dealer:          t.dealer,
    };
  }

  _getPlayerJSON(tid, uid, type, requestUid) {
    const rec = this.tables[tid];
    if (!rec) return null;
    const arr = type ? rec.table[type] : rec.table.players;
    const player = arr?.find(p => p.id === uid);
    if (!player) return null;
    return {
      playerName: player.playerName,
      id:         player.id,
      chips:      player.chips,
      folded:     player.folded,
      allIn:      player.allIn,
      talked:     player.talked,
      amount:     player.amount,
      cards:      (!requestUid || player.id === requestUid) ? player.cards : undefined,
    };
  }

  _getPlayersJSON(tid, type, requestUid) {
    const rec = this.tables[tid];
    if (!rec) return [];
    const arr = rec.table[type];
    if (!arr) return [];
    return arr.map(p => this._getPlayerJSON(tid, p.id, type, requestUid)).filter(Boolean);
  }

  _getPlayerIndex(tid, uid, type) {
    const rec = this.tables[tid];
    if (!rec) return -1;
    const arr = type ? rec.table[type] : rec.table.players;
    return arr?.findIndex(p => p.id === uid) ?? -1;
  }

  _stripProps(obj, props) {
    if (!obj) return obj;
    const out = {};
    for (const key in obj) {
      if (!props.includes(key)) out[key] = obj[key];
    }
    return out;
  }
}

module.exports = GameService;
