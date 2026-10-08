"use client";

import { useEffect, useRef, useState } from "react";

const SIZE = 1024;

interface WeekStats {
  weekLabel: string;
  fills: number;
  volumeEth: number;
  churn: number;
  wallets: number;
  volatility: number;
}

const PRIMITIVES = [
  "distressed-figure",
  "particle-swarm",
  "fractured-type",
  "geometric-fracture",
  "pattern-field",
  "found-object",
  "mosaic-grid",
  "line-structure",
  "face",
  "rain",
  "orbit-ring",
  "wave-ribbon",
] as const;
type Primitive = (typeof PRIMITIVES)[number];
type Composition = "centered" | "scattered" | "grid" | "radial" | "collage";
type Ground = "void" | "pale" | "flood";

const STYLE_DIMENSIONS = [
  "depthLayering",
  "pixelGridReduction",
  "decayCollision",
  "gestureMinimalism",
  "glowWarmth",
  "reductiveStarkness",
  "noirShadow",
  "renderedFinish",
] as const;
type StyleDimension = (typeof STYLE_DIMENSIONS)[number];
type StyleWeights = Record<StyleDimension, number>;

interface RationaleEntry {
  factor: string;
  value: string;
  effect: string;
}

interface Directive {
  note: string;
  rationale: RationaleEntry[];
  primitives: Primitive[];
  composition: Composition;
  ground: Ground;
  collision: boolean;
  intensity: number;
  styleWeights: StyleWeights;
}

interface GenerateResult {
  stats: WeekStats;
  seed: number;
  interpretation: string;
  directive: Directive;
}

type AnimKind = "none" | "jitter" | "drift" | "pulse" | "flicker" | "warp" | "strobe" | "tear";

interface Instance {
  type: Primitive;
  cx: number;
  cy: number;
  scale: number;
  animated: boolean;
  anim: AnimKind;
  animSeed: number;
}

type Rng = () => number;

function mulberry32(a: number): Rng {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

// ---------------------------------------------------------------------------
// Palette: computed directly from the week's own numbers (v5), untouched.

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

function derivePalette(stats: WeekStats): { colors: number[][]; note: RationaleEntry } {
  const baseHue = (stats.wallets * 11 + stats.fills * 7) % 360;
  const spread = 90 + stats.volatility * 150;
  const accentHue = (baseHue + spread) % 360;
  const volNorm = clamp(stats.volumeEth / 9, 0, 1);
  const sat = 0.55 + volNorm * 0.4;
  const colors = [
    hslToRgb(baseHue, sat, 0.56),
    hslToRgb(accentHue, sat, 0.56),
    hslToRgb(baseHue, sat * 0.8, 0.3),
    hslToRgb(accentHue, sat * 0.6, 0.78),
  ];
  return {
    colors,
    note: {
      factor: "palette",
      value: `base hue ${Math.round(baseHue)}°, accent ${Math.round(accentHue)}° (spread ${Math.round(spread)}°)`,
      effect: `base hue comes from wallets (${stats.wallets}) + fills (${stats.fills}); the hue spread comes from volatility (${stats.volatility}); saturation comes from volume (${stats.volumeEth} Ξ)`,
    },
  };
}

function rgba(c: number[], a: number): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
}

// ---------------------------------------------------------------------------
// Drawing primitives — unchanged vocabulary.

function paintGround(ctx: CanvasRenderingContext2D, ground: Ground, palette: number[][], rng: Rng, noirShadow: number) {
  if (ground === "void") {
    const l = Math.max(2, 5 - Math.round(noirShadow * 4));
    ctx.fillStyle = `rgb(${l},${l},${l})`;
    ctx.fillRect(0, 0, SIZE, SIZE);
  } else if (ground === "pale") {
    ctx.fillStyle = "#e8e3d8";
    ctx.fillRect(0, 0, SIZE, SIZE);
  } else {
    ctx.fillStyle = rgba(palette[Math.floor(rng() * palette.length)], 1);
    ctx.fillRect(0, 0, SIZE, SIZE);
  }
}

