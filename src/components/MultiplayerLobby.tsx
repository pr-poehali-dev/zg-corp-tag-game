import { useState } from 'react';
import { roomsApi } from '@/lib/multiplayerApi';
import Icon from '@/components/ui/icon';

interface Props {
  currentUser: { userId: number; username: string };
  initialMode?: string;
  onJoined: (roomId: number, role: 'host' | 'guest', mode: string) => void;
  onBack: () => void;
}

const MODE_LABELS: Record<string, string> = {
  chase: 'Догонялки',
  infection: 'Заражение',
  dodgeball: 'Догомяч',
};

export default function MultiplayerLobby({ currentUser, initialMode, onJoined, onBack }: Props) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [selectedMode, setSelectedMode] = useState(initialMode || 'chase');
  const [joinCode, setJoinCode] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [roomId, setRoomId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waiting, setWaiting] = useState(false);

  const createRoom = async () => {
    setError('');
    setLoading(true);
    const data = await roomsApi.create(currentUser.userId, selectedMode);
    setLoading(false);
    if (!data.ok) { setError(data.error || 'Ошибка'); return; }
    setCreatedCode(data.code);
    setRoomId(data.roomId);
    setWaiting(true);
    // Poll until guest joins
    const interval = setInterval(async () => {
      const state = await roomsApi.state(currentUser.userId, data.roomId);
      if (state.status === 'playing' && state.guestId) {
        clearInterval(interval);
        setWaiting(false);
        onJoined(data.roomId, 'host', selectedMode);
      }
    }, 1500);
    // Auto-clear after 3 minutes
    setTimeout(() => clearInterval(interval), 180000);
  };

  const joinRoom = async () => {
    setError('');
    if (!joinCode.trim()) { setError('Введи код комнаты'); return; }
    setLoading(true);
    const data = await roomsApi.join(currentUser.userId, joinCode.trim());
    setLoading(false);
    if (!data.ok) { setError(data.error || 'Комната не найдена'); return; }
    onJoined(data.roomId, data.role, data.mode);
  };

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
      <button onClick={onBack} className="flex items-center gap-2 text-[#888] hover:text-[#0d0d0d] transition-colors mb-6">
        <Icon name="ArrowLeft" size={14} />
        <span className="font-mono text-xs tracking-widest uppercase">Назад</span>
      </button>

      <div className="mb-8">
        <p className="font-mono text-[10px] text-[#888] tracking-[0.3em] uppercase mb-1">MULTI_01</p>
        <h1 className="font-rajdhani font-bold text-3xl tracking-widest uppercase text-[#0d0d0d]">
          Игра с другом
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex border border-[#e0e0e0] mb-6">
        {(['create', 'join'] as const).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(''); setCreatedCode(''); setWaiting(false); }}
            className={`flex-1 py-3 font-mono text-xs tracking-widest uppercase transition-colors ${
              tab === t ? 'bg-[#0d0d0d] text-[#f5f5f5]' : 'text-[#888] hover:text-[#0d0d0d]'
            }`}
          >
            {t === 'create' ? 'Создать комнату' : 'Войти по коду'}
          </button>
        ))}
      </div>

      <div className="border border-[#e0e0e0] bg-white p-6">
        {tab === 'create' && !waiting && (
          <>
            <p className="font-mono text-[10px] text-[#888] tracking-[0.2em] uppercase mb-3">Режим игры</p>
            <div className="grid grid-cols-3 gap-2 mb-6">
              {Object.entries(MODE_LABELS).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setSelectedMode(m)}
                  className={`py-3 font-mono text-[10px] tracking-widest uppercase border transition-colors ${
                    selectedMode === m
                      ? 'bg-[#0d0d0d] text-[#f5f5f5] border-[#0d0d0d]'
                      : 'border-[#e0e0e0] text-[#888] hover:border-[#0d0d0d] hover:text-[#0d0d0d]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {error && <p className="font-mono text-xs text-red-500 tracking-wider mb-4">{error}</p>}
            <button
              onClick={createRoom}
              disabled={loading}
              className="w-full py-3 bg-[#0d0d0d] text-[#f5f5f5] font-mono text-xs tracking-widest uppercase hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Создать комнату'}
            </button>
          </>
        )}

        {tab === 'create' && waiting && createdCode && (
          <div className="text-center">
            <p className="font-mono text-[10px] text-[#888] tracking-[0.2em] uppercase mb-3">
              Код комнаты — отправь другу
            </p>
            <div className="bg-[#f5f5f5] border border-[#e0e0e0] py-6 px-4 mb-4">
              <span className="font-rajdhani font-bold text-5xl tracking-[0.4em] text-[#0d0d0d]">
                {createdCode}
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-[#0d0d0d] animate-pulse rounded-full" />
              <p className="font-mono text-xs text-[#888] tracking-widest uppercase">
                Ожидаю подключения...
              </p>
            </div>
            <p className="font-mono text-[10px] text-[#aaa] tracking-wider">
              Режим: {MODE_LABELS[selectedMode]}
            </p>
          </div>
        )}

        {tab === 'join' && (
          <>
            <p className="font-mono text-[10px] text-[#888] tracking-[0.2em] uppercase mb-3">
              Код от друга
            </p>
            <input
              type="text"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && joinRoom()}
              maxLength={6}
              placeholder="XXXXXX"
              className="w-full border border-[#e0e0e0] px-3 py-3 font-rajdhani text-2xl font-bold text-[#0d0d0d] tracking-[0.4em] placeholder:text-[#ddd] focus:outline-none focus:border-[#0d0d0d] transition-colors text-center mb-4"
            />
            {error && <p className="font-mono text-xs text-red-500 tracking-wider mb-4">{error}</p>}
            <button
              onClick={joinRoom}
              disabled={loading}
              className="w-full py-3 bg-[#0d0d0d] text-[#f5f5f5] font-mono text-xs tracking-widest uppercase hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {loading ? '...' : 'Войти в комнату'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}