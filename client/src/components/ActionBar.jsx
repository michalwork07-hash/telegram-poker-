import { useState } from 'react';

export default function ActionBar({ onAction, game, currentPlayerIdx, myIdx, myChips }) {
  const [betAmt, setBetAmt] = useState('');
  const isMyTurn = myIdx !== undefined && myIdx === currentPlayerIdx;
  if (!isMyTurn || !game) return null;

  const maxBet = game.bets ? Math.max(...game.bets) : 0;
  const myBet  = game.bets?.[myIdx] ?? 0;
  const toCall = maxBet - myBet;
  const canCheck = toCall === 0;

  function act(action, amt) {
    onAction(action, amt);
    setBetAmt('');
  }

  const btnBase = 'flex-1 py-2 rounded-lg font-semibold text-sm transition active:scale-95';

  return (
    <div className="p-3 bg-black/60 border-t border-white/10 space-y-2">
      {/* Bet slider row */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={myChips}
          value={betAmt}
          onChange={e => setBetAmt(e.target.value)}
          placeholder="Bet amount"
          className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={() => betAmt && act('bet', betAmt)}
          className={`${btnBase} bg-gold text-black px-4`}
          disabled={!betAmt}
        >
          Bet
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button onClick={() => act('fold')}  className={`${btnBase} bg-red-700 text-white`}>Fold</button>
        {canCheck
          ? <button onClick={() => act('check')} className={`${btnBase} bg-green-700 text-white`}>Check</button>
          : <button onClick={() => act('call')}  className={`${btnBase} bg-blue-600 text-white`}>Call {toCall}</button>
        }
        <button onClick={() => act('allin')} className={`${btnBase} bg-purple-700 text-white`}>All In</button>
      </div>
    </div>
  );
}
