import { useState } from 'react';
import Icon from '@/components/ui/icon';

const AUTH_URL = 'https://functions.poehali.dev/b2c68a88-0478-42e4-bb1b-191c4c8b6215';

type Mode = 'login' | 'register';

interface Props {
  onSuccess: (username: string, userId: number) => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: mode, username, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Что-то пошло не так');
      } else {
        localStorage.setItem('zg_user', JSON.stringify({ username: data.username, userId: data.userId }));
        onSuccess(data.username, data.userId);
      }
    } catch {
      setError('Ошибка соединения');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-[#f5f5f5] border border-[#e0e0e0] w-full max-w-sm mx-4 animate-scale-in">
        {/* Header */}
        <div className="border-b border-[#e0e0e0] px-6 py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] text-[#888888] tracking-[0.3em] uppercase mb-0.5">
              ZG CORP
            </p>
            <h2 className="font-rajdhani font-bold text-lg tracking-widest text-[#0d0d0d] uppercase">
              {mode === 'login' ? 'Вход' : 'Регистрация'}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#aaa] hover:text-[#0d0d0d] transition-colors">
            <Icon name="X" size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e0e0e0]">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-3 font-mono text-xs tracking-widest uppercase transition-colors ${
                mode === m
                  ? 'bg-[#0d0d0d] text-[#f5f5f5]'
                  : 'text-[#888] hover:text-[#0d0d0d]'
              }`}
            >
              {m === 'login' ? 'Войти' : 'Создать аккаунт'}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="px-6 py-6 space-y-4">
          <div>
            <label className="font-mono text-[10px] text-[#888888] tracking-[0.2em] uppercase block mb-1.5">
              Имя
            </label>
            <input
              type="text"
              value={username}
              maxLength={32}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="от 3 символов"
              className="w-full border border-[#e0e0e0] bg-white px-3 py-2.5 font-rajdhani text-sm text-[#0d0d0d] placeholder:text-[#ccc] focus:outline-none focus:border-[#0d0d0d] transition-colors"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] text-[#888888] tracking-[0.2em] uppercase block mb-1.5">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="от 4 символов"
              className="w-full border border-[#e0e0e0] bg-white px-3 py-2.5 font-rajdhani text-sm text-[#0d0d0d] placeholder:text-[#ccc] focus:outline-none focus:border-[#0d0d0d] transition-colors"
            />
          </div>

          {error && (
            <p className="font-mono text-xs text-red-500 tracking-wider animate-fade-in">
              {error}
            </p>
          )}

          <button
            onClick={submit}
            disabled={loading}
            className="w-full py-3 bg-[#0d0d0d] text-[#f5f5f5] font-rajdhani font-semibold text-sm tracking-[0.2em] uppercase hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {loading ? '...' : mode === 'login' ? 'Войти' : 'Создать'}
          </button>
        </div>

        {/* Footer hint */}
        <div className="border-t border-[#e0e0e0] px-6 py-3">
          <p className="font-mono text-[10px] text-[#aaaaaa] tracking-wider text-center">
            Войдите в реальный аккаунт корпорации
          </p>
        </div>
      </div>
    </div>
  );
}