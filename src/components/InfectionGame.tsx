import { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '@/components/ui/icon';

type Role = 'zombie' | 'survivor';
type GameState = 'idle' | 'role_select' | 'playing' | 'gameover';

interface Entity {
  x: number; y: number; vx: number; vy: number; size: number;
  infected: boolean; id: number; speed: number;
  wanderAngle: number;
}

const W = 700;
const H = 480;
const BOT_COUNT = 12;
const INFECTION_RADIUS = 28;

export default function InfectionGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const stateRef = useRef<GameState>('idle');
  const roleRef = useRef<Role>('survivor');
  const mouseRef = useRef({ x: W / 2, y: H / 2 });
  const playerRef = useRef<Entity>({
    x: W / 2, y: H / 2, vx: 0, vy: 0, size: 10, infected: false, id: 0, speed: 3.2,
  });
  const botsRef = useRef<Entity[]>([]);
  const timerRef = useRef(0);
  const lastTimeRef = useRef(0);
  const scoreRef = useRef(0);
  const infectedCountRef = useRef(0);

  const [gameState, setGameState] = useState<GameState>('idle');
  const [role, setRole] = useState<Role>('survivor');
  const [finalScore, setFinalScore] = useState(0);
  const [survivedTime, setSurvivedTime] = useState(0);
  const [result, setResult] = useState<'win' | 'lose'>('lose');
  const [bestScore, setBestScore] = useState(() =>
    parseInt(localStorage.getItem('zg_infection_best') || '0', 10)
  );

  const spawnBots = useCallback((playerRole: Role) => {
    const bots: Entity[] = [];
    for (let i = 1; i <= BOT_COUNT; i++) {
      let x: number, y: number;
      do {
        x = 30 + Math.random() * (W - 60);
        y = 30 + Math.random() * (H - 60);
      } while (Math.hypot(x - W / 2, y - H / 2) < 80);

      // If player is zombie — all bots are survivors; if player is survivor — one random bot is zombie
      const infected = playerRole === 'survivor' && i === 1;
      bots.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: 8, infected,
        id: i,
        speed: 1.2 + Math.random() * 0.6,
        wanderAngle: Math.random() * Math.PI * 2,
      });
    }
    return bots;
  }, []);

  const startGame = useCallback((selectedRole: Role) => {
    roleRef.current = selectedRole;
    playerRef.current = {
      x: W / 2, y: H / 2, vx: 0, vy: 0, size: 10,
      infected: selectedRole === 'zombie',
      id: 0, speed: 3.2,
    };
    mouseRef.current = { x: W / 2, y: H / 2 };
    botsRef.current = spawnBots(selectedRole);
    timerRef.current = 0;
    lastTimeRef.current = 0;
    scoreRef.current = 0;
    infectedCountRef.current = selectedRole === 'zombie' ? 1 : 1;
    stateRef.current = 'playing';
    setGameState('playing');
    setRole(selectedRole);
  }, [spawnBots]);

  const endGame = useCallback((win: boolean) => {
    const s = scoreRef.current;
    const t = Math.floor(timerRef.current / 1000);
    stateRef.current = 'gameover';
    setGameState('gameover');
    setFinalScore(s);
    setSurvivedTime(t);
    setResult(win ? 'win' : 'lose');
    if (s > bestScore) {
      setBestScore(s);
      localStorage.setItem('zg_infection_best', String(s));
    }
  }, [bestScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
    };
    canvas.addEventListener('mousemove', onMouseMove);

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(0,0,0,0.04)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    };

    const drawEntity = (e: Entity, isPlayer = false) => {
      const color = e.infected ? '#1a1a1a' : '#ffffff';
      const border = e.infected ? '#0d0d0d' : '#0d0d0d';
      const innerDot = e.infected ? '#555555' : '#0d0d0d';

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.arc(e.x + 2, e.y + 2, e.size, 0, Math.PI * 2);
      ctx.fill();

      // Body
      if (e.infected) {
        // Zombie — filled black square with slight rotation
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(Math.PI / 6);
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(-e.size, -e.size, e.size * 2, e.size * 2);
        ctx.fillStyle = '#444';
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      } else {
        // Survivor — white circle with border
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = border;
        ctx.lineWidth = isPlayer ? 2.5 : 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(e.x, e.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = innerDot;
        ctx.fill();
      }

      // Player indicator ring
      if (isPlayer) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size + 5, 0, Math.PI * 2);
        ctx.strokeStyle = e.infected ? 'rgba(13,13,13,0.25)' : 'rgba(13,13,13,0.15)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const loop = (timestamp: number) => {
      const dt = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, W, H);
      drawGrid();

      if (stateRef.current !== 'playing') {
        animFrameRef.current = requestAnimationFrame(loop);
        return;
      }

      timerRef.current += dt;
      scoreRef.current += dt * 0.015;

      const p = playerRef.current;
      const role = roleRef.current;

      // Move player toward mouse
      const dx = mouseRef.current.x - p.x;
      const dy = mouseRef.current.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) {
        p.x += (dx / dist) * Math.min(dist, p.speed);
        p.y += (dy / dist) * Math.min(dist, p.speed);
      }
      p.x = Math.max(p.size, Math.min(W - p.size, p.x));
      p.y = Math.max(p.size, Math.min(H - p.size, p.y));

      // Move bots with flocking + flee/chase logic
      botsRef.current.forEach((bot) => {
        let fx = 0, fy = 0;

        const FLEE_RADIUS = 120; // реагируют только на близкие угрозы

        if (bot.infected) {
          // Zombie bot: chase nearest survivor
          let nearest: Entity | null = null;
          let nearestDist = Infinity;
          botsRef.current.forEach((other) => {
            if (!other.infected) {
              const d = Math.hypot(other.x - bot.x, other.y - bot.y);
              if (d < nearestDist) { nearestDist = d; nearest = other; }
            }
          });
          if (role === 'survivor') {
            const dp = Math.hypot(p.x - bot.x, p.y - bot.y);
            if (dp < nearestDist) { nearest = p; nearestDist = dp; }
          }
          if (nearest) {
            fx = nearest.x - bot.x;
            fy = nearest.y - bot.y;
            const fd = Math.hypot(fx, fy);
            if (fd > 0) { fx /= fd; fy /= fd; }
          }
        } else {
          // Survivor bot: wander + flee threats in radius
          // 1. Wander — постоянное плавное блуждание
          bot.wanderAngle += (Math.random() - 0.5) * 0.4;
          const wanderStrength = 0.5;
          fx += Math.cos(bot.wanderAngle) * wanderStrength;
          fy += Math.sin(bot.wanderAngle) * wanderStrength;

          // 2. Flee threats within radius
          let fleeX = 0, fleeY = 0;
          let threatened = false;
          botsRef.current.forEach((other) => {
            if (!other.infected) return;
            const d = Math.hypot(other.x - bot.x, other.y - bot.y);
            if (d < FLEE_RADIUS && d > 0) {
              const weight = (FLEE_RADIUS - d) / FLEE_RADIUS; // ближе = сильнее
              fleeX += ((bot.x - other.x) / d) * weight;
              fleeY += ((bot.y - other.y) / d) * weight;
              threatened = true;
            }
          });
          if (role === 'zombie') {
            const dp = Math.hypot(p.x - bot.x, p.y - bot.y);
            if (dp < FLEE_RADIUS && dp > 0) {
              const weight = (FLEE_RADIUS - dp) / FLEE_RADIUS;
              fleeX += ((bot.x - p.x) / dp) * weight;
              fleeY += ((bot.y - p.y) / dp) * weight;
              threatened = true;
            }
          }
          if (threatened) {
            fx = fleeX * 2.5; // бегут быстрее при угрозе
            fy = fleeY * 2.5;
          }

          // 3. Wall repulsion — плавно отворачивают от стен
          const wallMargin = 60;
          if (bot.x < wallMargin)       fx += (wallMargin - bot.x) / wallMargin * 1.5;
          if (bot.x > W - wallMargin)   fx -= (bot.x - (W - wallMargin)) / wallMargin * 1.5;
          if (bot.y < wallMargin)       fy += (wallMargin - bot.y) / wallMargin * 1.5;
          if (bot.y > H - wallMargin)   fy -= (bot.y - (H - wallMargin)) / wallMargin * 1.5;
        }

        // Separation from all bots
        botsRef.current.forEach((other) => {
          if (other.id === bot.id) return;
          const sd = Math.hypot(bot.x - other.x, bot.y - other.y);
          if (sd < 22 && sd > 0) {
            fx += ((bot.x - other.x) / sd) * 0.6;
            fy += ((bot.y - other.y) / sd) * 0.6;
          }
        });

        // Smoother inertia for survivors, snappier for zombies
        const inertia = bot.infected ? 0.8 : 0.88;
        bot.vx = bot.vx * inertia + fx * bot.speed * (1 - inertia);
        bot.vy = bot.vy * inertia + fy * bot.speed * (1 - inertia);
        const spd = Math.hypot(bot.vx, bot.vy);
        if (spd > bot.speed) { bot.vx = (bot.vx / spd) * bot.speed; bot.vy = (bot.vy / spd) * bot.speed; }

        bot.x += bot.vx;
        bot.y += bot.vy;
        // Hard clamp (last resort)
        bot.x = Math.max(bot.size + 2, Math.min(W - bot.size - 2, bot.x));
        bot.y = Math.max(bot.size + 2, Math.min(H - bot.size - 2, bot.y));
        // Bounce off walls to break out of corners
        if (bot.x <= bot.size + 2 || bot.x >= W - bot.size - 2) bot.vx *= -0.6;
        if (bot.y <= bot.size + 2 || bot.y >= H - bot.size - 2) bot.vy *= -0.6;
      });

      // Infection spread between bots
      botsRef.current.forEach((bot) => {
        if (!bot.infected) return;
        botsRef.current.forEach((other) => {
          if (other.infected) return;
          if (Math.hypot(bot.x - other.x, bot.y - other.y) < INFECTION_RADIUS) {
            other.infected = true;
          }
        });
      });

      // Player infection logic
      if (role === 'zombie') {
        // Player infects nearby survivors
        botsRef.current.forEach((bot) => {
          if (!bot.infected && Math.hypot(p.x - bot.x, p.y - bot.y) < INFECTION_RADIUS) {
            bot.infected = true;
            scoreRef.current += 50;
          }
        });
        // Win: all infected
        const allInfected = botsRef.current.every((b) => b.infected);
        if (allInfected) endGame(true);
      } else {
        // Player gets infected by zombie bot
        botsRef.current.forEach((bot) => {
          if (bot.infected && !p.infected && Math.hypot(p.x - bot.x, p.y - bot.y) < p.size + bot.size) {
            p.infected = true;
            endGame(false);
          }
        });
        // Survivor: score for time alive, win if all zombie bots die (they don't — so win = survive N seconds)
        // Win condition: survive 60 seconds
        if (timerRef.current >= 60000) endGame(true);
      }

      // Count infections for HUD
      infectedCountRef.current = botsRef.current.filter((b) => b.infected).length + (p.infected ? 1 : 0);

      // Draw infection radius preview (for zombie player)
      if (role === 'zombie' && !p.infected) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, INFECTION_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw bots
      botsRef.current.forEach((bot) => drawEntity(bot));
      // Draw player
      drawEntity(p, true);

      // HUD
      ctx.fillStyle = '#0d0d0d';
      ctx.font = `500 12px 'IBM Plex Mono'`;
      ctx.fillText(`ОЧКИ: ${Math.floor(scoreRef.current)}`, 14, 24);
      ctx.fillStyle = '#888888';
      ctx.fillText(`ВРЕМЯ: ${Math.floor(timerRef.current / 1000)}с`, 14, 42);

      const infected = botsRef.current.filter(b => b.infected).length + (role === 'zombie' ? 1 : 0);
      const total = botsRef.current.length + 1;
      ctx.fillStyle = '#0d0d0d';
      ctx.fillText(`ЗАРАЖЕНО: ${infected}/${total}`, W - 150, 24);

      if (role === 'survivor') {
        const remaining = Math.max(0, 60 - Math.floor(timerRef.current / 1000));
        ctx.fillStyle = remaining < 10 ? '#0d0d0d' : '#aaaaaa';
        ctx.fillText(`ДО ПОБЕДЫ: ${remaining}с`, W - 150, 42);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [endGame]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 px-6">
      <div className="relative w-full max-w-[700px]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full border border-[#e0e0e0]"
          style={{ aspectRatio: `${W}/${H}`, cursor: 'crosshair' }}
        />

        {/* IDLE overlay */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-[#f5f5f5]/96 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-12 h-0.5 bg-[#0d0d0d] mb-6" />
            <p className="font-mono text-xs text-[#888888] tracking-[0.3em] uppercase mb-2">MODE_02</p>
            <h1 className="font-rajdhani text-5xl font-bold tracking-[0.15em] text-[#0d0d0d] uppercase mb-2">
              ЗАРАЖЕНИЕ
            </h1>
            <p className="font-mono text-xs text-[#aaaaaa] tracking-widest mb-10 uppercase">
              Выбери роль и начни игру
            </p>

            {/* Role cards */}
            <div className="flex gap-4 mb-8 w-full max-w-sm">
              {/* Zombie */}
              <button
                onClick={() => startGame('zombie')}
                className="flex-1 border border-[#0d0d0d] bg-[#0d0d0d] text-[#f5f5f5] p-5 flex flex-col items-center gap-3 hover:bg-[#222] transition-colors group"
              >
                <div className="w-8 h-8 bg-[#f5f5f5] rotate-12 group-hover:rotate-6 transition-transform" />
                <div>
                  <p className="font-rajdhani font-bold text-base tracking-widest uppercase">Зомби</p>
                  <p className="font-mono text-[10px] text-[#888888] tracking-wider mt-1">
                    Заражай всех
                  </p>
                </div>
              </button>

              {/* Survivor */}
              <button
                onClick={() => startGame('survivor')}
                className="flex-1 border border-[#e0e0e0] bg-transparent text-[#0d0d0d] p-5 flex flex-col items-center gap-3 hover:border-[#0d0d0d] transition-colors group"
              >
                <div className="w-8 h-8 rounded-full border-2 border-[#0d0d0d] flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#0d0d0d]" />
                </div>
                <div>
                  <p className="font-rajdhani font-bold text-base tracking-widest uppercase">Выживший</p>
                  <p className="font-mono text-[10px] text-[#888888] tracking-wider mt-1">
                    Продержись 60 сек
                  </p>
                </div>
              </button>
            </div>

            {bestScore > 0 && (
              <p className="font-mono text-xs text-[#888888] tracking-wider">
                РЕКОРД: {bestScore}
              </p>
            )}
            <div className="w-12 h-0.5 bg-[#e0e0e0] mt-6" />
          </div>
        )}

        {/* GAME OVER overlay */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-[#f5f5f5]/96 flex flex-col items-center justify-center animate-scale-in">
            <div className="w-12 h-0.5 bg-[#0d0d0d] mb-6" />
            <p className="font-mono text-xs tracking-[0.3em] text-[#888888] uppercase mb-2">
              {result === 'win' ? 'ПОБЕДА' : 'КОНЕЦ ИГРЫ'}
            </p>
            <p className="font-rajdhani text-6xl font-bold text-[#0d0d0d] tracking-wider mb-1">
              {finalScore}
            </p>
            <p className="font-mono text-xs text-[#888888] tracking-widest mb-2">ОЧКОВ</p>
            <p className="font-mono text-xs text-[#aaaaaa] tracking-wider mb-8">
              {survivedTime} СЕК · {role === 'zombie' ? 'ЗОМБИ' : 'ВЫЖИВШИЙ'}
            </p>

            {finalScore >= bestScore && finalScore > 0 && (
              <div className="flex items-center gap-2 mb-6 px-4 py-2 border border-[#0d0d0d]">
                <Icon name="Trophy" size={14} />
                <span className="font-mono text-xs tracking-widest uppercase">Новый рекорд!</span>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setGameState('idle')}
                className="px-10 py-3 bg-[#0d0d0d] text-[#f5f5f5] font-rajdhani font-semibold text-sm tracking-[0.2em] uppercase hover:bg-[#333] transition-colors"
              >
                СМЕНИТЬ РОЛЬ
              </button>
              <button
                onClick={() => startGame(role)}
                className="px-6 py-3 border border-[#e0e0e0] text-[#888888] font-rajdhani font-semibold text-sm tracking-[0.15em] uppercase hover:border-[#0d0d0d] hover:text-[#0d0d0d] transition-colors"
              >
                ЕЩЁ РАЗ
              </button>
            </div>
            <div className="w-12 h-0.5 bg-[#e0e0e0] mt-6" />
          </div>
        )}
      </div>

      {gameState === 'playing' && (
        <p className="font-mono text-xs text-[#cccccc] tracking-widest mt-4 uppercase animate-fade-in">
          {role === 'zombie'
            ? 'Подходи к выжившим — заражай их'
            : 'Избегай зомби — продержись 60 секунд'}
        </p>
      )}
    </div>
  );
}