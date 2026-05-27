import { useEffect, useRef, useState, useCallback } from 'react';

type GameState = 'idle' | 'playing';
type Role = 'it' | 'runner'; // it = вода, runner = игрок

interface Bot {
  x: number; y: number; vx: number; vy: number;
  id: number; isIt: boolean; speed: number;
  wanderAngle: number; size: number;
}

interface Ball {
  x: number; y: number; vx: number; vy: number;
  ownerId: number; // кто бросил (-1 = игрок)
  life: number; // ms до исчезновения
}

interface Particle {
  x: number; y: number; vx: number; vy: number; life: number;
}

interface FloatText {
  x: number; y: number; text: string; life: number; color: string;
}

const W = 700;
const H = 480;
const BOT_COUNT = 10;
const BALL_SPEED = 6;
const BALL_LIFE = 1800;
const BALL_RADIUS = 6;
const BOT_FLEE_RADIUS = 140;
const PLAYER_SIZE = 11;
const BOT_SIZE = 9;

export default function DodgeballGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const stateRef = useRef<GameState>('idle');
  const mouseRef = useRef({ x: W / 2, y: H / 2 });
  const clickRef = useRef<{ x: number; y: number } | null>(null);

  const playerRef = useRef({ x: W / 2, y: H / 2, isIt: false, size: PLAYER_SIZE });
  const botsRef = useRef<Bot[]>([]);
  const ballsRef = useRef<Ball[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatTextsRef = useRef<FloatText[]>([]);

  const timerRef = useRef(0);
  const lastTimeRef = useRef(0);
  const itTimeRef = useRef(0); // сколько времени игрок был водой
  const scoreRef = useRef(0);
  const botThrowTimers = useRef<Record<number, number>>({});

  const [gameState, setGameState] = useState<GameState>('idle');
  const [isPlayerIt, setIsPlayerIt] = useState(false);
  const [score, setScore] = useState(0);
  const [itTime, setItTime] = useState(0);
  const [bestScore, setBestScore] = useState(() =>
    parseInt(localStorage.getItem('zg_dodgeball_best') || '0', 10)
  );

  const spawnParticles = (x: number, y: number) => {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
      particlesRef.current.push({
        x, y,
        vx: Math.cos(angle) * (2 + Math.random() * 3),
        vy: Math.sin(angle) * (2 + Math.random() * 3),
        life: 1,
      });
    }
  };

  const addFloat = (x: number, y: number, text: string, color = '#0d0d0d') => {
    floatTextsRef.current.push({ x, y, text, life: 1, color });
  };

  const makeItBot = (excludeId?: number) => {
    const runners = botsRef.current.filter(b => !b.isIt && b.id !== excludeId);
    if (runners.length === 0) return;
    botsRef.current.forEach(b => b.isIt = false);
    const target = runners[Math.floor(Math.random() * runners.length)];
    target.isIt = true;
  };

  const spawnBots = useCallback(() => {
    const bots: Bot[] = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      let x: number, y: number;
      do {
        x = 40 + Math.random() * (W - 80);
        y = 40 + Math.random() * (H - 80);
      } while (Math.hypot(x - W / 2, y - H / 2) < 100);
      bots.push({
        x, y, vx: 0, vy: 0,
        id: i + 1,
        isIt: i === 0,
        speed: 1.4 + Math.random() * 0.5,
        wanderAngle: Math.random() * Math.PI * 2,
        size: BOT_SIZE,
      });
      botThrowTimers.current[i + 1] = 2000 + Math.random() * 2000;
    }
    return bots;
  }, []);

  const startGame = useCallback(() => {
    playerRef.current = { x: W / 2, y: H / 2, isIt: false, size: PLAYER_SIZE };
    mouseRef.current = { x: W / 2, y: H / 2 };
    botsRef.current = spawnBots() ?? [];
    ballsRef.current = [];
    particlesRef.current = [];
    floatTextsRef.current = [];
    timerRef.current = 0;
    itTimeRef.current = 0;
    scoreRef.current = 0;
    lastTimeRef.current = 0;
    stateRef.current = 'playing';
    setGameState('playing');
    setIsPlayerIt(false);
    setScore(0);
    setItTime(0);
  }, [spawnBots]);

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

    const onClick = (e: MouseEvent) => {
      if (stateRef.current !== 'playing') return;
      if (!playerRef.current.isIt) return;
      const rect = canvas.getBoundingClientRect();
      clickRef.current = {
        x: (e.clientX - rect.left) * (W / rect.width),
        y: (e.clientY - rect.top) * (H / rect.height),
      };
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('click', onClick);

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(0,0,0,0.035)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    };

    const drawBall = (ball: Ball) => {
      const alpha = Math.min(1, ball.life / 400);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#0d0d0d';
      ctx.fill();
      // trail
      ctx.beginPath();
      ctx.arc(ball.x - ball.vx * 1.5, ball.y - ball.vy * 1.5, BALL_RADIUS * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#555';
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const drawBot = (bot: Bot) => {
      const shadow = 'rgba(0,0,0,0.06)';
      ctx.fillStyle = shadow;
      ctx.beginPath(); ctx.arc(bot.x + 2, bot.y + 2, bot.size, 0, Math.PI * 2); ctx.fill();

      if (bot.isIt) {
        // Вода — чёрный квадрат с крестом
        ctx.save();
        ctx.translate(bot.x, bot.y);
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(-bot.size, -bot.size, bot.size * 2, bot.size * 2);
        ctx.strokeStyle = '#f5f5f5';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, 4); ctx.stroke();
        ctx.restore();

        // Glow ring
        ctx.beginPath(); ctx.arc(bot.x, bot.y, bot.size + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(bot.x, bot.y, bot.size, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(bot.x, bot.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0d0d0d'; ctx.fill();
      }
    };

    const drawPlayer = () => {
      const p = playerRef.current;
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.beginPath(); ctx.arc(p.x + 2, p.y + 2, p.size, 0, Math.PI * 2); ctx.fill();

      if (p.isIt) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.strokeStyle = '#f5f5f5'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(5, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 5); ctx.stroke();
        ctx.restore();
        // Aim line toward mouse
        const dx = mouseRef.current.x - p.x;
        const dy = mouseRef.current.y - p.y;
        const d = Math.hypot(dx, dy);
        if (d > 0) {
          ctx.save();
          ctx.setLineDash([4, 6]);
          ctx.strokeStyle = 'rgba(0,0,0,0.2)';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + (dx / d) * 80, p.y + (dy / d) * 80);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = '#0d0d0d'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#0d0d0d'; ctx.fill();
      }

      // Player ring indicator
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size + 5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1; ctx.stroke();
    };

    const loop = (timestamp: number) => {
      const dt = Math.min(lastTimeRef.current ? timestamp - lastTimeRef.current : 16, 50);
      lastTimeRef.current = timestamp;

      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, W, H);
      drawGrid();

      if (stateRef.current !== 'playing') {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      timerRef.current += dt;
      const p = playerRef.current;

      // Score for time running (not it)
      if (!p.isIt) {
        scoreRef.current += dt * 0.02;
        setScore(Math.floor(scoreRef.current));
      } else {
        itTimeRef.current += dt;
        setItTime(Math.floor(itTimeRef.current / 1000));
      }

      // Move player
      const pdx = mouseRef.current.x - p.x;
      const pdy = mouseRef.current.y - p.y;
      const pd = Math.hypot(pdx, pdy);
      if (pd > 2) {
        const spd = p.isIt ? 3.6 : 3.2;
        p.x += (pdx / pd) * Math.min(pd, spd);
        p.y += (pdy / pd) * Math.min(pd, spd);
      }
      p.x = Math.max(p.size, Math.min(W - p.size, p.x));
      p.y = Math.max(p.size, Math.min(H - p.size, p.y));

      // Player throws ball on click
      if (clickRef.current && p.isIt) {
        const tx = clickRef.current.x - p.x;
        const ty = clickRef.current.y - p.y;
        const td = Math.hypot(tx, ty);
        if (td > 0) {
          ballsRef.current.push({
            x: p.x, y: p.y,
            vx: (tx / td) * BALL_SPEED,
            vy: (ty / td) * BALL_SPEED,
            ownerId: -1, life: BALL_LIFE,
          });
        }
        clickRef.current = null;
      }

      // Bot AI
      botsRef.current.forEach((bot) => {
        let fx = 0, fy = 0;

        if (bot.isIt) {
          // Вода-бот: гонится за ближайшим игроком/ботом
          let nearest: { x: number; y: number } | null = null;
          let nearestD = Infinity;
          botsRef.current.forEach(o => {
            if (o.isIt) return;
            const d = Math.hypot(o.x - bot.x, o.y - bot.y);
            if (d < nearestD) { nearestD = d; nearest = o; }
          });
          // chase player if not it
          if (!p.isIt) {
            const dp = Math.hypot(p.x - bot.x, p.y - bot.y);
            if (dp < nearestD) { nearest = p; nearestD = dp; }
          }
          if (nearest) {
            const nx = (nearest as { x: number; y: number }).x - bot.x;
            const ny = (nearest as { x: number; y: number }).y - bot.y;
            const nd = Math.hypot(nx, ny);
            if (nd > 0) { fx = nx / nd; fy = ny / nd; }
          }

          // Bot it throws ball at nearest runner
          botThrowTimers.current[bot.id] = (botThrowTimers.current[bot.id] ?? 3000) - dt;
          if (botThrowTimers.current[bot.id] <= 0 && nearest) {
            const target = nearest as { x: number; y: number };
            const bx = target.x - bot.x;
            const by = target.y - bot.y;
            const bd = Math.hypot(bx, by);
            if (bd > 0) {
              ballsRef.current.push({
                x: bot.x, y: bot.y,
                vx: (bx / bd) * BALL_SPEED,
                vy: (by / bd) * BALL_SPEED,
                ownerId: bot.id, life: BALL_LIFE,
              });
            }
            botThrowTimers.current[bot.id] = 1800 + Math.random() * 1500;
          }
        } else {
          // Обычный бот: блуждает + убегает от мяча и воды
          bot.wanderAngle += (Math.random() - 0.5) * 0.35;
          fx += Math.cos(bot.wanderAngle) * 0.45;
          fy += Math.sin(bot.wanderAngle) * 0.45;

          // Flee from balls
          ballsRef.current.forEach(ball => {
            const d = Math.hypot(ball.x - bot.x, ball.y - bot.y);
            if (d < 80 && d > 0) {
              const w = (80 - d) / 80;
              fx += ((bot.x - ball.x) / d) * w * 3;
              fy += ((bot.y - ball.y) / d) * w * 3;
            }
          });

          // Flee from it-bots
          botsRef.current.forEach(o => {
            if (!o.isIt) return;
            const d = Math.hypot(o.x - bot.x, o.y - bot.y);
            if (d < BOT_FLEE_RADIUS && d > 0) {
              const w = (BOT_FLEE_RADIUS - d) / BOT_FLEE_RADIUS;
              fx += ((bot.x - o.x) / d) * w * 2.5;
              fy += ((bot.y - o.y) / d) * w * 2.5;
            }
          });

          // Wall repulsion
          const wm = 55;
          if (bot.x < wm)       fx += (wm - bot.x) / wm * 1.5;
          if (bot.x > W - wm)   fx -= (bot.x - (W - wm)) / wm * 1.5;
          if (bot.y < wm)       fy += (wm - bot.y) / wm * 1.5;
          if (bot.y > H - wm)   fy -= (bot.y - (H - wm)) / wm * 1.5;
        }

        // Separation
        botsRef.current.forEach(o => {
          if (o.id === bot.id) return;
          const sd = Math.hypot(bot.x - o.x, bot.y - o.y);
          if (sd < 22 && sd > 0) { fx += ((bot.x - o.x) / sd) * 0.7; fy += ((bot.y - o.y) / sd) * 0.7; }
        });

        const inertia = bot.isIt ? 0.8 : 0.87;
        bot.vx = bot.vx * inertia + fx * bot.speed * (1 - inertia);
        bot.vy = bot.vy * inertia + fy * bot.speed * (1 - inertia);
        const spd = Math.hypot(bot.vx, bot.vy);
        if (spd > bot.speed) { bot.vx = (bot.vx / spd) * bot.speed; bot.vy = (bot.vy / spd) * bot.speed; }
        bot.x += bot.vx; bot.y += bot.vy;
        bot.x = Math.max(bot.size + 1, Math.min(W - bot.size - 1, bot.x));
        bot.y = Math.max(bot.size + 1, Math.min(H - bot.size - 1, bot.y));
        if (bot.x <= bot.size + 1 || bot.x >= W - bot.size - 1) bot.vx *= -0.5;
        if (bot.y <= bot.size + 1 || bot.y >= H - bot.size - 1) bot.vy *= -0.5;
      });

      // Move balls + check hits
      ballsRef.current = ballsRef.current.filter(ball => {
        ball.x += ball.vx; ball.y += ball.vy;
        ball.life -= dt;

        // Bounce off walls
        if (ball.x < BALL_RADIUS || ball.x > W - BALL_RADIUS) { ball.vx *= -0.85; ball.x = Math.max(BALL_RADIUS, Math.min(W - BALL_RADIUS, ball.x)); }
        if (ball.y < BALL_RADIUS || ball.y > H - BALL_RADIUS) { ball.vy *= -0.85; ball.y = Math.max(BALL_RADIUS, Math.min(H - BALL_RADIUS, ball.y)); }

        // Hit player (if ball from bot)
        if (ball.ownerId !== -1) {
          const dp = Math.hypot(ball.x - p.x, ball.y - p.y);
          if (dp < BALL_RADIUS + p.size) {
            const wasIt = p.isIt;
            if (!wasIt) {
              // Player becomes it
              const prevItBot = botsRef.current.find(b => b.id === ball.ownerId);
              if (prevItBot) prevItBot.isIt = false;
              p.isIt = true;
              setIsPlayerIt(true);
              spawnParticles(p.x, p.y);
              addFloat(p.x, p.y - 20, 'ВОДА!', '#0d0d0d');
            }
            return false;
          }
        }

        // Hit bot (if ball from player)
        if (ball.ownerId === -1 && p.isIt) {
          for (const bot of botsRef.current) {
            if (bot.isIt) continue;
            const db = Math.hypot(ball.x - bot.x, ball.y - bot.y);
            if (db < BALL_RADIUS + bot.size) {
              // Bot becomes it, player stops being it
              botsRef.current.forEach(b => b.isIt = false);
              bot.isIt = true;
              p.isIt = false;
              setIsPlayerIt(false);
              scoreRef.current += 100;
              spawnParticles(bot.x, bot.y);
              addFloat(bot.x, bot.y - 20, '+100', '#0d0d0d');
              return false;
            }
          }
        }

        // Bot-to-bot hit (from bot-it)
        if (ball.ownerId !== -1) {
          const owner = botsRef.current.find(b => b.id === ball.ownerId);
          if (owner?.isIt) {
            for (const bot of botsRef.current) {
              if (bot.isIt || bot.id === ball.ownerId) continue;
              const db = Math.hypot(ball.x - bot.x, ball.y - bot.y);
              if (db < BALL_RADIUS + bot.size) {
                owner.isIt = false;
                bot.isIt = true;
                botThrowTimers.current[bot.id] = 1500;
                spawnParticles(bot.x, bot.y);
                return false;
              }
            }
          }
        }

        return ball.life > 0;
      });

      // Bot catches player by touch
      botsRef.current.forEach(bot => {
        if (!bot.isIt) return;
        const dp = Math.hypot(bot.x - p.x, bot.y - p.y);
        if (dp < bot.size + p.size + 2 && !p.isIt) {
          bot.isIt = false;
          p.isIt = true;
          setIsPlayerIt(true);
          spawnParticles(p.x, p.y);
          addFloat(p.x, p.y - 20, 'ВОДА!', '#0d0d0d');
        }
      });

      // Draw balls
      ballsRef.current.forEach(drawBall);

      // Draw bots
      botsRef.current.forEach(drawBot);

      // Draw player
      drawPlayer();

      // Particles
      particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);
      particlesRef.current.forEach(pt => {
        pt.x += pt.vx; pt.y += pt.vy; pt.life -= dt / 600;
        pt.vx *= 0.92; pt.vy *= 0.92;
        ctx.globalAlpha = pt.life;
        ctx.fillStyle = '#0d0d0d';
        ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
        ctx.globalAlpha = 1;
      });

      // Float texts
      floatTextsRef.current = floatTextsRef.current.filter(ft => ft.life > 0);
      floatTextsRef.current.forEach(ft => {
        ft.y -= 0.6; ft.life -= dt / 1200;
        ctx.globalAlpha = ft.life;
        ctx.font = `bold 13px 'IBM Plex Mono'`;
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x - 20, ft.y);
        ctx.globalAlpha = 1;
      });

      // HUD
      ctx.fillStyle = '#0d0d0d';
      ctx.font = `500 12px 'IBM Plex Mono'`;
      ctx.fillText(`ОЧКИ: ${Math.floor(scoreRef.current)}`, 14, 24);
      ctx.fillStyle = '#888';
      ctx.fillText(`ВРЕМЯ: ${Math.floor(timerRef.current / 1000)}с`, 14, 42);
      ctx.fillStyle = p.isIt ? '#0d0d0d' : '#aaa';
      ctx.font = `bold 12px 'IBM Plex Mono'`;
      ctx.fillText(p.isIt ? '● ТЫ — ВОДА' : '○ ТЫ — ИГРОК', W - 160, 24);
      const itCount = botsRef.current.filter(b => b.isIt).length + (p.isIt ? 1 : 0);
      ctx.fillStyle = '#aaa';
      ctx.font = `500 12px 'IBM Plex Mono'`;
      ctx.fillText(`ВОД: ${itCount}`, W - 160, 42);

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 px-6">
      <div className="relative w-full max-w-[700px]">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="w-full border border-[#e0e0e0]"
          style={{ aspectRatio: `${W}/${H}`, cursor: gameState === 'playing' && isPlayerIt ? 'crosshair' : 'none' }}
        />

        {/* IDLE */}
        {gameState === 'idle' && (
          <div className="absolute inset-0 bg-[#f5f5f5]/96 flex flex-col items-center justify-center animate-fade-in">
            <div className="w-12 h-0.5 bg-[#0d0d0d] mb-6" />
            <p className="font-mono text-xs text-[#888888] tracking-[0.3em] uppercase mb-2">MODE_03</p>
            <h1 className="font-rajdhani text-5xl font-bold tracking-[0.15em] text-[#0d0d0d] uppercase mb-2">
              ДОГОМЯЧ
            </h1>
            <p className="font-mono text-xs text-[#aaaaaa] tracking-widest mb-10 uppercase max-w-xs text-center">
              Бросай мяч в игроков — они станут водой.
              Убегай, пока не попали в тебя.
            </p>

            <div className="flex gap-6 mb-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-7 h-7 border-2 border-[#0d0d0d] rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-[#0d0d0d]" />
                </div>
                <span className="font-mono text-[10px] text-[#aaa] tracking-widest uppercase">Игрок</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-7 h-7 bg-[#0d0d0d] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">+</span>
                </div>
                <span className="font-mono text-[10px] text-[#aaa] tracking-widest uppercase">Вода</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-[#0d0d0d]" />
                <span className="font-mono text-[10px] text-[#aaa] tracking-widest uppercase">Мяч</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="px-12 py-3 bg-[#0d0d0d] text-[#f5f5f5] font-rajdhani font-semibold text-sm tracking-[0.2em] uppercase hover:bg-[#333] transition-colors"
            >
              ИГРАТЬ
            </button>

            {bestScore > 0 && (
              <p className="font-mono text-xs text-[#888888] mt-6 tracking-wider">РЕКОРД: {bestScore}</p>
            )}
            <div className="w-12 h-0.5 bg-[#e0e0e0] mt-6" />
          </div>
        )}
      </div>

      {gameState === 'playing' && (
        <div className="flex items-center gap-8 mt-4">
          <p className="font-mono text-xs text-[#cccccc] tracking-widest uppercase animate-fade-in">
            {isPlayerIt
              ? 'Клик — бросить мяч · Попади в игрока'
              : 'Двигай мышью · Убегай от мяча и воды'}
          </p>
          <button
            onClick={() => { stateRef.current = 'idle'; setGameState('idle'); const s = Math.floor(scoreRef.current); if (s > bestScore) { setBestScore(s); localStorage.setItem('zg_dodgeball_best', String(s)); } }}
            className="font-mono text-xs text-[#cccccc] hover:text-[#0d0d0d] tracking-widest uppercase transition-colors"
          >
            [МЕНЮ]
          </button>
        </div>
      )}
    </div>
  );
}
