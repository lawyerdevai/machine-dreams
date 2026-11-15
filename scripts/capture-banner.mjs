/**
 * Capture the home DataForest banner at native on-page resolution (NFT master).
 * Requires: npm run dev on http://localhost:3000, playwright + ffmpeg-static.
 *
 * Usage: node scripts/capture-banner.mjs
 * Optional: CAPTURE_WIDTH=1440 node scripts/capture-banner.mjs
 */
import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  copyFileSync,
  rmSync,
  existsSync,
  statSync,
} from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

const URL = process.env.CAPTURE_URL || "http://localhost:3000";
/** Browser CSS width — matches a typical desktop view of the home banner. */
const VIEW_W = Math.max(320, Number(process.env.CAPTURE_WIDTH) || 1440);
const VIEW_H = Math.max(800, Number(process.env.CAPTURE_HEIGHT) || 900);
const FPS = 30;
const CAPTURE_FRAMES = 240; // 8s source
const LOOP_FRAMES = 180; // 6s seamless output
const BLEND_FRAMES = 45;
const DT = 1000 / FPS;

const OUT_MP4 = join(homedir(), "Desktop", "data-stream.mp4");
const OUT_MP4_1920 = join(homedir(), "Desktop", "data-stream-1920.mp4");
const OUT_STILL = join(homedir(), "Desktop", "data-stream-still.png");

const HIDE_DEV_CSS =
  "nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important; }";

const CANVAS_SEL = 'canvas[aria-label="A forest and a stream made of data"]';

function smoothstep(x) {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
}

function framePath(dir, i) {
  return join(dir, `f-${String(i).padStart(4, "0")}.png`);
}

async function hideNextDevOverlay(page) {
  await page.addStyleTag({ content: HIDE_DEV_CSS });
  await page.evaluate(() => {
    document.querySelectorAll("nextjs-portal").forEach((el) => el.remove());
  });
}

/** Lossless PNG of the canvas backing store (true NFT pixels). */
async function exportCanvasPng(page, outPath) {
  await hideNextDevOverlay(page);
  const b64 = await page.evaluate((sel) => {
    const c = document.querySelector(sel);
    if (!c) throw new Error("canvas not found");
    return c.toDataURL("image/png").slice("data:image/png;base64,".length);
  }, CANVAS_SEL);
  writeFileSync(outPath, Buffer.from(b64, "base64"));
}

async function blendPng(page, pathA, pathB, t, outPath) {
  const aB64 = readFileSync(pathA).toString("base64");
  const bB64 = readFileSync(pathB).toString("base64");
  const outB64 = await page.evaluate(
    async ({ aB64, bB64, t }) => {
      const load = (b64) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = "data:image/png;base64," + b64;
        });
      const imgA = await load(aB64);
      const imgB = await load(bB64);
      const c = document.createElement("canvas");
      c.width = imgA.width;
      c.height = imgA.height;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(imgA, 0, 0);
      const da = ctx.getImageData(0, 0, c.width, c.height);
      ctx.drawImage(imgB, 0, 0);
      const db = ctx.getImageData(0, 0, c.width, c.height);
      const out = ctx.createImageData(c.width, c.height);
      const s = t;
      const inv = 1 - s;
      const A = da.data,
        B = db.data,
        O = out.data;
      for (let i = 0; i < O.length; i += 4) {
        O[i] = A[i] * inv + B[i] * s;
        O[i + 1] = A[i + 1] * inv + B[i + 1] * s;
        O[i + 2] = A[i + 2] * inv + B[i + 2] * s;
        O[i + 3] = 255;
      }
      ctx.putImageData(out, 0, 0);
      return c.toDataURL("image/png").slice("data:image/png;base64,".length);
    },
    { aB64, bB64, t }
  );
  writeFileSync(outPath, Buffer.from(outB64, "base64"));
}

function encodeMp4(pattern, outPath, scaleArgs = []) {
  const args = [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    ...scaleArgs,
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-crf",
    "14",
    "-preset",
    "slow",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(FPS),
    "-movflags",
    "+faststart",
    "-an",
    outPath,
  ];
  const enc = spawnSync(ffmpegPath, args, { encoding: "utf8" });
  if (enc.status !== 0) {
    console.error(enc.stderr || enc.stdout);
    throw new Error(`ffmpeg encode failed: ${outPath}`);
  }
}

