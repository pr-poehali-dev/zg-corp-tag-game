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
  { id: 'friends',   label: 'Друзья',     tag: 'SOCIAL_01' },
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
  const [menuOpen, setMenuOpen] = useState(false);

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

  const navTo = (id: Page) => { setActivePage(id); setMenuOpen(false); };

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
      <header className="border-b border-[#e0e0e0] bg-[#f5f5f5] sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#0d0d0d]" />
            <span className="text-[#0d0d0d] font-semibold text-base sm:text-lg tracking-widest uppercase">
              ZG Corp
            </span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => navTo(id)}
                className={`zg-nav-link text-xs lg:text-sm font-medium tracking-widest uppercase pb-0.5 transition-colors flex items-center gap-1.5 ${
                  activePage === id ? 'text-[#0d0d0d] active' : 'text-[#888888] hover:text-[#0d0d0d]'
                }`}
              >
                {id === 'friends' && <Icon name="Users" size={12} />}
                {label}
              </button>
            ))}
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-2 lg:gap-3">
            {user ? (
              <>
                <button
                  onClick={() => openLobby(activePage === 'friends' ? 'chase' : activePage)}
                  className="flex items-center gap-1.5 px-2 lg:px-3 py-1.5 border border-[#e0e0e0] hover:border-[#0d0d0d] transition-colors group"
                >
                  <Icon name="Gamepad2" size={13} />
                  <span className="font-mono text-xs text-[#888] group-hover:text-[#0d0d0d] tracking-wider uppercase transition-colors hidden lg:inline">
                    Играть вдвоём
                  </span>
                </button>
                <div className="flex items-center gap-2 px-2 lg:px-3 py-1.5 border border-[#e0e0e0]">
                  <div className="w-1.5 h-1.5 bg-[#0d0d0d]" />
                  <span className="font-mono text-xs text-[#0d0d0d] tracking-wider uppercase max-w-[80px] truncate">
                    {user.username}
                  </span>
                </div>
                <button onClick={logout} className="text-[#aaa] hover:text-[#0d0d0d] transition-colors" title="Выйти">
                  <Icon name="LogOut" size={14} />
                </button>
              </>
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

          {/* Mobile right side */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <button
                onClick={() => openLobby(activePage === 'friends' ? 'chase' : activePage)}
                className="flex items-center gap-1 px-2 py-1.5 border border-[#e0e0e0]"
              >
                <Icon name="Gamepad2" size={15} />
              </button>
            )}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-2 text-[#0d0d0d]"
              aria-label="Меню"
            >
              <Icon name={menuOpen ? 'X' : 'Menu'} size={22} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[#e0e0e0] bg-[#f5f5f5]">
            <div className="px-4 py-3 space-y-1">
              {NAV.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => navTo(id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left font-rajdhani font-semibold text-sm tracking-widest uppercase transition-colors ${
                    activePage === id
                      ? 'bg-[#0d0d0d] text-[#f5f5f5]'
                      : 'text-[#0d0d0d] hover:bg-[#e8e8e8]'
                  }`}
                >
                  {id === 'friends' && <Icon name="Users" size={15} />}
                  {id === 'chase' && <Icon name="Zap" size={15} />}
                  {id === 'infection' && <Icon name="Skull" size={15} />}
                  {id === 'dodgeball' && <Icon name="Circle" size={15} />}
                  {id === 'rules' && <Icon name="BookOpen" size={15} />}
                  {id === 'about' && <Icon name="Info" size={15} />}
                  {label}
                </button>
              ))}
              <div className="border-t border-[#e0e0e0] pt-3 mt-2">
                {user ? (
                  <div className="flex items-center justify-between px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[#0d0d0d]" />
                      <span className="font-mono text-xs text-[#0d0d0d] tracking-wider uppercase">
                        {user.username}
                      </span>
                    </div>
                    <button onClick={() => { logout(); setMenuOpen(false); }} className="flex items-center gap-1.5 text-[#888] font-mono text-xs tracking-wider uppercase">
                      <Icon name="LogOut" size={13} />
                      Выйти
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setShowAuth(true); setMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-3 font-rajdhani font-semibold text-sm tracking-widest uppercase text-[#0d0d0d] hover:bg-[#e8e8e8] transition-colors"
                  >
                    <Icon name="User" size={15} />
                    Войти
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          <span className="font-mono text-xs text-[#888888] tracking-wider">
            ZG CORP © 2026
          </span>
          <span className="font-mono text-xs text-[#cccccc] tracking-wider">
            {activeTag || 'ZG CORP'}
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
