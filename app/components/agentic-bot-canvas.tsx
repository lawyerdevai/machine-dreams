"use client";

import { useEffect, useRef } from "react";

type Personality = "wander" | "sweep" | "loop" | "dart";
type BotKind = "hex" | "square" | "circle" | "diamond";

type Point = { x: number; y: number };

type Bot = {
  kind: BotKind;
  personality: Personality;
  color: string;
  size: number;
  x: number;
  y: number;
  heading: number;
  speed: number;
  sweepRemaining: number;
  cx: number;
  cy: number;
  radius: number;
  orbit: number;
  orbitSpeed: number;
  dartCooldown: number;
  history: Point[];
};

type Bloom = {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
};

const BOTS_SPEC: {
  kind: BotKind;
  personality: Personality;
  color: string;
  size: number;
}[] = [
  { kind: "hex", personality: "wander", color: "#c4a574", size: 20 },
  { kind: "square", personality: "sweep", color: "#8fa4b8", size: 18 },
  { kind: "circle", personality: "loop", color: "#8fa890", size: 19 },
  { kind: "diamond", personality: "dart", color: "#b89a9e", size: 17 }, // dusty rose
];

const HISTORY_LEN = 100;
const CROSS_DIST = 5.5;
const FADE_ALPHA = 0.0042;
const PAD = 24;
const REF_SPEED = 0.35;

function mixColors(a: string, b: string): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const r = Math.round((ar! + br!) / 2);
  const g = Math.round((ag! + bg!) / 2);
  const bl = Math.round((ab! + bb!) / 2);
  return `rgb(${r},${g},${bl})`;
}

function createBots(width: number, height: number): Bot[] {
  return BOTS_SPEC.map((spec, i) => {
    const x = PAD + ((i + 0.5) / BOTS_SPEC.length) * (width - PAD * 2);
    const y = PAD + ((i + 0.5) / BOTS_SPEC.length) * (height - PAD * 2);
    return {
      ...spec,
      x,
      y,
      heading: (Math.PI * 2 * i) / BOTS_SPEC.length,
      speed: 0.2,
      sweepRemaining: 120 + Math.random() * 100,
      cx: width * (0.25 + (i % 3) * 0.22),
      cy: height * (0.3 + (i % 2) * 0.3),
      radius: 40 + i * 12,
      orbit: Math.random() * Math.PI * 2,
      orbitSpeed: 0.006 + i * 0.0012,
      dartCooldown: 20 + i * 10,
      history: [],
    };
  });
}

function bounce(bot: Bot, width: number, height: number) {
  if (bot.x < PAD) {
    bot.x = PAD;
    bot.heading = Math.PI - bot.heading;
  } else if (bot.x > width - PAD) {
    bot.x = width - PAD;
    bot.heading = Math.PI - bot.heading;
  }
  if (bot.y < PAD) {
    bot.y = PAD;
    bot.heading = -bot.heading;
  } else if (bot.y > height - PAD) {
    bot.y = height - PAD;
    bot.heading = -bot.heading;
  }
}