function summarizeVideo(path) {
  const probe = spawnSync(ffmpegPath, ["-i", path], { encoding: "utf8" });
  const info = `${probe.stderr || ""}\n${probe.stdout || ""}`;
  const lines = info.split("\n").filter((l) => /Duration|Video:|Stream #/.test(l));
  return { lines, size: statSync(path).size };
}

async function main() {
  if (!ffmpegPath || !existsSync(ffmpegPath)) {
    console.error("ffmpeg-static binary missing. Run: npm i -D ffmpeg-static");
    process.exit(1);
  }

  const rawDir = mkdtempSync(join(tmpdir(), "data-stream-raw-"));
  const outDir = mkdtempSync(join(tmpdir(), "data-stream-out-"));
  console.log("temp raw:", rawDir);
  console.log("temp out:", outDir);
  console.log(`viewport CSS: ${VIEW_W}×${VIEW_H} (banner height follows page CSS)`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VIEW_W, height: VIEW_H },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    const q = [];
    let now = 0;
    window.__rafQueue = q;
    window.__stepRaf = (dtMs) => {
      now += dtMs;
      const batch = q.splice(0, q.length);
      for (const cb of batch) {
        try {
          cb(now);
        } catch (e) {
          console.error(e);
        }
      }
    };
    window.requestAnimationFrame = (cb) => {
      q.push(cb);
      return q.length;
    };
    window.cancelAnimationFrame = () => {};
  });

  console.log("opening", URL);
  await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator(CANVAS_SEL).waitFor({ state: "visible", timeout: 60000 });
  await hideNextDevOverlay(page);

  // Let the page's own banner CSS size the canvas (full width × max(360px, min(667px, 60vw)))
  await page.waitForTimeout(300);
  await page.evaluate((dt) => {
    for (let i = 0; i < 5; i++) window.__stepRaf(dt);
  }, DT);

  const meta = await page.evaluate((sel) => {
    const c = document.querySelector(sel);
    const r = c.getBoundingClientRect();
    return {
      cssW: Math.round(r.width),
      cssH: Math.round(r.height),
      bitmapW: c.width,
      bitmapH: c.height,
    };
  }, CANVAS_SEL);
  console.log("banner CSS:", `${meta.cssW}×${meta.cssH}`, "bitmap:", `${meta.bitmapW}×${meta.bitmapH}`);

  console.log(`capturing ${CAPTURE_FRAMES} frames @ ${FPS} fps (canvas.toDataURL)…`);
  for (let i = 0; i < CAPTURE_FRAMES; i++) {
    await hideNextDevOverlay(page);
    await page.evaluate((dt) => window.__stepRaf(dt), DT);
    await exportCanvasPng(page, framePath(rawDir, i));
    if (i % 30 === 0) console.log(`  frame ${i}/${CAPTURE_FRAMES}`);
  }

  console.log("building 6s seamless loop…");
  for (let i = 0; i < LOOP_FRAMES; i++) {
    const dest = framePath(outDir, i);
    if (i < BLEND_FRAMES) {
      const t = smoothstep(i / (BLEND_FRAMES - 1));
      await blendPng(page, framePath(rawDir, 180 + i), framePath(rawDir, i), t, dest);
    } else {
      copyFileSync(framePath(rawDir, i), dest);
    }
  }

  copyFileSync(framePath(outDir, 0), OUT_STILL);

  // H.264 needs even dimensions — pad if needed (rare)
  let scaleFilter = null;
  let masterW = meta.bitmapW;
  let masterH = meta.bitmapH;
  if (masterW % 2 || masterH % 2) {
    masterW += masterW % 2;
    masterH += masterH % 2;
    scaleFilter = `scale=${masterW}:${masterH}:flags=lanczos`;
  }

  const pattern = join(outDir, "f-%04d.png");
  console.log("encoding native master", OUT_MP4);
  encodeMp4(pattern, OUT_MP4, scaleFilter ? ["-vf", scaleFilter] : []);

  // 1920-wide delivery, keep aspect (banner ~2.16:1 → 1920×~889, even)
  const destH = Math.round((1920 * meta.bitmapH) / meta.bitmapW);
  const evenH = destH + (destH % 2);
  console.log("encoding 1920-wide", OUT_MP4_1920, `(1920×${evenH} lanczos)`);
  encodeMp4(pattern, OUT_MP4_1920, [
    "-vf",
    `scale=1920:${evenH}:flags=lanczos`,
  ]);

  const native = summarizeVideo(OUT_MP4);
  const scaled = summarizeVideo(OUT_MP4_1920);

  console.log("\n--- native master ---");
  console.log(native.lines.join("\n"));
  console.log("\n--- 1920 ---");
  console.log(scaled.lines.join("\n"));
  console.log("\nDesktop outputs:");
  console.log(`  ${OUT_MP4}  (${(native.size / 1024 / 1024).toFixed(2)} MiB)`);
  console.log(`  ${OUT_MP4_1920}  (${(scaled.size / 1024 / 1024).toFixed(2)} MiB)`);
  console.log(`  ${OUT_STILL}  (${(statSync(OUT_STILL).size / 1024).toFixed(1)} KiB)`);
  console.log(`  still/bitmap: ${meta.bitmapW}×${meta.bitmapH}  duration: 6.0s @ 30fps`);

  await browser.close();
  rmSync(rawDir, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