function drawDistressedFigure(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number, cx: number, cy: number, scale: number) {
  const col = palette[Math.floor(rng() * palette.length)];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = rgba(col, 0.9);
  ctx.lineWidth = 3 + rng() * 5;
  ctx.beginPath();
  const points = 10 + Math.floor(rng() * 10);
  let x = 0, y = -120;
  ctx.moveTo(x, y);
  for (let i = 0; i < points; i++) {
    const jag = (rng() - 0.5) * 80 * (0.4 + intensity);
    x += (rng() - 0.5) * 50;
    y += 240 / points;
    ctx.lineTo(x + jag, y);
  }
  ctx.closePath();
  ctx.stroke();
  if (rng() < 0.5 + intensity * 0.3) {
    ctx.fillStyle = rgba(col, 0.15 + intensity * 0.25);
    ctx.fill();
  }
  for (let i = 0; i < 3 + Math.floor(intensity * 8); i++) {
    ctx.beginPath();
    ctx.moveTo((rng() - 0.5) * 100, -100 + rng() * 200);
    ctx.lineTo((rng() - 0.5) * 100, -100 + rng() * 200);
    ctx.strokeStyle = rgba(col, 0.4);
    ctx.lineWidth = 1 + rng() * 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticleSwarm(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number, countBoost: number) {
  const count = Math.max(20, 200 + Math.floor(intensity * 2000) + countBoost);
  const angBase = rng() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const col = palette[Math.floor(rng() * palette.length)];
    const ang = angBase + (rng() - 0.5) * Math.PI;
    const dist = rng() * SIZE * 0.6;
    const cx = SIZE / 2 + Math.cos(ang) * dist;
    const cy = SIZE / 2 + Math.sin(ang) * dist;
    const len = 4 + rng() * 50 * (0.4 + intensity);
    ctx.strokeStyle = rgba(col, 0.3 + rng() * 0.5);
    ctx.lineWidth = 0.6 + rng() * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    ctx.stroke();
  }
}

function drawFracturedType(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number, label: string) {
  const col = palette[Math.floor(rng() * palette.length)];
  ctx.font = `bold ${260 + rng() * 160}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const shards = 4 + Math.floor(intensity * 10);
  for (let i = 0; i < shards; i++) {
    const dx = (rng() - 0.5) * 70 * intensity;
    const dy = (rng() - 0.5) * 70 * intensity;
    ctx.save();
    ctx.beginPath();
    const bandY = (i / shards) * SIZE;
    ctx.rect(0, bandY, SIZE, SIZE / shards + 2);
    ctx.clip();
    ctx.fillStyle = rgba(col, 0.75 + rng() * 0.25);
    ctx.fillText(label, SIZE / 2 + dx, SIZE / 2 + dy);
    ctx.restore();
  }
}

function drawGeometricFracture(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number) {
  const shards = 6 + Math.floor(intensity * 24);
  for (let i = 0; i < shards; i++) {
    const col = palette[Math.floor(rng() * palette.length)];
    const cx = rng() * SIZE;
    const cy = rng() * SIZE;
    const r = 40 + rng() * 260 * (0.4 + intensity);
    const sides = 3 + Math.floor(rng() * 4);
    ctx.beginPath();
    for (let s = 0; s < sides; s++) {
      const ang = (s / sides) * Math.PI * 2 + rng() * 0.6;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(col, 0.2 + rng() * 0.4);
    ctx.fill();
    ctx.strokeStyle = rgba(col, 0.8);
    ctx.lineWidth = 1 + rng() * 2;
    ctx.stroke();
  }
}

function drawPatternField(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number) {
  const cell = 12 + rng() * 30;
  const col = palette[Math.floor(rng() * palette.length)];
  for (let y = 0; y < SIZE; y += cell) {
    for (let x = 0; x < SIZE; x += cell) {
      if (rng() > 0.55 + intensity * 0.25) continue;
      ctx.strokeStyle = rgba(col, 0.2 + rng() * 0.5);
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (rng() < 0.5) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + cell, y + cell);
      } else {
        ctx.moveTo(x + cell, y);
        ctx.lineTo(x, y + cell);
      }
      ctx.stroke();
    }
  }
}

function drawFoundObject(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], cx: number, cy: number, scale: number) {
  const col = palette[Math.floor(rng() * palette.length)];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = rgba(col, 0.9);
  ctx.lineWidth = 3;
  const kind = Math.floor(rng() * 4);
  ctx.beginPath();
  if (kind === 0) {
    ctx.rect(-50, -20, 100, 10);
    ctx.moveTo(-50, -10); ctx.lineTo(-50, 70);
    ctx.moveTo(50, -10); ctx.lineTo(50, 70);
    ctx.moveTo(-50, -20); ctx.lineTo(-50, -90);
  } else if (kind === 1) {
    ctx.ellipse(0, -40, 35, 12, 0, 0, Math.PI * 2);
    ctx.moveTo(-35, -40); ctx.lineTo(-35, 40);
    ctx.moveTo(35, -40); ctx.lineTo(35, 40);
    ctx.moveTo(-35, 40); ctx.lineTo(35, 40);
  } else if (kind === 2) {
    ctx.rect(-60, -60, 120, 120);
    ctx.moveTo(0, -60); ctx.lineTo(0, 60);
    ctx.moveTo(-60, 0); ctx.lineTo(60, 0);
  } else {
    ctx.rect(-30, -60, 60, 120);
  }
  ctx.stroke();
  ctx.restore();
}

function drawMosaicGrid(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number) {
  const cols = 10 + Math.floor(rng() * 14);
  const cell = SIZE / cols;
  for (let y = 0; y < cols; y++) {
    for (let x = 0; x < cols; x++) {
      const lit = rng() < 0.08 + intensity * 0.3;
      if (!lit) continue;
      const col = palette[Math.floor(rng() * palette.length)];
      const pad = cell * (0.1 + rng() * 0.2);
      ctx.fillStyle = rgba(col, 0.7 + rng() * 0.3);
      ctx.fillRect(x * cell + pad, y * cell + pad, cell - pad * 2, cell - pad * 2);
    }
  }
}

function drawLineStructure(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number) {
  const count = 10 + Math.floor(intensity * 70);
  for (let i = 0; i < count; i++) {
    const col = palette[Math.floor(rng() * palette.length)];
    const x1 = rng() * SIZE, y1 = rng() * SIZE;
    const x2 = rng() * SIZE, y2 = rng() * SIZE;
    ctx.strokeStyle = rgba(col, 0.3 + rng() * 0.5);
    ctx.lineWidth = 0.5 + rng() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawFace(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number, cx: number, cy: number, scale: number) {
  const col = palette[Math.floor(rng() * palette.length)];
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = rgba(col, 0.9);
  ctx.lineWidth = 3 + rng() * 3;
  ctx.beginPath();
  const hp = 12;
  for (let i = 0; i <= hp; i++) {
    const ang = (i / hp) * Math.PI * 2;
    const rad = 110 + (rng() - 0.5) * 24 * intensity;
    const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad * 1.15;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
  const eyeY = -20 + (rng() - 0.5) * 10 * intensity;
  const glitchEye = rng() < 0.3 + intensity * 0.3;
  [-1, 1].forEach((side, i) => {
    const ex = side * 40;
    const ey = eyeY + (i === 0 && glitchEye ? (rng() - 0.5) * 40 : 0);
    ctx.beginPath();
    if (glitchEye && i === 0) {
      ctx.moveTo(ex - 15, ey);
      ctx.lineTo(ex + 15, ey);
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      ctx.arc(ex, ey, 10 + rng() * 6, 0, Math.PI * 2);
      ctx.fillStyle = rgba(col, 0.85);
      ctx.fill();
    }
  });
  ctx.beginPath();
  ctx.moveTo(-35, 50);
  const midY = 50 + (rng() - 0.5) * 30 * intensity;
  ctx.quadraticCurveTo(0, midY, 35, 50);
  ctx.stroke();
  ctx.restore();
}

function drawRain(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number, countBoost: number) {
  const count = Math.max(10, 80 + Math.floor(intensity * 300) + countBoost);
  for (let i = 0; i < count; i++) {
    const col = palette[Math.floor(rng() * palette.length)];
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const len = 30 + rng() * 150 * (0.4 + intensity);
    ctx.strokeStyle = rgba(col, 0.2 + rng() * 0.4);
    ctx.lineWidth = 0.5 + rng() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.08, y + len);
    ctx.stroke();
  }
}

function drawOrbitRing(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number, cx: number, cy: number, scale: number, ringBoost: number) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  const rings = Math.max(1, 1 + Math.floor(intensity * 4) + ringBoost);
  for (let r = 0; r < rings; r++) {
    const radius = 60 + r * 55;
    const dots = 6 + Math.floor(rng() * 12);
    const col = palette[Math.floor(rng() * palette.length)];
    ctx.strokeStyle = rgba(col, 0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();
    for (let d = 0; d < dots; d++) {
      const ang = (d / dots) * Math.PI * 2 + rng() * 0.3;
      const px = Math.cos(ang) * radius, py = Math.sin(ang) * radius;
      ctx.fillStyle = rgba(col, 0.7 + rng() * 0.3);
      ctx.beginPath();
      ctx.arc(px, py, 3 + rng() * 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawWaveRibbon(ctx: CanvasRenderingContext2D, rng: Rng, palette: number[][], intensity: number) {
  const bands = 1 + Math.floor(intensity * 5);
  for (let b = 0; b < bands; b++) {
    const col = palette[Math.floor(rng() * palette.length)];
    const baseY = rng() * SIZE;
    const amp = 20 + rng() * 100 * (0.4 + intensity);
    const freq = 0.004 + rng() * 0.012;
    const phase = rng() * Math.PI * 2;
    ctx.strokeStyle = rgba(col, 0.4 + rng() * 0.4);
    ctx.lineWidth = 1 + rng() * 3;
    ctx.beginPath();
    for (let x = 0; x <= SIZE; x += 8) {
      const y = baseY + Math.sin(x * freq + phase) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawPrimitive(
  type: Primitive,
  ctx: CanvasRenderingContext2D,
  rng: Rng,
  palette: number[][],
  intensity: number,
  stats: WeekStats,
  cx: number,
  cy: number,
  scale: number,
  gestureMinimalism: number
) {
  // gestureMinimalism thins out mark-count-heavy primitives and bumps scale,
  // so a high-minimalism blend reads as fewer, bolder marks rather than a
  // dense field, regardless of which primitives were picked.
  const thin = 1 - gestureMinimalism * 0.65;
  const boldScale = scale * (1 + gestureMinimalism * 0.25);
  switch (type) {
    case "distressed-figure": drawDistressedFigure(ctx, rng, palette, intensity, cx, cy, boldScale); break;
    case "particle-swarm": drawParticleSwarm(ctx, rng, palette, intensity, Math.round(stats.fills * 2 * thin)); break;
    case "fractured-type": {
      const labels = [String(stats.fills), String(stats.wallets), stats.volumeEth.toFixed(3), String(stats.churn)];
      drawFracturedType(ctx, rng, palette, intensity, labels[Math.floor(rng() * labels.length)]);
      break;
    }
    case "geometric-fracture": drawGeometricFracture(ctx, rng, palette, intensity); break;
    case "pattern-field": drawPatternField(ctx, rng, palette, intensity); break;
    case "found-object": drawFoundObject(ctx, rng, palette, cx, cy, boldScale); break;
    case "mosaic-grid": drawMosaicGrid(ctx, rng, palette, intensity); break;
    case "line-structure": drawLineStructure(ctx, rng, palette, intensity); break;
    case "face": drawFace(ctx, rng, palette, intensity, cx, cy, boldScale); break;
    case "rain": drawRain(ctx, rng, palette, intensity, Math.round(stats.wallets * 2 * thin)); break;
    case "orbit-ring": drawOrbitRing(ctx, rng, palette, intensity, cx, cy, boldScale, Math.floor((stats.churn / 15) * thin)); break;
    case "wave-ribbon": drawWaveRibbon(ctx, rng, palette, intensity); break;
  }
}

// ---------------------------------------------------------------------------
// Composition — v5's layout + data-scaling logic, with gestureMinimalism
// (v6) thinning instance counts on top of the real-number boosts, and
// decayCollision (v6) able to force the found-object/damage pairing even
// when Claude's own `collision` flag was false, if the blend calls for it.

function compose(
  directive: Directive,
  stats: WeekStats,
  rng: Rng
): { instances: Instance[]; overrideNote: RationaleEntry | null } {
  const { styleWeights: sw } = directive;
  const prims = [...directive.primitives];
  const effectiveCollision = directive.collision || sw.decayCollision > 0.65;
  if (effectiveCollision) {
    if (!prims.includes("found-object")) prims.push("found-object");
    if (!prims.some((p) => p === "distressed-figure" || p === "geometric-fracture")) prims.push("geometric-fracture");
  }

  let composition = directive.composition;
  let overrideNote: RationaleEntry | null = null;
  if (composition === "grid" && prims.includes("mosaic-grid") && stats.volatility > 0.55) {
    composition = rng() < 0.5 ? "collage" : "radial";
    overrideNote = {
      factor: "volatility override",
      value: `${stats.volatility}`,
      effect: `grid + mosaic-grid was too rigid for this volatility, so composition was pushed to ${composition} instead`,
    };
  }

  const minimalThin = 1 - sw.gestureMinimalism * 0.6;
  const raw: { type: Primitive; cx: number; cy: number; scale: number }[] = [];
  const fillsBoost = Math.round((stats.fills / 18) * minimalThin);
  const walletsBoost = Math.round((stats.wallets / 10) * minimalThin);

  if (composition === "centered") {
    prims.forEach((p, i) => raw.push({ type: p, cx: SIZE / 2, cy: SIZE / 2, scale: 1 + i * 0.15 }));
  } else if (composition === "scattered") {
    const n = clamp(Math.round((3 + Math.floor(rng() * 7) + fillsBoost) * minimalThin), 2, 24);
    for (let i = 0; i < n; i++) raw.push({ type: prims[i % prims.length], cx: rng() * SIZE, cy: rng() * SIZE, scale: 0.4 + rng() * 1.3 });
  } else if (composition === "grid") {
    const cols = 2 + Math.floor(rng() * 3);
    for (let y = 0; y < cols; y++) {
      for (let x = 0; x < cols; x++) {
        raw.push({ type: prims[(x + y) % prims.length], cx: ((x + 0.5) / cols) * SIZE, cy: ((y + 0.5) / cols) * SIZE, scale: 0.5 / cols });
      }
    }
  } else if (composition === "radial") {
    const n = clamp(Math.round((6 + Math.floor(rng() * 12) + walletsBoost) * minimalThin), 4, 30);
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2;
      const dist = SIZE * 0.3 * rng();
      raw.push({ type: prims[i % prims.length], cx: SIZE / 2 + Math.cos(ang) * dist, cy: SIZE / 2 + Math.sin(ang) * dist, scale: 0.4 + rng() * 0.7 });
    }
  } else {
    prims.forEach((p) => raw.push({ type: p, cx: SIZE / 2 + (rng() - 0.5) * 340, cy: SIZE / 2 + (rng() - 0.5) * 340, scale: 0.6 + rng() * 1.1 }));
  }

  const animProb = clamp(0.14 + directive.intensity * 0.4, 0, 0.65);
  const anims: AnimKind[] = ["jitter", "drift", "pulse", "flicker", "warp", "strobe", "tear"];
  const instances = raw.map((r) => {
    const animated = rng() < animProb;
    const anim: AnimKind = animated ? anims[Math.floor(rng() * anims.length)] : "none";
    return { ...r, animated, anim, animSeed: Math.floor(rng() * 1e9) };
  });
  return { instances, overrideNote };
}

function animTransform(anim: AnimKind, t: number, seedOffset: number) {
  let dx = 0, dy = 0, scaleMult = 1, alpha = 1, hueFlip = false;
  const s = seedOffset % 1000;
  switch (anim) {
    case "jitter":
      dx = (Math.sin(t * 0.03 + s) + Math.sin(t * 0.017 + s * 2)) * 6;
      dy = (Math.cos(t * 0.025 + s) + Math.sin(t * 0.011 + s * 3)) * 6;
      break;
    case "drift":
      dx = Math.sin(t * 0.0006 + s) * 55;
      dy = Math.cos(t * 0.0004 + s) * 55;
      break;
    case "pulse":
      scaleMult = 1 + Math.sin(t * 0.004 + s) * 0.3;
      break;
    case "flicker":
      alpha = Math.sin(t * 0.02 + s) > 0.2 ? 1 : 0.1;
      break;
    case "warp":
      dx = Math.sin(t * 0.01 + s) * 26;
      scaleMult = 1 + Math.sin(t * 0.006 + s) * 0.2;
      break;
    case "strobe":
      hueFlip = Math.floor(t / 140 + s) % 2 === 0;
      break;
    case "tear": {
      const phase = Math.floor(t / 90 + s * 10) % 4;
      dx = phase === 0 ? 26 : phase === 2 ? -26 : 0;
      break;
    }
  }
  return { dx, dy, scaleMult, alpha, hueFlip };
}

function glitchBurst(ctx: CanvasRenderingContext2D, palette: number[][], vol: number) {
  const kind = Math.floor(Math.random() * 4);
  if (kind === 0) {
    const bh = 10 + Math.random() * 70 * (0.5 + vol);
    const by = Math.random() * (SIZE - bh);
    const shift = (Math.random() - 0.5) * 140 * (0.6 + vol);
    try {
      const snap = ctx.getImageData(0, by, SIZE, bh);
      ctx.putImageData(snap, shift, by);
    } catch {
      /* ignore */
    }
  } else if (kind === 1) {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.25 + vol * 0.25;
    ctx.fillStyle = rgba(palette[0], 1);
    ctx.fillRect((Math.random() - 0.5) * 12, 0, SIZE, SIZE);
    ctx.restore();
  } else if (kind === 2) {
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = 0.35 + vol * 0.2;
    ctx.fillStyle = "#000";
    for (let y = 0; y < SIZE; y += 3) ctx.fillRect(0, y, SIZE, 1);
    ctx.restore();
  } else {
    const bh = 60 + Math.random() * 160;
    const by = Math.random() * (SIZE - bh);
    const shift = 4 + vol * 14;
    try {
      const snap = ctx.getImageData(0, by, SIZE, bh);
      ctx.save();
      ctx.globalCompositeOperation = "screen";
      ctx.putImageData(snap, -shift, by);
      ctx.putImageData(snap, shift, by);
      ctx.fillStyle = "rgba(255,0,60,0.18)";
      ctx.fillRect(0, by, SIZE, bh);
      ctx.restore();
    } catch {
      /* ignore */
    }
  }
}

// ---------------------------------------------------------------------------
// v6 — style-weight post-processing. Applied once to the static base layer
// (ground + non-animated shapes). Animated shapes are redrawn fresh every
// frame for motion, so they don't carry these passes — a deliberate
// performance trade-off; the baked layer underneath still carries the full
// blend, which reads as the piece's overall "finish" even while shapes move
// on top of it.

function applyStyleWeights(sc: HTMLCanvasElement, sw: StyleWeights, palette: number[][], vol: number) {
  const ctx = sc.getContext("2d")!;

  // depthLayering: ghost-offset duplicate, strength blended from this
  // weight instead of volatility alone — more layering reads as more depth.
  const depthStrength = 0.15 + sw.depthLayering * 0.7;
  const offset = 3 + depthStrength * 14;
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.12 + depthStrength * 0.18;
  ctx.drawImage(sc, -offset, 0);
  ctx.drawImage(sc, offset, Math.round(offset * 0.4));
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  // reductiveStarkness pulls the opposite way from depthLayering: the more
  // stark, the less scanline/noise texture survives.
  const scanAlpha = (0.14 + vol * 0.18) * (1 - sw.reductiveStarkness * 0.85);
  if (scanAlpha > 0.01) {
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = scanAlpha;
    ctx.fillStyle = "#000";
    for (let y = 0; y < SIZE; y += 2) ctx.fillRect(0, y, SIZE, 1);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // glowWarmth: soft warm bloom, built from a blurred duplicate lightened
  // over the original.
  if (sw.glowWarmth > 0.08) {
    const glow = document.createElement("canvas");
    glow.width = SIZE;
    glow.height = SIZE;
    const gctx = glow.getContext("2d")!;
    gctx.filter = `blur(${8 + sw.glowWarmth * 26}px)`;
    gctx.drawImage(sc, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = sw.glowWarmth * 0.5;
    ctx.fillStyle = "rgba(255,170,90,1)";
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(glow, 0, 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = sw.glowWarmth * 0.22;
    ctx.fillStyle = "rgba(255,160,70,1)";
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.restore();
  }

  // noirShadow: darkening vignette toward the edges.
  if (sw.noirShadow > 0.08) {
    const grad = ctx.createRadialGradient(SIZE / 2, SIZE / 2, SIZE * 0.3, SIZE / 2, SIZE / 2, SIZE * 0.72);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${0.15 + sw.noirShadow * 0.6})`);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.restore();
  }

  // renderedFinish: soft blur blended back over the sharp original so edges
  // feel eased rather than crisp vector, without losing the piece entirely.
  if (sw.renderedFinish > 0.1) {
    const soft = document.createElement("canvas");
    soft.width = SIZE;
    soft.height = SIZE;
    const sctx = soft.getContext("2d")!;
    sctx.filter = `blur(${sw.renderedFinish * 2.2}px)`;
    sctx.drawImage(sc, 0, 0);
    ctx.save();
    ctx.globalAlpha = clamp(sw.renderedFinish * 0.55, 0, 0.55);
    ctx.drawImage(soft, 0, 0);
    ctx.restore();
  }

  // pixelGridReduction: downsample to a coarse grid, then blow back up with
  // smoothing off, blended in by weight so it ranges from untouched to
  // fully chunky.
  if (sw.pixelGridReduction > 0.1) {
    const cellPx = 4 + sw.pixelGridReduction * 46;
    const cols = Math.max(4, Math.round(SIZE / cellPx));
    const small = document.createElement("canvas");
    small.width = cols;
    small.height = cols;
    const smctx = small.getContext("2d")!;
    smctx.drawImage(sc, 0, 0, cols, cols);
    ctx.save();
    ctx.globalAlpha = clamp(sw.pixelGridReduction, 0, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(small, 0, 0, cols, cols, 0, 0, SIZE, SIZE);
    ctx.imageSmoothingEnabled = true;
    ctx.restore();
  }
}