function stepBot(bot: Bot, width: number, height: number) {
  if (bot.personality === "wander") {
    bot.heading += (Math.random() - 0.5) * 0.55;
    bot.speed = 0.22 + Math.random() * 0.12;
    bot.x += Math.cos(bot.heading) * bot.speed;
    bot.y += Math.sin(bot.heading) * bot.speed;
    bounce(bot, width, height);
  } else if (bot.personality === "sweep") {
    bot.sweepRemaining -= 1;
    if (bot.sweepRemaining <= 0) {
      const cardinals = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
      bot.heading =
        cardinals[Math.floor(Math.random() * cardinals.length)]! +
        (Math.random() - 0.5) * 0.2;
      bot.sweepRemaining = 140 + Math.random() * 160;
      bot.speed = 0.18 + Math.random() * 0.06;
    }
    bot.x += Math.cos(bot.heading) * bot.speed;
    bot.y += Math.sin(bot.heading) * bot.speed;
    const beforeH = bot.heading;
    bounce(bot, width, height);
    if (bot.heading !== beforeH) {
      bot.sweepRemaining = 100 + Math.random() * 80;
    }
  } else if (bot.personality === "loop") {
    bot.orbit += bot.orbitSpeed;
    if (Math.random() < 0.002) {
      bot.cx += (Math.random() - 0.5) * 40;
      bot.cy += (Math.random() - 0.5) * 40;
      bot.cx = Math.max(
        PAD + bot.radius,
        Math.min(width - PAD - bot.radius, bot.cx)
      );
      bot.cy = Math.max(
        PAD + bot.radius,
        Math.min(height - PAD - bot.radius, bot.cy)
      );
    }
    if (Math.random() < 0.0015) {
      bot.radius = 32 + Math.random() * 55;
      bot.orbitSpeed = 0.005 + Math.random() * 0.004;
    }
    bot.x = bot.cx + Math.cos(bot.orbit) * bot.radius;
    bot.y = bot.cy + Math.sin(bot.orbit) * bot.radius;
    bot.heading = bot.orbit + Math.PI / 2;
    bot.speed = bot.orbitSpeed * bot.radius;
    bounce(bot, width, height);
  } else {
    // dart — short fast bursts, then brief pauses
    bot.dartCooldown -= 1;
    if (bot.dartCooldown <= 0) {
      bot.heading += (Math.random() - 0.5) * 1.8;
      bot.speed = 0.55 + Math.random() * 0.45;
      bot.dartCooldown = 18 + Math.random() * 40;
    } else {
      bot.speed *= 0.96;
      if (bot.speed < 0.08) bot.speed = 0.08 + Math.random() * 0.04;
      if (Math.random() < 0.08) bot.heading += (Math.random() - 0.5) * 0.9;
    }
    bot.x += Math.cos(bot.heading) * bot.speed;
    bot.y += Math.sin(bot.heading) * bot.speed;
    bounce(bot, width, height);
  }

  bot.history.push({ x: bot.x, y: bot.y });
  if (bot.history.length > HISTORY_LEN) bot.history.shift();
}

function trailWidthForSpeed(speed: number): number {
  const t = Math.min(1, Math.max(0, speed / REF_SPEED));
  // slower → thicker (up to ~4.2), faster → thinner (~1.1)
  return 4.2 - t * 3.1;
}

