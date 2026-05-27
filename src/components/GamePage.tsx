import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';

type GameState = 'idle' | 'playing' | 'gameover';
type Difficulty = 'easy' | 'normal' | 'hard';

interface Player {
  x: number; y: number; size: number;
}
interface Enemy {
  x: number; y: number; size: number; speed: number; id: number;
}
interface Particle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number;
}
interface ScorePopup {
  x: number; y: number; value: number; life: number;
}

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; enemySpeed: number; spawnInterval: number; maxEnemies: number }> = {
  easy:   { label: 'ЛЁГКИЙ',   enemySpeed: 1.2, spawnInterval: 2200, maxEnemies: 3 },
  normal: { label: 'СРЕДНИЙ',  enemySpeed: 1.8, spawnInterval: 1800, maxEnemies: 5 },
  hard:   { label: 'СЛОЖНЫЙ',  enemySpeed: 2.6, spawnInterval: 1200, maxEnemies: 8 },
};

export default function GamePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const gameStateRef = useRef<GameState>('idle');
  const playerRef = useRef<Player>({ x: 300, y: 300, size: 10 });
  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const popupsRef = useRef<ScorePopup[]>([]);
  const scoreRef = useRef(0);
  const timerRef = useRef(0);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const enemyIdRef = useRef(0);
  const mouseRef = useRef({ x: 300, y: 300 });
  const difficultyRef = useRef<Difficulty>('normal');

  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [survivedTime, setSurvivedTime] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [bestScore, setBestScore] = useState(() => {
    return parseInt(localStorage.getItem('zg_best') || '0', 10);
  });

  const W = 700;
  const H = 480;

  const spawnEnemy = useCallback(() => {
    const cfg = DIFFICULTY_CONFIG[difficultyRef.current];
    if (enemiesRef.current.length >= cfg.maxEnemies) return;
    const side = Math.floor(Math.random() * 4);
    let x = 0, y = 0;
    if (side === 0) { x = Math.random() * W; y = -15; }
    else if (side === 1) { x = W + 15; y = Math.random() * H; }
    else if (side === 2) { x = Math.random() * W; y = H + 15; }
    else { x = -15; y = Math.random() * H; }
    enemiesRef.current.push({
      x, y, size: 8, speed: cfg.enemySpeed + Math.random() * 0.5, id: enemyIdRef.current++
    });
  }, []);

  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 10; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        life: 1, maxLife: 0.6 + Math.random() * 0.4,
      });
    }
  };

  const startGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    playerRef.current = { x: W / 2, y: H / 2, size: 10 };
    mouseRef.current = { x: W / 2, y: H / 2 };
    enemiesRef.current = [];
    particlesRef.current = [];
    popupsRef.current = [];
    scoreRef.current = 0;
    timerRef.current = 0;
    spawnTimerRef.current = 0;
    lastTimeRef.current = 0;
    gameStateRef.current = 'playing';
    setGameState('playing');
    setScore(0);
  }, []);

  const endGame = useCallback(() => {
    const s = scoreRef.current;
    const t = Math.floor(timerRef.current / 1000);
    gameStateRef.current = 'gameover';
    setGameState('gameover');
    setFinalScore(s);
    setSurvivedTime(t);
    if (s > bestScore) {
      setBestScore(s);
      localStorage.setItem('zg_best', String(s));
    }
  }, [bestScore]);

  useEffect(() => {
    difficultyRef.current = difficulty;
  }, [difficulty]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      mouseRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };
    canvas.addEventListener('mousemove', handleMouseMove);

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x <= W; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    };

    const loop = (timestamp: number) => {
      const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, W, H);
      drawGrid();

      if (gameStateRef.current !== 'playing') {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      timerRef.current += dt;
      spawnTimerRef.current += dt;

      const cfg = DIFFICULTY_CONFIG[difficultyRef.current];
      if (spawnTimerRef.current >= cfg.spawnInterval) {
        spawnTimerRef.current = 0;
        spawnEnemy();
      }

      // Score for survival
      scoreRef.current += dt * 0.02;
      setScore(Math.floor(scoreRef.current));

      // Move player toward mouse
      const p = playerRef.current;
      const dx = mouseRef.current.x - p.x;
      const dy = mouseRef.current.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const playerSpeed = 3.5;
      if (dist > 2) {
        p.x += (dx / dist) * Math.min(dist, playerSpeed);
        p.y += (dy / dist) * Math.min(dist, playerSpeed);
      }
      p.x = Math.max(p.size, Math.min(W - p.size, p.x));
      p.y = Math.max(p.size, Math.min(H - p.size, p.y));

      // Move enemies
      enemiesRef.current.forEach((e) => {
        const edx = p.x - e.x;
        const edy = p.y - e.y;
        const ed = Math.sqrt(edx * edx + edy * edy);
        if (ed > 0) {
          e.x += (edx / ed) * e.speed;
          e.y += (edy / ed) * e.speed;
        }

        // Collision detection
        if (ed < p.size + e.size - 2) {
          spawnParticles(p.x, p.y, '#0d0d0d');
          endGame();
        }
      });

      // Draw particles
      particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);
      particlesRef.current.forEach((pt) => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= dt / (pt.maxLife * 1000);
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
        ctx.globalAlpha = 1;
      });

      // Draw score popups
      popupsRef.current = popupsRef.current.filter(pp => pp.life > 0);
      popupsRef.current.forEach((pp) => {
        pp.y -= 0.5;
        pp.life -= dt / 1500;
        ctx.globalAlpha = pp.life;
        ctx.fillStyle = '#0d0d0d';
        ctx.font = `bold 12px 'IBM Plex Mono'`;
        ctx.fillText(`+${pp.value}`, pp.x, pp.y);
        ctx.globalAlpha = 1;
      });

      // Draw enemies
      enemiesRef.current.forEach((e) => {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        ctx.fillRect(e.x - e.size + 2, e.y - e.size + 2, e.size * 2, e.size * 2);
        // Body
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(e.x - e.size, e.y - e.size, e.size * 2, e.size * 2);
        // Inner dot
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
      });

      // Draw player
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath();
      ctx.arc(p.x + 2, p.y + 2, p.size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#0d0d0d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#0d0d0d';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();

      // HUD
      ctx.fillStyle = '#0d0d0d';
      ctx.font = `500 13px 'IBM Plex Mono'`;
      ctx.fillText(`ОЧКИ: ${Math.floor(scoreRef.current)}`, 14, 24);
      ctx.fillStyle = '#888888';
      ctx.fillText(`ВРЕМЯ: ${Math.floor(timerRef.current / 1000)}с`, 14, 44);
      ctx.fillText(`ВРАГИ: ${enemiesRef.current.length}`, W - 100, 24);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousemove', handleMouseMove);
    };
  }, [spawnEnemy, endGame]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 px-6">
      {/* Canvas wrapper */}
      <div className="relative w-full max-w-[700px]">
        <canvas
          ref={canvasRef}
          id="gameCanvas"
          width={W}
          height={H}
          className="w-full border border-[#e0e0e0]"
          style={{ aspectRatio: `${W}/${H}` }}
        />

        {/* IDLE overlay */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-[#f5f5f5]/95 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-12 h-0.5 bg-[#0d0d0d] mb-6" />
            <h1 className="font-rajdhani text-5xl font-bold tracking-[0.15em] text-[#0d0d0d] uppercase mb-2">
              ZG CORP
            </h1>
            <p className="font-mono text-xs text-[#888888] tracking-widest mb-10 uppercase">
              MODE_01 — ДОГОНЯЛКИ
            </p>

            {/* Difficulty */}
            <div className="flex gap-2 mb-8">
              {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`px-4 py-2 text-xs font-mono tracking-widest border transition-all uppercase ${
                    difficulty === d
                      ? 'bg-[#0d0d0d] text-[#f5f5f5] border-[#0d0d0d]'
                      : 'bg-transparent text-[#888888] border-[#e0e0e0] hover:border-[#0d0d0d] hover:text-[#0d0d0d]'
                  }`}
                >
                  {DIFFICULTY_CONFIG[d].label}
                </button>
              ))}
            </div>

            <button
              onClick={startGame}
              className="px-12 py-3 bg-[#0d0d0d] text-[#f5f5f5] font-rajdhani font-semibold text-sm tracking-[0.2em] uppercase hover:bg-[#333] transition-colors"
            >
              НАЧАТЬ ИГРУ
            </button>

            {bestScore > 0 && (
              <p className="font-mono text-xs text-[#888888] mt-6 tracking-wider">
                РЕКОРД: {bestScore}
              </p>
            )}
            <div className="w-12 h-0.5 bg-[#e0e0e0] mt-6" />
          </div>
        )}

        {/* GAME OVER overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-[#f5f5f5]/95 flex flex-col items-center justify-center animate-scale-in">
            <div className="w-12 h-0.5 bg-[#0d0d0d] mb-6" />
            <p className="font-mono text-xs tracking-[0.3em] text-[#888888] uppercase mb-2">
              GAME OVER
            </p>
            <p className="font-rajdhani text-6xl font-bold text-[#0d0d0d] tracking-wider mb-1">
              {finalScore}
            </p>
            <p className="font-mono text-xs text-[#888888] tracking-widest mb-2">
              ОЧКОВ
            </p>
            <p className="font-mono text-xs text-[#aaaaaa] tracking-wider mb-8">
              ВЫЖИЛ {survivedTime} СЕК · СЛОЖНОСТЬ {DIFFICULTY_CONFIG[difficulty].label}
            </p>

            {finalScore >= bestScore && finalScore > 0 && (
              <div className="flex items-center gap-2 mb-6 px-4 py-2 border border-[#0d0d0d]">
                <Icon name="Trophy" size={14} />
                <span className="font-mono text-xs tracking-widest uppercase">Новый рекорд!</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={startGame}
                className="px-10 py-3 bg-[#0d0d0d] text-[#f5f5f5] font-rajdhani font-semibold text-sm tracking-[0.2em] uppercase hover:bg-[#333] transition-colors"
              >
                ЗАНОВО
              </button>
              <button
                onClick={() => setGameState('idle')}
                className="px-6 py-3 border border-[#e0e0e0] text-[#888888] font-rajdhani font-semibold text-sm tracking-[0.15em] uppercase hover:border-[#0d0d0d] hover:text-[#0d0d0d] transition-colors"
              >
                МЕНЮ
              </button>
            </div>

            {bestScore > 0 && (
              <p className="font-mono text-xs text-[#cccccc] mt-6 tracking-wider">
                РЕКОРД: {bestScore}
              </p>
            )}
            <div className="w-12 h-0.5 bg-[#e0e0e0] mt-6" />
          </div>
        )}
      </div>

      {/* Controls hint */}
      {gameState === 'playing' && (
        <p className="font-mono text-xs text-[#cccccc] tracking-widest mt-4 uppercase animate-fade-in">
          Двигай мышью — уходи от врагов
        </p>
      )}
    </div>
  );
}