function dominantBlendNote(sw: StyleWeights): RationaleEntry {
  const entries = Object.entries(sw) as [StyleDimension, number][];
  const top = entries.sort((a, b) => b[1] - a[1]).slice(0, 2);
  return {
    factor: "style blend",
    value: top.map(([k, v]) => `${k} ${v.toFixed(2)}`).join(", "),
    effect: "all 8 house-style dials blend into every piece in different proportions each week — these two happened to lead this time, none of them alone defines the piece",
  };
}

// ---------------------------------------------------------------------------

export default function DatagramsPage() {
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paletteNote, setPaletteNote] = useState<RationaleEntry | null>(null);
  const [overrideNote, setOverrideNote] = useState<RationaleEntry | null>(null);
  const [blendNote, setBlendNote] = useState<RationaleEntry | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const instancesRef = useRef<Instance[]>([]);
  const staticCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const paletteRef = useRef<number[][]>([]);
  const volRef = useRef(0.5);

  function buildStaticLayer(directive: Directive, instances: Instance[], palette: number[][], rng: Rng, stats: WeekStats) {
    const sc = document.createElement("canvas");
    sc.width = SIZE;
    sc.height = SIZE;
    const ctx = sc.getContext("2d")!;
    paintGround(ctx, directive.ground, palette, rng, directive.styleWeights.noirShadow);
    for (const inst of instances) {
      if (inst.animated) continue;
      const shapeRng = mulberry32(inst.animSeed);
      drawPrimitive(inst.type, ctx, shapeRng, palette, directive.intensity, stats, inst.cx, inst.cy, inst.scale, directive.styleWeights.gestureMinimalism);
    }
    applyStyleWeights(sc, directive.styleWeights, palette, volRef.current);
    staticCanvasRef.current = sc;
  }

  function setupScene(data: GenerateResult) {
    const { directive, seed, stats } = data;
    const rng = mulberry32(seed);
    const { colors, note } = derivePalette(stats);
    paletteRef.current = colors;
    setPaletteNote(note);
    setBlendNote(dominantBlendNote(directive.styleWeights));
    volRef.current = clamp(0.3 + stats.volatility * 0.4 + directive.intensity * 0.3, 0, 1);
    const { instances, overrideNote: ov } = compose(directive, stats, rng);
    setOverrideNote(ov);
    instancesRef.current = instances;
    buildStaticLayer(directive, instances, colors, rng, stats);
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-datagram", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const data: GenerateResult = await res.json();
      setResult(data);
      setupScene(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function frame(t: number) {
      const canvas = canvasRef.current;
      const staticCanvas = staticCanvasRef.current;
      if (canvas && staticCanvas && result) {
        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, SIZE, SIZE);
        ctx.drawImage(staticCanvas, 0, 0);
        const palette = paletteRef.current;
        const stats = result.stats;
        const gm = result.directive.styleWeights.gestureMinimalism;
        for (const inst of instancesRef.current) {
          if (!inst.animated) continue;
          const { dx, dy, scaleMult, alpha, hueFlip } = animTransform(inst.anim, t, inst.animSeed);
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(dx, dy);
          const shapeRng = mulberry32(inst.animSeed);
          const pal = hueFlip ? [...palette].reverse() : palette;
          drawPrimitive(inst.type, ctx, shapeRng, pal, result.directive.intensity, stats, inst.cx, inst.cy, inst.scale * scaleMult, gm);
          ctx.restore();
        }
        const vol = volRef.current;
        if (Math.random() < 0.006 + vol * 0.03) {
          glitchBurst(ctx, palette, vol);
        }
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [result]);

  const allRationale: RationaleEntry[] = result
    ? [
        ...result.directive.rationale,
        ...(overrideNote ? [overrideNote] : []),
        ...(blendNote ? [blendNote] : []),
        ...(paletteNote ? [paletteNote] : []),
      ]
    : [];

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center gap-6 px-5 py-10">
      <div className="w-full max-w-[600px] flex flex-col gap-4">
        <div>
          <div className="text-[11px] tracking-[0.14em] uppercase text-neutral-500">Machine Dreams — Season 2</div>
          <h1 className="text-3xl font-bold">Datagrams</h1>
        </div>

        <div className="border border-neutral-800 bg-black aspect-square flex items-center justify-center overflow-hidden">
          {result ? (
            <canvas ref={canvasRef} width={SIZE} height={SIZE} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] tracking-[0.08em] uppercase text-neutral-600">
              {loading ? "Generating…" : "No piece yet"}
            </span>
          )}
        </div>

        {loading && (
          <p className="text-[11px] text-neutral-500">Reading the week and directing the piece — usually a few seconds.</p>
        )}

        {error && <p className="text-[12px] text-red-400">{error}</p>}

        {result && (
          <div className="flex flex-col gap-3 text-[12px] text-neutral-400 leading-relaxed">
            <p>
              <span className="text-neutral-600 uppercase tracking-[0.08em] text-[10px]">Interpretation</span>
              <br />
              {result.interpretation}
            </p>
            <p>
              <span className="text-neutral-600 uppercase tracking-[0.08em] text-[10px]">Director&rsquo;s note</span>
              <br />
              {result.directive.note}
            </p>
            <div className="flex flex-col gap-1.5">
              <span className="text-neutral-600 uppercase tracking-[0.08em] text-[10px]">Why it looks like this</span>
              <div className="flex flex-col gap-1 border border-neutral-800 divide-y divide-neutral-800">
                {allRationale.map((r, i) => (
                  <div key={i} className="flex flex-col gap-0.5 px-2.5 py-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-neutral-300 font-medium capitalize">{r.factor}</span>
                      <span className="text-neutral-500 tabular-nums">{r.value}</span>
                    </div>
                    <span className="text-neutral-500">{r.effect}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-neutral-500 tabular-nums pt-1">
              <div className="flex justify-between border-b border-neutral-800 pb-1">
                <span>fills</span>
                <b className="text-white font-medium">{result.stats.fills}</b>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-1">
                <span>volume</span>
                <b className="text-white font-medium">{result.stats.volumeEth} Ξ</b>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-1">
                <span>listings churn</span>
                <b className="text-white font-medium">{result.stats.churn}</b>
              </div>
              <div className="flex justify-between border-b border-neutral-800 pb-1">
                <span>wallets</span>
                <b className="text-white font-medium">{result.stats.wallets}</b>
              </div>
              <div className="col-span-2 text-neutral-500">
                seed <b className="text-fuchsia-400 font-medium">{result.seed}</b> · volatility{" "}
                <b className="text-white font-medium">{Math.round(result.stats.volatility * 100)}%</b>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={generate}
          disabled={loading}
          className="text-[11px] tracking-[0.08em] uppercase border border-neutral-800 bg-neutral-950 px-4 py-2.5 hover:border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed self-start"
        >
          {loading ? "Generating…" : "Generate random piece"}
        </button>

        <hr className="border-neutral-800" />

        <p className="text-[13px] leading-relaxed text-neutral-500 max-w-[62ch]">
          <b className="text-white font-medium">Simulated data — not live yet.</b> Each piece is seeded by one
          week&rsquo;s worth of Pixel Market activity. Claude reads the real numbers, writes an honest, imageless
          read, then directs the piece itself and blends eight house-style dials into it in different proportions
          every time, so every piece feels like part of the same family without copying any one source. The browser
          renders and animates it live, derives the palette straight from that week&rsquo;s own numbers, and scales
          shape counts by the same numbers, so the &ldquo;why it looks like this&rdquo; list above is a literal
          account, not a vibe. &ldquo;Generate random piece&rdquo; stands in for a real week until the Pixel Market
          API is wired in.
        </p>
      </div>
    </main>
  );
}