function drawTrailSegment(
  ctx: CanvasRenderingContext2D,
  bot: Bot,
  x0: number,
  y0: number,
  x1: number,
  y1: number
) {
  const width = trailWidthForSpeed(bot.speed);

  // Soft luminous under-glow (no shadowBlur — keeps animation performant)
  ctx.save();
  ctx.strokeStyle = bot.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = width * 3.4;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = width * 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();

  // Core stroke
  ctx.save();
  ctx.strokeStyle = bot.color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function drawBot(ctx: CanvasRenderingContext2D, bot: Bot) {
  const { x, y, heading, kind, size } = bot;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  ctx.strokeStyle = "#555555";
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1.75;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (kind === "hex") {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 6;
      const px = Math.cos(a) * size * 0.5;
      const py = Math.sin(a) * size * 0.5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === "square") {
    const s = size * 0.45;
    ctx.beginPath();
    ctx.rect(-s, -s, s * 2, s * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(0, -s - size * 0.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -s - size * 0.42, 2.2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "circle") {
    const r = size * 0.48;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0.35, Math.PI * 2 - 0.35);
    ctx.stroke();
    ctx.beginPath();
    const n1x = Math.cos(0.35) * r;
    const n1y = Math.sin(0.35) * r;
    const n2x = Math.cos(-0.35) * r;
    const n2y = Math.sin(-0.35) * r;
    ctx.moveTo(n1x, n1y);
    ctx.lineTo(r + 3, 0);
    ctx.lineTo(n2x, n2y);
    ctx.stroke();
  } else {
    // diamond / dart
    const s = size * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.65, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.65, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * 0.65, 0);
    ctx.lineTo(s * 1.05, 0);
    ctx.stroke();
  }

  ctx.restore();
}

function segmentNearHistory(
  x: number,
  y: number,
  history: Point[],
  skipTail: number
): Point | null {
  const limit = Math.max(0, history.length - skipTail);
  for (let i = 0; i < limit; i++) {
    const p = history[i]!;
    const dx = p.x - x;
    const dy = p.y - y;
    if (dx * dx + dy * dy <= CROSS_DIST * CROSS_DIST) {
      return { x: (p.x + x) / 2, y: (p.y + y) / 2 };
    }
  }
  return null;
}

function drawBloom(ctx: CanvasRenderingContext2D, bloom: Bloom) {
  const t = bloom.life / bloom.maxLife;
  const age = 1 - t;

  // Soft radiating pulse rings
  for (let i = 0; i < 3; i++) {
    const ringT = Math.max(0, t - i * 0.12);
    if (ringT <= 0) continue;
    const radius = 3 + age * (14 + i * 6);
    ctx.beginPath();
    ctx.arc(bloom.x, bloom.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = bloom.color;
    ctx.globalAlpha = 0.22 * ringT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // Core glow
  const gradient = ctx.createRadialGradient(
    bloom.x,
    bloom.y,
    0,
    bloom.x,
    bloom.y,
    10 + age * 8
  );
  gradient.addColorStop(0, bloom.color);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.globalAlpha = 0.45 * t;
  ctx.beginPath();
  ctx.arc(bloom.x, bloom.y, 10 + age * 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(bloom.x, bloom.y, 1.6, 0, Math.PI * 2);
  ctx.fillStyle = bloom.color;
  ctx.globalAlpha = 0.7 * t;
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function AgenticBotCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const botRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const trailCanvas = trailRef.current;
    const fxCanvas = fxRef.current;
    const botCanvas = botRef.current;
    if (!container || !trailCanvas || !fxCanvas || !botCanvas) return;

    const trailCtx = trailCanvas.getContext("2d");
    const fxCtx = fxCanvas.getContext("2d");
    const botCtx = botCanvas.getContext("2d");
    if (!trailCtx || !fxCtx || !botCtx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let bots: Bot[] = [];
    let blooms: Bloom[] = [];
    let raf = 0;
    let width = 0;
    let height = 0;
    const coolDown = new Map<string, number>();

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.max(1, Math.floor(rect.width));
      const nextH = Math.max(1, Math.floor(rect.height));

      // Ignore collapsed or unchanged boxes (avoids ResizeObserver thrash / blank canvas)
      if (nextH < 2 || (nextW === width && nextH === height)) return;

      width = nextW;
      height = nextH;

      for (const canvas of [trailCanvas, fxCanvas, botCanvas]) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        const ctx = canvas.getContext("2d");
        ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      trailCtx.clearRect(0, 0, width, height);
      fxCtx.clearRect(0, 0, width, height);
      bots = createBots(width, height);
      blooms = [];
      coolDown.clear();

      if (reducedMotion) {
        botCtx.clearRect(0, 0, width, height);
        for (const bot of bots) drawBot(botCtx, bot);
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    if (reducedMotion) {
      return () => observer.disconnect();
    }

    const tick = () => {
      if (width < 2 || height < 2) {
        raf = requestAnimationFrame(tick);
        return;
      }

      trailCtx.fillStyle = `rgba(247,247,245,${FADE_ALPHA})`;
      trailCtx.fillRect(0, 0, width, height);

      botCtx.clearRect(0, 0, width, height);
      fxCtx.clearRect(0, 0, width, height);

      for (const bot of bots) {
        const prevX = bot.x;
        const prevY = bot.y;
        stepBot(bot, width, height);
        drawTrailSegment(trailCtx, bot, prevX, prevY, bot.x, bot.y);
      }

      for (let i = 0; i < bots.length; i++) {
        for (let j = i + 1; j < bots.length; j++) {
          const a = bots[i]!;
          const b = bots[j]!;
          const key = `${i}-${j}`;
          const until = coolDown.get(key) ?? 0;
          if (until > 0) {
            coolDown.set(key, until - 1);
            continue;
          }

          const hit =
            segmentNearHistory(a.x, a.y, b.history, 12) ||
            segmentNearHistory(b.x, b.y, a.history, 12);

          if (hit) {
            blooms.push({
              x: hit.x,
              y: hit.y,
              life: 52,
              maxLife: 52,
              color: mixColors(a.color, b.color),
            });
            coolDown.set(key, 36);
          }
        }
      }

      blooms = blooms.filter((bloom) => {
        bloom.life -= 1;
        if (bloom.life <= 0) return false;
        drawBloom(fxCtx, bloom);
        return true;
      });

      for (const bot of bots) drawBot(botCtx, bot);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-w-0 min-h-[280px] md:min-h-[380px] aspect-[5/4] md:aspect-square overflow-hidden bg-[#f7f7f5]"
      aria-hidden="true"
    >
      <canvas ref={trailRef} className="absolute inset-0 block h-full w-full" />
      <canvas ref={fxRef} className="absolute inset-0 block h-full w-full" />
      <canvas ref={botRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}
