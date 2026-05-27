import { useEffect, useRef, useState, useCallback } from 'react';
import { roomsApi, PlayerState } from '@/lib/multiplayerApi';
import Icon from '@/components/ui/icon';

interface Props {
  roomId: number;
  role: 'host' | 'guest';
  mode: string;
  currentUser: { userId: number; username: string };
  onBack: () => void;
}

const W = 700;
const H = 480;
const POLL_MS = 80;

const MODE_LABELS: Record<string, string> = {
  chase: 'Догонялки',
  infection: 'Заражение',
  dodgeball: 'Догомяч',
};

export default function MultiplayerGame({ roomId, role, mode, currentUser, onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pushRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mouseRef = useRef({ x: W / 2, y: H / 2 });
  const myPosRef = useRef({ x: role === 'host' ? 150 : 550, y: H / 2 });
  const opponentRef = useRef<PlayerState | null>(null);
  const lastTimeRef = useRef(0);
  const gameActiveRef = useRef(true);

  // Chase/Infection: who is "it" (chaser)
  // host = chaser in chase, zombie in infection
  const isChaser = role === 'host';

  // Dodgeball: balls state
  const ballsRef = useRef<{ x: number; y: number; vx: number; vy: number; id: number }[]>([]);
  const ballIdRef = useRef(0);

  const [status, setStatus] = useState<'waiting' | 'playing' | 'finished'>('playing');
  const [result, setResult] = useState('');
  const [opponentName, setOpponentName] = useState('');

  const pushMyPos = useCallback(async () => {
    const p = myPosRef.current;
    const extra: Record<string, unknown> = {};
    if (mode === 'dodgeball') {
      extra.balls = ballsRef.current;
    }
    await roomsApi.update(currentUser.userId, roomId, p.x, p.y, extra);
  }, [currentUser.userId, roomId, mode]);

  const pollState = useCallback(async () => {
    if (!gameActiveRef.current) return;
    const state = await roomsApi.state(currentUser.userId, roomId);
    if (!state || !state.players) return;

    const opp = state.players.find((p: PlayerState) => p.playerId !== currentUser.userId);
    if (opp) {
      opponentRef.current = opp;
      setOpponentName(opp.username);
    }

    if (state.status === 'finished') {
      gameActiveRef.current = false;
      setStatus('finished');
    }
  }, [currentUser.userId, roomId]);

  // Game loop — draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
    };

    const handleClick = (e: MouseEvent) => {
      if (mode !== 'dodgeball') return;
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left) * (W / rect.width);
      const cy = (e.clientY - rect.top) * (H / rect.height);
      const p = myPosRef.current;
      const dx = cx - p.x;
      const dy = cy - p.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d === 0) return;
      ballsRef.current.push({ x: p.x, y: p.y, vx: (dx / d) * 7, vy: (dy / d) * 7, id: ballIdRef.current++ });
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    };

    const drawLabel = (x: number, y: number, label: string, color: string) => {
      ctx.fillStyle = color;
      ctx.font = `bold 10px 'IBM Plex Mono'`;
      ctx.textAlign = 'center';
      ctx.fillText(label.toUpperCase(), x, y - 16);
      ctx.textAlign = 'left';
    };

    const loop = (timestamp: number) => {
      const dt = lastTimeRef.current ? Math.min(timestamp - lastTimeRef.current, 50) : 16;
      lastTimeRef.current = timestamp;

      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, W, H);
      drawGrid();

      // Move my player toward mouse
      const p = myPosRef.current;
      const spd = mode === 'chase' && isChaser ? 3.0 : 3.5;
      const dx = mouseRef.current.x - p.x;
      const dy = mouseRef.current.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        p.x += (dx / dist) * Math.min(dist, spd);
        p.y += (dy / dist) * Math.min(dist, spd);
      }
      p.x = Math.max(12, Math.min(W - 12, p.x));
      p.y = Math.max(12, Math.min(H - 12, p.y));

      // Dodgeball: move balls
      if (mode === 'dodgeball') {
        ballsRef.current = ballsRef.current.filter(b => b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20);
        ballsRef.current.forEach(b => { b.x += b.vx * (dt / 16); b.y += b.vy * (dt / 16); });
      }

      // Collision check (chase/infection: chaser touches runner)
      const opp = opponentRef.current;
      if (opp && gameActiveRef.current && mode !== 'dodgeball') {
        const cdx = p.x - opp.x;
        const cdy = p.y - opp.y;
        const cd = Math.sqrt(cdx * cdx + cdy * cdy);
        if (cd < 22) {
          gameActiveRef.current = false;
          if (isChaser) {
            setResult('Ты поймал соперника! Победа!');
          } else {
            setResult('Тебя поймали! Поражение.');
          }
          setStatus('finished');
          roomsApi.finish(currentUser.userId, roomId);
        }
      }

      // Dodgeball collision
      if (mode === 'dodgeball' && opp && gameActiveRef.current) {
        const oppBalls = (opp.extra?.balls as typeof ballsRef.current) || [];
        oppBalls.forEach(b => {
          const bdx = p.x - b.x;
          const bdy = p.y - b.y;
          if (Math.sqrt(bdx * bdx + bdy * bdy) < 16) {
            gameActiveRef.current = false;
            setResult('Тебя попали мячом! Поражение.');
            setStatus('finished');
            roomsApi.finish(currentUser.userId, roomId);
          }
        });
      }

      // Draw opponent
      if (opp) {
        const oppColor = isChaser ? '#4CAF50' : '#e53935';
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        ctx.beginPath(); ctx.arc(opp.x + 2, opp.y + 2, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = oppColor;
        ctx.beginPath(); ctx.arc(opp.x, opp.y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(opp.x, opp.y, 3, 0, Math.PI * 2); ctx.fill();
        drawLabel(opp.x, opp.y, opp.username, oppColor);

        // Draw opponent balls
        if (mode === 'dodgeball') {
          const oppBalls = (opp.extra?.balls as typeof ballsRef.current) || [];
          ctx.fillStyle = oppColor;
          oppBalls.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill(); });
        }
      }

      // Draw my player
      const myColor = isChaser ? '#e53935' : '#4CAF50';
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath(); ctx.arc(p.x + 2, p.y + 2, 11, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = myColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = myColor;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      drawLabel(p.x, p.y, currentUser.username, myColor);

      // Draw my balls
      if (mode === 'dodgeball') {
        ctx.fillStyle = myColor;
        ballsRef.current.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, Math.PI * 2); ctx.fill(); });
      }

      // HUD
      ctx.fillStyle = '#0d0d0d';
      ctx.font = `500 12px 'IBM Plex Mono'`;
      const roleLabel = mode === 'chase'
        ? (isChaser ? 'DOGONYAET' : 'UBEGAET')
        : mode === 'infection'
        ? (isChaser ? 'ZOMBIE' : 'SURVIVOR')
        : 'PLAYER';
      ctx.fillText(`[ ${currentUser.username} · ${roleLabel} ]`, 12, 22);

      if (!opp) {
        ctx.fillStyle = '#888';
        ctx.font = `500 12px 'IBM Plex Mono'`;
        ctx.textAlign = 'center';
        ctx.fillText('Ожидаю соперника...', W / 2, H / 2);
        ctx.textAlign = 'left';
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    // Start polling
    pollRef.current = setInterval(pollState, POLL_MS * 2);
    pushRef.current = setInterval(pushMyPos, POLL_MS);

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
      cancelAnimationFrame(animRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (pushRef.current) clearInterval(pushRef.current);
    };
  }, [mode, role, isChaser, currentUser, roomId, pollState, pushMyPos]);

  const handleBack = () => {
    gameActiveRef.current = false;
    if (pollRef.current) clearInterval(pollRef.current);
    if (pushRef.current) clearInterval(pushRef.current);
    cancelAnimationFrame(animRef.current);
    onBack();
  };

  return (
    <div className="flex-1 flex flex-col items-center py-6 px-4">
      {/* Top bar */}
      <div className="w-full max-w-[700px] flex items-center justify-between mb-4">
        <button onClick={handleBack} className="flex items-center gap-2 text-[#888] hover:text-[#0d0d0d] transition-colors">
          <Icon name="ArrowLeft" size={14} />
          <span className="font-mono text-xs tracking-widest uppercase">Выйти</span>
        </button>
        <div className="text-center">
          <p className="font-mono text-[10px] text-[#888] tracking-[0.3em] uppercase">{MODE_LABELS[mode]}</p>
          <p className="font-mono text-xs text-[#0d0d0d] tracking-widest">
            {opponentName ? `vs ${opponentName}` : 'Ожидание...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${status === 'playing' ? 'bg-green-500 animate-pulse' : 'bg-[#aaa]'}`} />
          <span className="font-mono text-[10px] text-[#888] tracking-widest uppercase">
            {status === 'playing' ? 'LIVE' : 'END'}
          </span>
        </div>
      </div>

      {/* Role hint */}
      <div className="w-full max-w-[700px] mb-3 flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${isChaser ? 'bg-[#e53935]' : 'bg-[#4CAF50]'}`} />
        <span className="font-mono text-[10px] tracking-widest uppercase text-[#888]">
          {mode === 'chase'
            ? (isChaser ? 'Ты догоняешь — поймай соперника' : 'Ты убегаешь — не дай себя поймать')
            : mode === 'infection'
            ? (isChaser ? 'Ты зомби — заразись о соперника' : 'Ты выживший — не дай себя заразить')
            : (isChaser ? 'Кидай мячи кликом — попади в соперника' : 'Уворачивайся от мячей соперника')}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative border border-[#e0e0e0]">
        <canvas ref={canvasRef} width={W} height={H} className="block max-w-full" />

        {/* Result overlay */}
        {status === 'finished' && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f5f5f5]/90">
            <div className="text-center border border-[#e0e0e0] bg-white px-10 py-8">
              <p className="font-mono text-[10px] text-[#888] tracking-[0.3em] uppercase mb-3">GAME OVER</p>
              <p className="font-rajdhani font-bold text-2xl text-[#0d0d0d] tracking-widest mb-6">{result}</p>
              <button
                onClick={handleBack}
                className="px-6 py-2.5 bg-[#0d0d0d] text-[#f5f5f5] font-mono text-xs tracking-widest uppercase hover:bg-[#333] transition-colors"
              >
                В меню
              </button>
            </div>
          </div>
        )}
      </div>

      {mode === 'dodgeball' && status === 'playing' && (
        <p className="font-mono text-[10px] text-[#aaa] tracking-widest mt-3 uppercase">
          Клик на canvas — бросить мяч
        </p>
      )}
    </div>
  );
}