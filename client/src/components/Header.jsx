import { TonConnectButton } from '@tonconnect/ui-react';

export default function Header({ user, onShop, onLobby, screen }) {
  return (
    <header className="flex items-center justify-between px-3 py-2 bg-[#0f1923] border-b border-white/10">
      <button onClick={onLobby} className="flex items-center gap-1 text-sm font-semibold text-gold">
        <span>♠</span>
        <span className={screen === 'lobby' ? 'text-gold' : 'text-white/60'}>Poker</span>
      </button>

      <div className="flex items-center gap-2">
        {user && (
          <button
            onClick={onShop}
            className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-full text-xs font-medium"
          >
            <span className="text-gold">🪙</span>
            <span>{user.chips?.toLocaleString()}</span>
          </button>
        )}
        <TonConnectButton style={{ '--tc-button-height': '28px', '--tc-font-size': '12px' }} />
      </div>
    </header>
  );
}
