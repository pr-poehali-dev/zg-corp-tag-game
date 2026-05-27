import { useState, useEffect, useCallback } from 'react';
import { friendsApi } from '@/lib/multiplayerApi';
import Icon from '@/components/ui/icon';

interface User {
  id: number;
  username: string;
  friendStatus?: string | null;
}

interface Props {
  currentUser: { userId: number; username: string } | null;
  onStartGame: (mode: string) => void;
}

export default function FriendsPage({ currentUser, onStartGame }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [incoming, setIncoming] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const loadFriends = useCallback(async () => {
    if (!currentUser) return;
    const data = await friendsApi.list(currentUser.userId);
    setFriends(data.friends || []);
    setIncoming(data.incoming || []);
  }, [currentUser]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  const search = async () => {
    if (!currentUser || searchQuery.length < 2) return;
    setLoading(true);
    const data = await friendsApi.search(currentUser.userId, searchQuery);
    setSearchResults(data.users || []);
    setLoading(false);
  };

  const addFriend = async (friendId: number) => {
    if (!currentUser) return;
    await friendsApi.add(currentUser.userId, friendId);
    setMsg('Запрос отправлен');
    setSearchResults(prev => prev.map(u => u.id === friendId ? { ...u, friendStatus: 'pending' } : u));
    setTimeout(() => setMsg(''), 2000);
  };

  const respond = async (friendId: number, accept: boolean) => {
    if (!currentUser) return;
    await friendsApi.respond(currentUser.userId, friendId, accept);
    await loadFriends();
  };

  if (!currentUser) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="font-mono text-xs text-[#888] tracking-widest uppercase mb-2">
            Необходима авторизация
          </p>
          <p className="font-rajdhani text-[#0d0d0d] text-lg">
            Войдите в аккаунт, чтобы добавлять друзей
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-[10px] text-[#888] tracking-[0.3em] uppercase mb-1">SOCIAL_01</p>
        <h1 className="font-rajdhani font-bold text-3xl tracking-widest uppercase text-[#0d0d0d]">Друзья</h1>
      </div>

      {/* Search */}
      <div className="border border-[#e0e0e0] bg-white p-5 mb-6">
        <p className="font-mono text-[10px] text-[#888] tracking-[0.2em] uppercase mb-3">Найти игрока</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Введи имя..."
            className="flex-1 border border-[#e0e0e0] px-3 py-2 font-rajdhani text-sm text-[#0d0d0d] placeholder:text-[#ccc] focus:outline-none focus:border-[#0d0d0d] transition-colors"
          />
          <button
            onClick={search}
            disabled={loading}
            className="px-4 py-2 bg-[#0d0d0d] text-[#f5f5f5] font-mono text-xs tracking-widest uppercase hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? '...' : 'Найти'}
          </button>
        </div>

        {msg && <p className="font-mono text-xs text-green-600 tracking-wider mt-2">{msg}</p>}

        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {searchResults.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#0d0d0d]" />
                  <span className="font-rajdhani text-sm font-semibold text-[#0d0d0d] tracking-wider uppercase">
                    {u.username}
                  </span>
                </div>
                {u.friendStatus === 'accepted' ? (
                  <span className="font-mono text-[10px] text-green-600 tracking-widest">В ДРУЗЬЯХ</span>
                ) : u.friendStatus === 'pending' ? (
                  <span className="font-mono text-[10px] text-[#888] tracking-widest">ЗАПРОС ОТПРАВЛЕН</span>
                ) : (
                  <button
                    onClick={() => addFriend(u.id)}
                    className="flex items-center gap-1.5 px-3 py-1 border border-[#e0e0e0] hover:border-[#0d0d0d] transition-colors group"
                  >
                    <Icon name="UserPlus" size={12} />
                    <span className="font-mono text-[10px] text-[#888] group-hover:text-[#0d0d0d] tracking-widest uppercase transition-colors">
                      Добавить
                    </span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="border border-[#e0e0e0] bg-white p-5 mb-6">
          <p className="font-mono text-[10px] text-[#888] tracking-[0.2em] uppercase mb-3">
            Входящие запросы ({incoming.length})
          </p>
          <div className="space-y-2">
            {incoming.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-[#f0f0f0] last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#0d0d0d]" />
                  <span className="font-rajdhani text-sm font-semibold text-[#0d0d0d] tracking-wider uppercase">
                    {u.username}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respond(u.id, true)}
                    className="px-3 py-1 bg-[#0d0d0d] text-[#f5f5f5] font-mono text-[10px] tracking-widest uppercase hover:bg-[#333] transition-colors"
                  >
                    Принять
                  </button>
                  <button
                    onClick={() => respond(u.id, false)}
                    className="px-3 py-1 border border-[#e0e0e0] font-mono text-[10px] text-[#888] tracking-widest uppercase hover:border-[#0d0d0d] hover:text-[#0d0d0d] transition-colors"
                  >
                    Отклонить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="border border-[#e0e0e0] bg-white p-5">
        <p className="font-mono text-[10px] text-[#888] tracking-[0.2em] uppercase mb-3">
          Мои друзья ({friends.length})
        </p>
        {friends.length === 0 ? (
          <p className="font-rajdhani text-sm text-[#aaa] tracking-wider">
            Пока нет друзей — найди игрока выше
          </p>
        ) : (
          <div className="space-y-3">
            {friends.map(u => (
              <div key={u.id} className="py-3 border-b border-[#f0f0f0] last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-1.5 bg-green-500" />
                  <span className="font-rajdhani text-sm font-semibold text-[#0d0d0d] tracking-wider uppercase">
                    {u.username}
                  </span>
                </div>
                <div className="flex gap-2">
                  {[
                    { mode: 'chase', label: 'Догонялки' },
                    { mode: 'infection', label: 'Заражение' },
                    { mode: 'dodgeball', label: 'Догомяч' },
                  ].map(({ mode, label }) => (
                    <button
                      key={mode}
                      onClick={() => onStartGame(mode)}
                      className="flex items-center gap-1.5 px-2 sm:px-3 py-2 border border-[#e0e0e0] hover:border-[#0d0d0d] active:bg-[#0d0d0d] active:text-[#f5f5f5] transition-colors group flex-1 justify-center"
                    >
                      <Icon name="Gamepad2" size={12} />
                      <span className="font-mono text-[10px] text-[#888] group-hover:text-[#0d0d0d] tracking-widest uppercase transition-colors">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}