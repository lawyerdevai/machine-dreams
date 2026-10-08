#!/usr/bin/env node
/**
 * Renders one week's scene to: <week>.mp4 (1200px, for OpenSea animation_url), <week>-x.mp4 (720px, for X), <week>.png (3000px still, for OpenSea image), using the same player the site uses.
 *
 *   node scripts/render-datagram.mjs 2026-10-05                         # reads data/datagrams/2026-10-05.json
 *   node scripts/render-datagram.mjs 2026-10-05 --url https://machinedreams.art --publish
 *
 * --url      fetch the week from the site (/api/datagrams/week/<week>); with CRON_SECRET set it can also read drafts. The film is the finished picture: the week's final numbers, day 7.
 * --publish  after a clean render, POST /api/datagrams/publish so the week goes live on the page
 * --seconds  loop length (default 12)   --fade  crossfade seconds (default 1.5)   --fps (default 30)   --size output px (default 1200)
 *
 * Needs: `npm i -D playwright` and ffmpeg on PATH. Set PLAYWRIGHT_CHROMIUM=/path/to/chromium to use an installed browser.
 */
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const week = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const opt = (n, d) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : d; };
if (!week) { console.error("usage: render-datagram.mjs YYYY-MM-DD [--url https://site] [--publish]"); process.exit(1); }
const FPS = +opt("fps", 30), SECONDS = +opt("seconds", 12), FADE = +opt("fade", 1.5), SIZE = +opt("size", 1200);
const base = opt("url", ""); const secret = process.env.CRON_SECRET || "";

let rec;
if (base) {
  const r = await fetch(`${base}/api/datagrams/week/${week}`, { headers: secret ? { authorization: `Bearer ${secret}` } : {} });
  if (!r.ok) throw new Error(`could not fetch week: ${r.status}`);
  rec = await r.json();
} else rec = JSON.parse(readFileSync(resolve("data/datagrams", week + ".json"), "utf8"));

const finalStats = (rec.daily && rec.daily.length ? rec.daily[rec.daily.length - 1] : rec.stats);
if (!finalStats) { console.error("this week has no numbers yet; use --url so the daily numbers are computed from the market"); process.exit(5); }
const dayNo = rec.daily && rec.daily.length ? rec.daily.length : 7;
const stats = { ...finalStats, day: dayNo, progress: dayNo / 7 };      // the finished picture: day 7, all the week's numbers
const seed = parseInt(rec.sha256.slice(0, 8), 16) >>> 0;   // same rule as the page
const L = Math.round(SECONDS * FPS), X = Math.round(FADE * FPS), N = L + X;
const tmp = mkdtempSync(join(tmpdir(), "datagram-"));
const out = resolve("out/datagrams"); mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM || undefined });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(pathToFileURL(resolve("public/datagrams/player.html")).href);
const ok = await page.evaluate((m) => window.__load(m), { scene: rec.scene, stats, seed, fixedClock: true, id: rec.sha256 });
if (!ok) { console.error("scene failed to load:", await page.evaluate(() => window.__error)); process.exit(2); }

// frames 0..X-1 are kept; when frame L+j is reached it is blended with kept frame j, so the end flows into the start
await page.evaluate((X) => { window.__keep = []; window.__mix = document.createElement("canvas"); window.__mix.width = 600; window.__mix.height = 600; }, X);
for (let i = 0; i < N; i++) {
  const dataUrl = await page.evaluate(({ i, L, X, FPS }) => {
    window.__step((i * 1000) / FPS);
    const c = window.__canvas;
    if (i < X) { const k = document.createElement("canvas"); k.width = k.height = 600; k.getContext("2d").drawImage(c, 0, 0); window.__keep[i] = k; }
    if (i >= L) {
      const j = i - L, g = window.__mix.getContext("2d");
      g.globalAlpha = 1; g.drawImage(c, 0, 0); g.globalAlpha = j / X; g.drawImage(window.__keep[j], 0, 0); g.globalAlpha = 1;
      return window.__mix.toDataURL("image/png");
    }
    return c.toDataURL("image/png");
  }, { i, L, X, FPS });
  const idx = i >= L ? i - L : i;                         // blended tail frames replace frames 0..X-1
  writeFileSync(join(tmp, String(idx).padStart(5, "0") + ".png"), Buffer.from(dataUrl.split(",")[1], "base64"));
}
await browser.close();
if (errors.length) console.warn("page errors during render:", errors.slice(0, 3));

const mp4 = join(out, `${week}.mp4`), xmp4 = join(out, `${week}-x.mp4`), still = join(out, `${week}.png`);
const scale = `scale=${SIZE}:${SIZE}:flags=neighbor`;
let r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(tmp, "%05d.png"), "-frames:v", String(L), "-vf", scale, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "14", "-movflags", "+faststart", mp4], { stdio: "inherit" });
if (r.status !== 0) process.exit(3);
// X: square 720x720, H.264, well under its 1280x1024 / 512 MB / 140 s limits
r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(tmp, "%05d.png"), "-frames:v", String(L), "-vf", "scale=720:720:flags=lanczos", "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", xmp4], { stdio: "inherit" });
if (r.status !== 0) process.exit(3);
const stillIdx = String(Math.round(L * 0.45)).padStart(5, "0");
r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", "-i", join(tmp, stillIdx + ".png"), "-vf", "scale=3000:3000:flags=neighbor", "-frames:v", "1", still], { stdio: "inherit" });
if (r.status !== 0) process.exit(3);
rmSync(tmp, { recursive: true, force: true });
console.log("wrote", mp4, xmp4, still);

if (args.includes("--publish")) {
  if (!base || !secret) { console.error("--publish needs --url and CRON_SECRET"); process.exit(4); }
  const p = await fetch(`${base}/api/datagrams/publish?week=${week}`, { method: "POST", headers: { authorization: `Bearer ${secret}` } });
  console.log("publish:", p.status);
}
