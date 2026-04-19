import { useEffect, useState } from 'react';

const DEFAULT_TABLE = { smallBlind: 5, bigBlind: 10, minBuyIn: 100, maxBuyIn: 5000, minPlayers: 2, maxPlayers: 9, gameMode: 'normal' };

export default function LobbyScreen({ socket, user, onJoinTable }) {
  const [tables, setTables]       = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm]           = useState(DEFAULT_TABLE);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (!socket) return;
    function refresh() {
      socket.emit('getTables', {}, ({ tables: t }) => setTables(t || []));
    }
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [socket]);

  function createTable() {
    if (!socket) return;
    setLoading(true);
    socket.emit('createTable', form, ({ tid }) => {
      setLoading(false);
      setShowCreate(false);
      if (tid) onJoinTable(tid);
    });
  }

  function joinTable(tid) {
    if (!socket) return;
    socket.emit('joinTable', { tid }, ({ code, error }) => {
      if (code === 200) onJoinTable(tid);
      else alert(error);
    });
  }

  const stateLabel = { JOIN: 'Waiting', IN_PROGRESS: 'In Progress' };
  const stateColor = { JOIN: 'text-green-400', IN_PROGRESS: 'text-yellow-400' };

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      {/* Balance banner */}
      <div className="bg-white/5 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-white/50 uppercase tracking-wider">Your Balance</div>
          <div className="text-2xl font-bold text-gold mt-1">🪙 {user?.chips?.toLocaleString() ?? '–'}</div>
        </div>
        <div className="text-right text-xs text-white/40">
          <div>{user?.username || user?.first_name}</div>
          <div className="text-green-400 mt-1">● Online</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Tables</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-felt text-white text-sm px-3 py-1.5 rounded-lg border border-felt/50 active:scale-95"
        >
          + Create
        </button>
      </div>

      {/* Table list */}
      {tables.length === 0
        ? <div className="text-center text-white/30 py-12">No active tables — create one!</div>
        : tables.map(t => (
          <div key={t.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Blinds {t.smallBlind}/{t.bigBlind}</div>
              <div className="text-xs text-white/50 mt-0.5">
                Buy-in {t.minBuyIn}–{t.maxBuyIn} · {t.gameMode}
              </div>
              <div className={`text-xs mt-0.5 ${stateColor[t.state] || 'text-white/40'}`}>
                {stateLabel[t.state] || t.state} · {t.players}/{t.maxPlayers} players
              </div>
            </div>
            <button
              onClick={() => joinTable(t.id)}
              className="bg-felt border border-felt text-white text-sm px-4 py-2 rounded-lg active:scale-95"
            >
              Join
            </button>
          </div>
        ))
      }

      {/* Create table modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={() => setShowCreate(false)}>
          <div className="bg-[#1a2330] w-full rounded-t-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">Create Table</h3>
            {[
              ['Small Blind', 'smallBlind'],
              ['Big Blind', 'bigBlind'],
              ['Min Buy-In', 'minBuyIn'],
              ['Max Buy-In', 'maxBuyIn'],
              ['Min Players', 'minPlayers'],
              ['Max Players', 'maxPlayers'],
            ].map(([label, key]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-white/60">{label}</span>
                <input
                  type="number"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="w-24 bg-white/10 rounded-lg px-2 py-1 text-sm text-right outline-none"
                />
              </div>
            ))}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">Mode</span>
              <select
                value={form.gameMode}
                onChange={e => setForm(f => ({ ...f, gameMode: e.target.value }))}
                className="bg-white/10 rounded-lg px-2 py-1 text-sm outline-none"
              >
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </div>
            <button
              onClick={createTable}
              disabled={loading}
              className="w-full bg-felt py-3 rounded-xl font-semibold active:scale-95"
            >
              {loading ? 'Creating…' : 'Create Table'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
