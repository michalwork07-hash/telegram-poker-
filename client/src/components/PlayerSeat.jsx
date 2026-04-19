const SUITS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const RED_SUITS = new Set(['H', 'D']);

function CardFace({ card }) {
  if (!card) return null;
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const red = RED_SUITS.has(suit);
  return (
    <span className={`inline-flex items-center justify-center w-7 h-9 rounded border text-xs font-bold
      bg-white ${red ? 'text-red-600' : 'text-gray-900'} border-gray-300 shadow`}>
      {rank}{SUITS[suit]}
    </span>
  );
}

function CardBack() {
  return (
    <span className="inline-flex items-center justify-center w-7 h-9 rounded border
      bg-blue-800 border-blue-600 shadow text-blue-400 text-xs">🂠</span>
  );
}

export default function PlayerSeat({ player, isCurrent, isMe, position }) {
  if (!player) return (
    <div className="flex flex-col items-center gap-1 opacity-30">
      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20" />
      <span className="text-xs text-white/40">Empty</span>
    </div>
  );

  const { playerName, chips, folded, allIn, cards, talked } = player;

  return (
    <div className={`flex flex-col items-center gap-1 transition-all
      ${isCurrent ? 'scale-105' : ''}
      ${folded ? 'opacity-40' : ''}
    `}>
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold
        border-2 ${isCurrent ? 'border-gold animate-pulse' : 'border-white/20'}
        ${isMe ? 'bg-blue-700' : 'bg-white/10'}`}>
        {(playerName || '?')[0].toUpperCase()}
      </div>

      {/* Name & chips */}
      <div className="text-center">
        <div className="text-xs font-semibold truncate max-w-[60px]">{playerName}</div>
        <div className="text-xs text-gold">{allIn ? 'ALL IN' : chips}</div>
      </div>

      {/* Cards */}
      <div className="flex gap-0.5">
        {cards && cards.length > 0
          ? cards.map((c, i) => isMe || typeof c === 'string'
              ? <CardFace key={i} card={c} />
              : <CardBack key={i} />)
          : [<CardBack key={0} />, <CardBack key={1} />]}
      </div>
    </div>
  );
}
