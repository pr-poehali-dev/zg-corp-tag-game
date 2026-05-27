import { useState } from 'react';
import GamePage from '@/components/GamePage';
import AboutPage from '@/components/AboutPage';
import RulesPage from '@/components/RulesPage';

type Page = 'game' | 'about' | 'rules';

export default function Index() {
  const [activePage, setActivePage] = useState<Page>('game');

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

          <nav className="flex items-center gap-8">
            {(['game', 'rules', 'about'] as Page[]).map((page) => (
              <button
                key={page}
                onClick={() => setActivePage(page)}
                className={`zg-nav-link text-sm font-medium tracking-widest uppercase pb-0.5 transition-colors ${
                  activePage === page
                    ? 'text-[#0d0d0d] active'
                    : 'text-[#888888] hover:text-[#0d0d0d]'
                }`}
              >
                {page === 'game' ? 'Игра' : page === 'rules' ? 'Правила' : 'О проекте'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col">
        {activePage === 'game' && <GamePage />}
        {activePage === 'rules' && <RulesPage />}
        {activePage === 'about' && <AboutPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e0e0e0] py-4">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <span className="font-mono text-xs text-[#888888] tracking-wider">
            ZG CORP © 2026
          </span>
          <span className="font-mono text-xs text-[#cccccc] tracking-wider">
            MODE_01 / CHASE
          </span>
        </div>
      </footer>
    </div>
  );
}
