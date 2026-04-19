import { useEffect, useState } from 'react';
import PokerTable from '../components/PokerTable';
import ActionBar from '../components/ActionBar';

export default function GameScreen({ socket, user, tid, onLeave }) {
  const [tableState, setTableState] = useState(null);
  const [members, setMembers]       = useState([]);
  const [joined, setJoined]         = useState(false);
  const [buyIn, setBuyIn]           = useState('');
  const [status, setStatus]         = useState('');

  const uid = user ? String(user.id) : null;

  useEffect(() => {
    if (!socket || !tid) return;

    socket.on('onTableEvent', state => setTableState(state));
    socket.on('onUpdateUsers', m => setMembers(m || []));
    socket.on('onTableJoin', () => {});

    return () => {
      socket.off('onTableEvent');
      socket.off('onUpdateUsers');
      socket.off('onTableJoin');
    };
  }, [socket, tid]);

  function doJoinGame() {
    if (!socket) return;
    const amount = parseInt(buyIn);
    if (isNaN(amount)) return setStatus('Enter a valid buy-in amount');
    socket.emit('joinGame', { tid, buyIn: amount }, ({ code, error }) => {
      if (code === 200) setJoined(true);
      else setStatus(error || 'Error');
    });
  }

  function doStartGame() {
    socket.emit('startGame', { tid }, ({ code, error }) => {
      if (code !== 200) setStatus(error || 'Cannot start');
    });
  }

  function doAction(action, amt) {
    socket.emit('execute', { tid, action, amt }, ({ code, error }) => {
      if (code !== 200) setStatus(error || 'Action failed');
      else setStatus('');
    });
  }

  function doLeave() {
    socket.emit('leaveTable', { tid });
    onLeave();
  }

  const myIdx = tableState?.players?.findIndex(p => p?.id === uid) ?? -1;
  const isMyTurn = myIdx !== -1 && myIdx === tableState?.currentPlayer;
  const isCreator = tableState?.creator === uid;
  const state = tableState?.state;

  const minBuyIn = tableState?.minBuyIn ?? 100;
  const maxBuyIn = tableState?.maxBuyIn ?? 5000;

  return (
    <div className="h-full flex flex-col bg-[#0f1923]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/30">
        <button onClick={doLeave} className="text-white/60 text-sm active:text-white">← Leave</button>
        <span className="text-xs text-white/40">
          {state === 'IN_PROGRESS' ? '● In Progress' : '● Waiting'}
        </span>
        {status && <span className="text-xs text-red-400">{status}</span>}
      </div>

      {/* Table */}
      <div className="flex-1 relative">
        <PokerTable tableState={tableState} myUid={uid} />
      </div>

      {/* Bottom panel */}
      <div className="shrink-0">
        {/* Not joined as player yet */}
        {!joined && state === 'JOIN' && myIdx === -1 && (
          <div className="p-3 bg-black/60 flex gap-2 border-t border-white/10">
            <input
              type="number"
              placeholder={`Buy-in (${minBuyIn}–${maxBuyIn})`}
              value={buyIn}
              onChange={e => setBuyIn(e.target.value)}
              className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
            />
            <button
              onClick={doJoinGame}
              className="bg-felt text-white px-4 py-2 rounded-lg text-sm font-semibold active:scale-95"
            >
              Sit Down
            </button>
          </div>
        )}

        {/* Creator can start the game */}
        {state === 'JOIN' && isCreator && joined && (
          <div className="p-3 bg-black/60 border-t border-white/10">
            <button
              onClick={doStartGame}
              className="w-full bg-gold text-black py-3 rounded-xl font-bold active:scale-95"
            >
              Start Game
            </button>
          </div>
        )}

        {/* Action bar */}
        {state === 'IN_PROGRESS' && myIdx !== -1 && (
          <ActionBar
            onAction={doAction}
            game={tableState?.game}
            currentPlayerIdx={tableState?.currentPlayer}
            myIdx={myIdx}
            myChips={tableState?.players?.[myIdx]?.chips ?? 0}
          />
        )}
      </div>
    </div>
  );
}
