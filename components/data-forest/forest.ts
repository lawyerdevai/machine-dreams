/* Data forest: trees and a stream drawn entirely from glyphs.
   Tree heights come from `series` (e.g. seven daily values); the stream's speed comes from `flow` (0..1).
   Pure canvas, no dependencies. Deterministic layout (seeded), so it looks the same on every load. */
export type ForestOpts = { series?: number[]; flow?: number; seed?: number };

const GLYPHS = "0123456789ABCDEF{}[]<>/|+-=%#";
const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const hash = (n: number) => { n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); n = Math.imul(n ^ (n >>> 16), 0x45d9f3b); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

type Pt = { x: number; y: number; g: number; k: number; leaf: boolean; ph: number }; // k = 0..1 depth (0 far)
type Tree = { pts: Pt[]; k: number };

export function startForest(canvas: HTMLCanvasElement, opts: ForestOpts = {}) {
  const ctx = canvas.getContext("2d")!;
  let rnd = mulberry(opts.seed ?? 7);
  const series = (opts.series && opts.series.length ? opts.series : [0.35, 0.5, 0.42, 0.7, 0.6, 0.85, 0.55]).slice();
  const mx = Math.max(...series, 1e-9);
  const norm: number[] = series.map((v) => 0.35 + 0.65 * (v / mx)); // never a bare stump
  let flow = Math.min(1, Math.max(0, opts.flow ?? 0.55));
  let W = 0, H = 0, dpr = 1, trees: Tree[] = [], raf = 0, alive = true, last = 0;
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const horizon = () => H * 0.4;
  const streamX = (y: number) => { const t = (y - horizon()) / (H - horizon()); return W * 0.5 + Math.sin(t * 5.2 + 0.4) * W * 0.05 * (0.2 + t); };
  const streamW = (y: number) => { const t = (y - horizon()) / (H - horizon()); return W * (0.012 + 0.2 * t * t + 0.05 * t); };

  function grow() {
    trees = [];
    const cell = (k: number) => 7 + k * 6; // glyph spacing grows toward the viewer
    const layers = [{ k: 0.15, n: 36 }, { k: 0.4, n: 20 }, { k: 0.7, n: 11 }, { k: 1, n: 5 }];
    let idx = 0;
    for (const L of layers) {
      for (let i = 0; i < L.n; i++) {
        const base = horizon() + (H - horizon()) * (0.02 + L.k * 0.5) + rnd() * 10;
        let x = ((i + 0.3 + rnd() * 0.5) / L.n) * W;
        const sx = streamX(base), sw = streamW(base) + 30 + L.k * 50;
        if (Math.abs(x - sx) < sw) x = x < sx ? sx - sw - rnd() * 40 : sx + sw + rnd() * 40; // keep the stream clear
        const hgt = H * (0.46 + L.k * 0.4) * norm[idx % norm.length] * (0.85 + rnd() * 0.3);
        const pts: Pt[] = [];
        const step = cell(L.k);
        const seg = (x0: number, y0: number, ang: number, len: number, depth: number) => {
          const n = Math.max(2, Math.floor(len / step));
          for (let s = 0; s <= n; s++) {
            const u = s / n;
            if (L.k > 0.65 && depth >= 4) pts.push({ x: x0 + Math.cos(ang) * len * u + step * 0.9, y: y0 + Math.sin(ang) * len * u, g: (rnd() * GLYPHS.length) | 0, k: L.k, leaf: false, ph: rnd() * 6.28 });
            pts.push({ x: x0 + Math.cos(ang) * len * u + (rnd() - 0.5) * 1.5, y: y0 + Math.sin(ang) * len * u, g: (rnd() * GLYPHS.length) | 0, k: L.k, leaf: false, ph: rnd() * 6.28 });
          }
          const x1 = x0 + Math.cos(ang) * len, y1 = y0 + Math.sin(ang) * len;
          if (depth <= 0 || len < step * 2.5) {
            const c = 6 + ((L.k * 8) | 0);
            for (let j = 0; j < c; j++) { const a = rnd() * 6.28, r = rnd() * step * (1.6 + L.k * 1.2); pts.push({ x: x1 + Math.cos(a) * r, y: y1 + Math.sin(a) * r * 0.8, g: (rnd() * GLYPHS.length) | 0, k: L.k, leaf: true, ph: rnd() * 6.28 }); }
            return;
          }
          const sp = 0.4 + rnd() * 0.3;
          seg(x1, y1, ang - sp, len * (0.6 + rnd() * 0.08), depth - 1);
          seg(x1, y1, ang + sp * (0.8 + rnd() * 0.4), len * (0.58 + rnd() * 0.08), depth - 1);
        };
        seg(x, base, -Math.PI / 2 + (rnd() - 0.5) * 0.1, hgt * 0.27, 5);
        trees.push({ pts, k: L.k });
        idx++;
      }
    }
    trees.sort((a, b) => a.k - b.k);
  }

  function size() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = Math.max(320, r.width); H = Math.max(240, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rnd = mulberry(opts.seed ?? 7);
    grow();
  }
  let rnd2 = rnd;

  function frame(now: number) {
    if (!alive) return;
    const t = reduce ? 0 : now / 1000;
    ctx.clearRect(0, 0, W, H);
    // paper, with a pale haze at the horizon
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#f6f5f0"); bg.addColorStop(0.46, "#e9efe6"); bg.addColorStop(1, "#f4f3ee");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";

    // ground: faint rows of glyphs that thin out toward the horizon
    const hy = horizon();
    for (let y = hy + 6, row = 0; y < H; row++) {
      const tt = (y - hy) / (H - hy), step = 8 + tt * 16;
      ctx.font = `${Math.round(7 + tt * 7)}px ui-monospace, Menlo, monospace`;
      for (let x = (row % 2) * step * 0.5; x < W; x += step * 1.9) {
        if (Math.abs(x - streamX(y)) < streamW(y) * 1.35) continue;
        const h = hash((x * 7 + row * 131) | 0);
        if (h > 0.55) continue;
        ctx.fillStyle = `rgba(70,110,80,${0.07 + tt * 0.12})`;
        ctx.fillText(GLYPHS[(h * 997 | 0) % GLYPHS.length], x, y);
      }
      y += step * 0.9;
    }

    // trees, far to near. Far trees are paler and bluer (atmosphere); near trees are deep green.
    for (const tr of trees) {
      const k = tr.k, fs = Math.round(7 + k * 8);
      ctx.font = `${fs}px ui-monospace, Menlo, monospace`;
      const R = Math.round(120 - k * 100), G = Math.round(160 - k * 70), B = Math.round(150 - k * 90);
      for (const p of tr.pts) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.4 - p.y * 0.02 + p.ph * 0.2); // data rising through the wood
        const flick = !reduce && hash(((p.x * 31 + p.y * 17) | 0) + ((t * (p.leaf ? 2.2 : 0.6)) | 0)) < 0.06;
        const gi = flick ? (p.g + 7) % GLYPHS.length : p.g;
        const a = (p.leaf ? 0.32 + 0.3 * pulse : 0.5 + 0.35 * pulse) * (0.45 + k * 0.55);
        ctx.fillStyle = p.leaf ? `rgba(${R - 25},${G + 25},${B - 30},${a})` : `rgba(${R},${G},${B},${a})`;
        ctx.fillText(GLYPHS[gi], p.x, p.y);
      }
    }

    // stream: a ribbon of glyphs running downhill toward the viewer; packets are bright heads with fading tails
    for (let y = hy + 3; y < H; ) {
      const tt = (y - hy) / (H - hy), fs = 6 + tt * 12, cx = streamX(y), sw = streamW(y);
      const cols = Math.max(3, Math.floor((sw * 2) / (fs * 0.95)));
      ctx.font = `${Math.round(fs)}px ui-monospace, Menlo, monospace`;
      const row = Math.round(y / (fs * 0.9));
      // a very pale water tint so the ribbon reads as one thing
      ctx.fillStyle = "rgba(120,170,215,0.045)"; ctx.fillRect(cx - sw, y - fs * 0.5, sw * 2, fs * 0.95);
      for (let c = 0; c < cols; c++) {
        const u = cols === 1 ? 0 : c / (cols - 1) - 0.5;
        const x = cx + u * sw * 2;
        const speed = (0.25 + flow * 1.1) * (0.55 + tt * 1.3) * (0.75 + hash(c * 53 + 11) * 0.5);
        const cyc = ((row * 0.22 - t * speed * 3 + hash(c * 31) * 11) % 7 + 7) % 7; // 0 = packet head
        const edge = 1 - Math.abs(u) * 0.55;
        const a = Math.max(0.16, 1 - cyc / 4.5) * (0.4 + tt * 0.6) * edge;
        const g = GLYPHS[(((row + c * 7 + Math.floor(t * (2 + flow * 7) * (hash(c) + 0.3))) % GLYPHS.length) + GLYPHS.length) % GLYPHS.length];
        ctx.fillStyle = cyc < 0.8 ? `rgba(10,80,170,${Math.min(1, a + 0.25)})` : `rgba(35,120,195,${a * 0.8})`;
        ctx.fillText(g, x, y);
      }
      y += fs * 0.9;
    }
    // banks: the stream's edge, a thin line of tilted glyphs
    ctx.font = "9px ui-monospace, Menlo, monospace";
    for (let y = hy + 10; y < H; y += 11 + (y - hy) * 0.05) {
      const tt = (y - hy) / (H - hy), sw = streamW(y), cx = streamX(y);
      ctx.fillStyle = `rgba(55,105,85,${0.2 + tt * 0.3})`;
      ctx.fillText("~", cx - sw * 1.08 - 3, y); ctx.fillText("~", cx + sw * 1.08 + 3, y);
    }

    if (!reduce) raf = requestAnimationFrame(frame);
    last = now;
  }

  const ro = new ResizeObserver(() => { size(); if (reduce) frame(0); });
  ro.observe(canvas);
  size();
  if (reduce) frame(0); else raf = requestAnimationFrame(frame);
  void last; void rnd2;
  return { setSeries(v: number[]) { if (!v.length) return; const m = Math.max(...v, 1e-9); norm.length = 0; v.forEach((x) => norm.push(0.35 + 0.65 * (x / m))); rnd = mulberry(opts.seed ?? 7); grow(); }, setFlow(v: number) { flow = Math.min(1, Math.max(0, v)); }, stop() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); } };
}
