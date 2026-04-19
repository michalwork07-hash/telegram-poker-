import { useEffect, useState } from 'react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { connectSocket } from './socket';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import ShopScreen from './screens/ShopScreen';
import Header from './components/Header';

const MANIFEST_URL = import.meta.env.VITE_TON_MANIFEST_URL || `${window.location.origin}/tonconnect-manifest.json`;

export default function App() {
  const [screen, setScreen] = useState('lobby'); // lobby | game | shop
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [activeTable, setActiveTable] = useState(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0f1923');
      tg.setBackgroundColor('#0f1923');
    }

    const tgUser = tg?.initDataUnsafe?.user;
    const authPayload = tg?.initData
      ? { initData: tg.initData }
      : { telegramId: String(tgUser?.id || Date.now()), username: tgUser?.username || 'Player', firstName: tgUser?.first_name || 'Player' };

    const s = connectSocket(authPayload);
    setSocket(s);

    s.on('connect', () => {
      s.emit('getBalance', {}, ({ chips }) => {
        const u = tgUser || { id: authPayload.telegramId, username: authPayload.username, first_name: authPayload.firstName };
        setUser({ ...u, chips });
      });
    });

    s.on('onUpdateMyself', ({ chips }) => {
      setUser(prev => prev ? { ...prev, chips } : prev);
    });

    return () => { s.off('onUpdateMyself'); };
  }, []);

  function goToGame(tid) {
    setActiveTable(tid);
    setScreen('game');
  }

  function goToLobby() {
    setActiveTable(null);
    setScreen('lobby');
  }

  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <div className="flex flex-col h-full bg-[#0f1923]">
        <Header user={user} onShop={() => setScreen('shop')} onLobby={goToLobby} screen={screen} />
        <main className="flex-1 overflow-hidden">
          {screen === 'lobby' && <LobbyScreen socket={socket} user={user} onJoinTable={goToGame} />}
          {screen === 'game' && <GameScreen socket={socket} user={user} tid={activeTable} onLeave={goToLobby} />}
          {screen === 'shop' && <ShopScreen user={user} onBack={goToLobby} />}
        </main>
      </div>
    </TonConnectUIProvider>
  );
}
