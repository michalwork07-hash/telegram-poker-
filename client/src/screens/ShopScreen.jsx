import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { useState } from 'react';

const PACKAGES = [
  { id: '500',  chips: 500,  tons: 0.5, label: 'Starter' },
  { id: '2000', chips: 2000, tons: 1.5, label: 'Regular', popular: true },
  { id: '5000', chips: 5000, tons: 3.0, label: 'High Roller' },
];

const WALLET_ADDRESS = import.meta.env.VITE_TON_WALLET_ADDRESS || '';

export default function ShopScreen({ user, onBack }) {
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();
  const [pending, setPending] = useState(null);
  const [done, setDone]       = useState(null);

  async function buyPackage(pkg) {
    if (!address) {
      tonConnectUI.openModal();
      return;
    }
    setPending(pkg.id);
    try {
      const nanotons = BigInt(Math.round(pkg.tons * 1e9)).toString();
      const comment = `poker_chips_${pkg.id}_${user?.id}`;
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [{
          address: WALLET_ADDRESS || 'EQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAM9c',
          amount:  nanotons,
          payload: btoa(comment),
        }],
      });
      setDone(pkg.id);
    } catch (e) {
      if (e?.message !== 'User rejected the transaction') {
        alert('Transaction failed: ' + e.message);
      }
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4 overflow-y-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-white/60 active:text-white">←</button>
        <h2 className="font-bold text-lg">Buy Chips</h2>
      </div>

      <div className="bg-white/5 rounded-xl p-3 text-sm text-white/60">
        Current balance: <span className="text-gold font-bold">{user?.chips?.toLocaleString() ?? '–'} chips</span>
      </div>

      {PACKAGES.map(pkg => (
        <div key={pkg.id}
          className={`relative bg-white/5 rounded-2xl p-4 border ${pkg.popular ? 'border-gold' : 'border-white/10'}`}
        >
          {pkg.popular && (
            <span className="absolute -top-2.5 left-4 bg-gold text-black text-xs font-bold px-2 py-0.5 rounded-full">
              Most Popular
            </span>
          )}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-bold text-base">{pkg.label}</div>
              <div className="text-gold font-semibold mt-0.5">🪙 {pkg.chips.toLocaleString()} chips</div>
              <div className="text-white/50 text-xs mt-0.5">{pkg.tons} TON</div>
            </div>
            <button
              onClick={() => buyPackage(pkg)}
              disabled={!!pending}
              className={`px-4 py-2 rounded-xl font-semibold text-sm active:scale-95 transition
                ${pkg.popular ? 'bg-gold text-black' : 'bg-white/10 text-white'}
                ${pending === pkg.id ? 'opacity-50' : ''}
              `}
            >
              {done === pkg.id ? '✓ Bought' : pending === pkg.id ? '…' : !address ? 'Connect Wallet' : 'Buy'}
            </button>
          </div>
        </div>
      ))}

      <div className="text-xs text-white/30 text-center pb-4">
        Payments processed via TON blockchain.
        Chips are credited automatically after confirmation.
      </div>
    </div>
  );
}
