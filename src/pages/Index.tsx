import { useState, useEffect } from 'react';
import GamePage from '@/components/GamePage';
import InfectionGame from '@/components/InfectionGame';
import DodgeballGame from '@/components/DodgeballGame';
import AboutPage from '@/components/AboutPage';
import RulesPage from '@/components/RulesPage';
import AuthModal from '@/components/AuthModal';
import FriendsPage from '@/components/FriendsPage';
import MultiplayerLobby from '@/components/MultiplayerLobby';
import MultiplayerGame from '@/components/MultiplayerGame';
import Icon from '@/components/ui/icon';

type Page = 'chase' | 'infection' | 'dodgeball' | 'rules' | 'about' | 'friends';

const NAV: { id: Page; label: string; tag: string }[] = [
  { id: 'chase',     label: 'Догонялки',  tag: 'MODE_01' },
  { id: 'infection', label: 'Заражение',  tag: 'MODE_02' },
  { id: 'dodgeball', label: 'Догомяч',    tag: 'MODE_03' },
  { id: 'rules',     label: 'Правила',    tag: '' },
  { id: 'about',     label: 'О проекте',  tag: '' },
];

interface StoredUser {
  username: string;
  userId: number;
}

type AppView = 'page' | 'lobby' | 'game';

export default function Index() {
  const [activePage, setActivePage] = useState<Page>('chase');
  const [showAuth, setShowAuth] = useState(false);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [view, setView] = useState<AppView>('page');
  const [lobbyMode, setLobbyMode] = useState('chase');
  const [gameInfo, setGameInfo] = useState<{ roomId: number; role: 'host' | 'guest'; mode: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('zg_user');
    if (saved) { try { setUser(JSON.parse(saved)); } catch (e) { void e; } }
  }, []);

  const logout = () => { localStorage.removeItem('zg_user'); setUser(null); };

  const activeTag = NAV.find(n => n.id === activePage)?.tag ?? '';

  const openLobby = (mode: string) => { setLobbyMode(mode); setView('lobby'); };
  const openGame = (roomId: number, role: 'host' | 'guest', mode: string) => {
    setGameInfo({ roomId, role, mode });
    setView('game');
  };

  // Full-screen views
  if (view === 'lobby' && user) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] font-rajdhani flex flex-col">
        <MultiplayerLobby
          currentUser={user}
          initialMode={lobbyMode}
          onJoined={(roomId, role, mode) => openGame(roomId, role, mode)}
          onBack={() => setView('page')}
        />
      </div>
    );
  }

  if (view === 'game' && user && gameInfo) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] font-rajdhani flex flex-col">
        <MultiplayerGame
          roomId={gameInfo.roomId}
          role={gameInfo.role}
          mode={gameInfo.mode}
          currentUser={user}
          onBack={() => setView('page')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-rajdhani flex flex-col">
      {/* Header */}
      <header className="border-b border-[#e0e0e0] bg-[#f5f5f5]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 bg-[#0d0d0d]" />
            <span className="text-[#0d0d0d] font-semibold text-lg tracking-widest uppercase">
              ZG Corp
            </span>
          </div>

          <nav className="flex items-center gap-6">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActivePage(id)}
                className={`zg-nav-link text-sm font-medium tracking-widest uppercase pb-0.5 transition-colors ${
                  activePage === id
                    ? 'text-[#0d0d0d] active'
                    : 'text-[#888888] hover:text-[#0d0d0d]'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setActivePage('friends')}
              className={`zg-nav-link text-sm font-medium tracking-widest uppercase pb-0.5 transition-colors flex items-center gap-1.5 ${
                activePage === 'friends'
                  ? 'text-[#0d0d0d] active'
                  : 'text-[#888888] hover:text-[#0d0d0d]'
              }`}
            >
              <Icon name="Users" size={13} />
              Друзья
            </button>
          </nav>

          {/* Auth */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => openLobby(activePage === 'friends' ? 'chase' : activePage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e0e0e0] hover:border-[#0d0d0d] transition-colors group"
                >
                  <Icon name="Gamepad2" size={13} />
                  <span className="font-mono text-xs text-[#888] group-hover:text-[#0d0d0d] tracking-wider uppercase transition-colors">
                    Играть вдвоём
                  </span>
                </button>
                <div className="flex items-center gap-2 px-3 py-1.5 border border-[#e0e0e0]">
                  <div className="w-1.5 h-1.5 bg-[#0d0d0d]" />
                  <span className="font-mono text-xs text-[#0d0d0d] tracking-wider uppercase">
                    {user.username}
                  </span>
                </div>
                <button onClick={logout} className="text-[#aaa] hover:text-[#0d0d0d] transition-colors" title="Выйти">
                  <Icon name="LogOut" size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuth(true)}
                className="flex items-center gap-2 px-3 py-1.5 border border-[#e0e0e0] hover:border-[#0d0d0d] transition-colors group"
              >
                <Icon name="User" size={13} />
                <span className="font-mono text-xs text-[#888] group-hover:text-[#0d0d0d] tracking-wider uppercase transition-colors">
                  Войти
                </span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        {activePage === 'chase'     && <GamePage />}
        {activePage === 'infection' && <InfectionGame />}
        {activePage === 'dodgeball' && <DodgeballGame />}
        {activePage === 'rules'     && <RulesPage />}
        {activePage === 'about'     && <AboutPage />}
        {activePage === 'friends'   && (
          <FriendsPage
            currentUser={user}
            onStartGame={(mode) => {
              if (!user) { setShowAuth(true); return; }
              openLobby(mode);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e0e0e0] py-4">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <span className="font-mono text-xs text-[#888888] tracking-wider">
            ZG CORP © 2026
          </span>
          <span className="font-mono text-xs text-[#cccccc] tracking-wider">
            {activePage === 'friends' ? 'SOCIAL_01' : activeTag || 'ZG CORP'}
          </span>
        </div>
      </footer>

      {showAuth && (
        <AuthModal
          onSuccess={(username, userId) => { setUser({ username, userId }); setShowAuth(false); }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </div>
  );
}
