import PlayerSeat from './PlayerSeat';

const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = new Set(['H', 'D']);

function BoardCard({ card }) {
  if (!card) return <div className="w-10 h-14 rounded-lg bg-white/10 border border-white/20" />;
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const red = RED_SUITS.has(suit);
  return (
    <div className={`w-10 h-14 rounded-lg flex flex-col items-center justify-center font-bold text-sm shadow-lg
      bg-white border border-gray-200 ${red ? 'text-red-600' : 'text-gray-900'}`}>
      <span>{rank}</span>
      <span>{SUITS[suit]}</span>
    </div>
  );
}

// Seat positions around the table (percentage-based)
const SEAT_POSITIONS = [
  { bottom: '4%',  left: '50%',  transform: 'translateX(-50%)' }, // 0 - bottom center (me)
  { bottom: '15%', left: '10%'  },                                  // 1
  { top: '20%',    left: '5%'   },                                  // 2
  { top: '4%',     left: '25%'  },                                  // 3
  { top: '4%',     left: '50%', transform: 'translateX(-50%)' },   // 4
  { top: '4%',     right: '25%' },                                  // 5
  { top: '20%',    right: '5%'  },                                  // 6
  { bottom: '15%', right: '10%' },                                  // 7
  { bottom: '15%', left: '35%'  },                                  // 8
];

export default function PokerTable({ tableState, myUid }) {
  if (!tableState) return (
    <div className="flex-1 flex items-center justify-center text-white/40">
      Connecting to table...
    </div>
  );

  const { players = [], playersToAdd = [], game, board = [], currentPlayer, dealer } = tableState;
  const allPlayers = players.length ? players : playersToAdd;

  const myIdx = allPlayers.findIndex(p => p?.id === myUid);
  const pot = game?.pot ?? 0;

  // Reorder seats so "me" is always bottom center (index 0)
  const seated = Array.from({ length: 9 }, (_, i) => {
    const offset = myIdx >= 0 ? (i + myIdx) % allPlayers.length : i;
    return allPlayers[offset] || null;
  });

  return (
    <div className="relative w-full h-full select-none">
      {/* Felt table oval */}
      <div className="absolute inset-4 rounded-[50%] bg-felt border-4 border-[#0d3320] shadow-[inset_0_0_40px_rgba(0,0,0,0.5)]">
        {/* Pot */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          {pot > 0 && (
            <div className="bg-black/50 rounded-full px-3 py-1 text-sm font-bold text-gold mb-1">
              Pot: {pot}
            </div>
          )}
          {/* Community cards */}
          <div className="flex gap-1 justify-center mt-1">
            {Array.from({ length: 5 }, (_, i) => (
              <BoardCard key={i} card={board[i]} />
            ))}
          </div>
          {game?.roundName && (
            <div className="text-xs text-white/50 mt-1">{game.roundName}</div>
          )}
        </div>
      </div>

      {/* Player seats */}
      {SEAT_POSITIONS.map((pos, i) => (
        <div key={i} className="absolute" style={pos}>
          <PlayerSeat
            player={seated[i]}
            isCurrent={seated[i] && players.findIndex(p => p?.id === seated[i]?.id) === currentPlayer}
            isMe={seated[i]?.id === myUid}
          />
        </div>
      ))}
    </div>
  );
}
