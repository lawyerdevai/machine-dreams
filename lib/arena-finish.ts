import "server-only";

import sharp from "sharp";
import type { ArenaFx, ArenaPatch, ArenaPixelMode } from "@/lib/arena";
import {
  arenaIngredient,
  type ArenaIngredientId,
} from "@/lib/arena-schools";

async function pixelate(input: Buffer, cell: number): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const smallW = Math.max(1, Math.round(width / cell));
  const smallH = Math.max(1, Math.round(height / cell));
  const reduced = await sharp(input)
    .resize(smallW, smallH, { kernel: sharp.kernel.nearest, fit: "fill" })
    .png({ palette: true, colours: 16, effort: 1 })
    .toBuffer();
  return sharp(reduced)
    .resize(width, height, { kernel: sharp.kernel.nearest, fit: "fill" })
    .webp({ quality: 90 })
    .toBuffer();
}

async function glitch(
  input: Buffer,
  rng: () => number,
  bands: number,
  maxOffset: number,
  full: boolean
): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const src = Buffer.from(data);
  const out = Buffer.from(data);

  for (let band = 0; band < bands; band++) {
    const y0 = Math.floor(rng() * height);
    const bandH = 2 + Math.floor(rng() * (full ? 16 : 8));
    const shift = 1 + Math.floor(rng() * Math.max(1, maxOffset));
    const chroma = 1 + Math.floor(rng() * Math.max(1, Math.ceil(maxOffset / 2)));
    const y1 = Math.min(height, y0 + bandH);
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < width; x++) {
        // Leave the outer columns alone so a wrapped sample cannot draw a line.
        if (x < 2 || x >= width - 2) continue;
        const sliced = (x + shift) % width;
        const redFrom = (x + chroma) % width;
        const blueFrom = (x - chroma + width) % width;
        const dest = (y * width + x) * channels;
        const sliceAt = (y * width + sliced) * channels;
        const redAt = (y * width + redFrom) * channels;
        const blueAt = (y * width + blueFrom) * channels;
        out[dest] = src[redAt] ?? 0;
        out[dest + 1] = src[sliceAt + 1] ?? 0;
        out[dest + 2] = src[blueAt + 2] ?? 0;
        if (channels > 3) out[dest + 3] = src[sliceAt + 3] ?? 255;
      }
    }
  }

  if (full) {
    for (let y = 1; y < height; y += 2) {
      for (let x = 0; x < width; x++) {
        const dest = (y * width + x) * channels;
        out[dest] = Math.round((out[dest] ?? 0) * 0.84);
        out[dest + 1] = Math.round((out[dest + 1] ?? 0) * 0.84);
        out[dest + 2] = Math.round((out[dest + 2] ?? 0) * 0.84);
      }
    }
    const pixels = width * height;
    for (let pixel = 0; pixel < pixels; pixel += 19) {
      const wobble = Math.floor(rng() * 18) - 9;
      const dest = pixel * channels;
      for (let channel = 0; channel < 3; channel++) {
        const value = (out[dest + channel] ?? 0) + wobble;
        out[dest + channel] = Math.max(0, Math.min(255, value));
      }
    }
  }

  return sharp(out, { raw: { width, height, channels } })
    .webp({ quality: 90 })
    .toBuffer();
}

async function pixelateRegion(
  input: Buffer,
  rng: () => number,
  fx: number
): Promise<Buffer> {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const span = 0.25 + Math.min(1, Math.max(0, fx)) * 0.15;
  const regionW = Math.max(8, Math.min(width, Math.round(width * span)));
  const regionH = Math.max(8, Math.min(height, Math.round(height * span)));
  const left = Math.floor(rng() * Math.max(1, width - regionW + 1));
  const top = Math.floor(rng() * Math.max(1, height - regionH + 1));
  const cell = 4 + Math.round(Math.min(1, Math.max(0, fx)) * 12);
  const extracted = await sharp(input)
    .extract({ left, top, width: regionW, height: regionH })
    .toBuffer();
  const finished = await pixelate(extracted, Math.max(2, cell));
  return blendTorn(input, finished, left, top, Math.floor(rng() * 1_000_000_000));
}

function clampByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function hash01(x: number, y: number, salt: number) {
  let n = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + salt) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

async function rawImage(input: Buffer) {
  return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function encodeRaw(
  data: Buffer,
  width: number,
  height: number,
  channels: 1 | 2 | 3 | 4
) {
  return sharp(data, { raw: { width, height, channels } })
    .webp({ quality: 90 })
    .toBuffer();
}

async function photocopy(input: Buffer, rng: () => number, harsh: boolean) {
  const salt = Math.floor(rng() * 1_000_000_000);
  const threshold = 118 + Math.floor(rng() * 40);
  const { data, info } = await rawImage(input);
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    const streak = 0.72 + hash01(0, y, salt) * 0.5;
    const broken = hash01(1, y, salt) < (harsh ? 0.09 : 0.04);
    for (let x = 0; x < width; x++) {
      const dest = (y * width + x) * channels;
      const grain = (hash01(x, y, salt) - 0.5) * (harsh ? 78 : 40);
      let lum =
        ((out[dest] ?? 0) * 0.3 +
          (out[dest + 1] ?? 0) * 0.59 +
          (out[dest + 2] ?? 0) * 0.11 +
          grain) *
        streak;
      if (broken && x % 19 < 9) lum = 236;
      const toward = lum > threshold ? 248 : 16;
      const mix = harsh ? 0.78 : 0.5;
      for (let channel = 0; channel < 3; channel++) {
        const value = out[dest + channel] ?? 0;
        out[dest + channel] = clampByte(value * (1 - mix) + toward * mix);
      }
      if (y % 4 === 3) {
        for (let channel = 0; channel < 3; channel++) {
          out[dest + channel] = clampByte((out[dest + channel] ?? 0) * 0.9);
        }
      }
    }
  }
  return encodeRaw(out, width, height, channels);
}

async function riso(input: Buffer, rng: () => number, full: boolean) {
  const shiftX = (full ? 6 : 3) + Math.floor(rng() * (full ? 16 : 7));
  const shiftY = (full ? 2 : 1) + Math.floor(rng() * (full ? 10 : 5));
  const salt = Math.floor(rng() * 1_000_000_000);
  const { data, info } = await rawImage(input);
  const { width, height, channels } = info;
  const src = Buffer.from(data);
  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dest = (y * width + x) * channels;
      const sx = (x - shiftX + width) % width;
      const sy = (y - shiftY + height) % height;
      const shifted = (sy * width + sx) * channels;
      for (let channel = 0; channel < 3; channel++) {
        const value = src[dest + channel] ?? 0;
        const levels = full ? 2 : 3;
        const poster =
          Math.round((value / 255) * (levels - 1)) * (255 / (levels - 1));
        const other = src[shifted + channel] ?? 0;
        const grain = (hash01(x, y, salt + channel) - 0.5) * 42;
        out[dest + channel] = clampByte(poster * 0.58 + other * 0.42 + grain);
      }
    }
  }
  return encodeRaw(out, width, height, channels);
}

async function staticLook(input: Buffer, rng: () => number, full: boolean) {
  const salt = Math.floor(rng() * 1_000_000_000);
  const bandCount = full ? 8 + Math.floor(rng() * 6) : 3;
  const fringe = full ? 5 + Math.floor(rng() * 8) : 2;
  const mix = full ? 0.4 : 0.22;
  const bands: { y: number; h: number; dropout: boolean; shift: number }[] = [];
  const { data, info } = await rawImage(input);
  const { width, height, channels } = info;
  for (let band = 0; band < bandCount; band++) {
    bands.push({
      y: Math.floor(rng() * height),
      h: 4 + Math.floor(rng() * (full ? 18 : 8)),
      dropout: rng() < (full ? 0.45 : 0.2),
      shift: 6 + Math.floor(rng() * (full ? 48 : 16)),
    });
  }
  const src = Buffer.from(data);
  const out = Buffer.from(data);
  for (let y = 0; y < height; y++) {
    const band = bands.find((item) => y >= item.y && y < item.y + item.h);
    for (let x = 0; x < width; x++) {
      if (x < 2 || x >= width - 2) continue;
      const dest = (y * width + x) * channels;
      const noise = hash01(x, y, salt) * 255;
      const sampleX = band ? (x + band.shift) % width : x;
      const redX = (x + fringe) % width;
      const blueX = (x - fringe + width) % width;
      const base = (y * width + sampleX) * channels;
      if (band?.dropout) {
        out[dest] = clampByte(noise);
        out[dest + 1] = clampByte(noise * 0.92);
        out[dest + 2] = clampByte(hash01(x, y, salt + 3) * 255);
      } else {
        for (let channel = 0; channel < 3; channel++) {
          const original = src[base + channel] ?? 0;
          out[dest + channel] = clampByte(original * (1 - mix) + noise * mix);
        }
      }
      const red = src[(y * width + redX) * channels] ?? out[dest] ?? 0;
      const blue = src[(y * width + blueX) * channels + 2] ?? out[dest + 2] ?? 0;
      out[dest] = clampByte((out[dest] ?? 0) * 0.65 + red * 0.35);
      out[dest + 2] = clampByte((out[dest + 2] ?? 0) * 0.65 + blue * 0.35);
    }
  }
  return encodeRaw(out, width, height, channels);
}

async function inRegion(
  input: Buffer,
  rng: () => number,
  effect: (region: Buffer) => Promise<Buffer>
) {
  const meta = await sharp(input).metadata();
  const width = meta.width ?? 1;
  const height = meta.height ?? 1;
  const span = 0.28 + rng() * 0.12;
  const regionW = Math.max(8, Math.min(width, Math.round(width * span)));
  const regionH = Math.max(8, Math.min(height, Math.round(height * span)));
  const left = Math.floor(rng() * Math.max(1, width - regionW + 1));
  const top = Math.floor(rng() * Math.max(1, height - regionH + 1));
  const extracted = await sharp(input)
    .extract({ left, top, width: regionW, height: regionH })
    .toBuffer();
  const finished = await effect(extracted);
  return blendTorn(input, finished, left, top, Math.floor(rng() * 1_000_000_000));
}

/** Blend a treated region through a ragged mask so it is not a hard rectangle. */
async function blendTorn(
  base: Buffer,
  region: Buffer,
  left: number,
  top: number,
  salt: number
) {
  const baseRaw = await rawImage(base);
  const regionRaw = await rawImage(region);
  const { width, height, channels } = baseRaw.info;
  const regionW = regionRaw.info.width;
  const regionH = regionRaw.info.height;
  const regionChannels = regionRaw.info.channels;
  const out = Buffer.from(baseRaw.data);
  for (let y = 0; y < regionH; y++) {
    for (let x = 0; x < regionW; x++) {
      const dx = x / regionW - 0.5;
      const dy = y / regionH - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const edge = 0.4 + (hash01(x, y, salt) - 0.5) * 0.2;
      if (dist > edge) continue;
      const fade = Math.min(1, (edge - dist) / 0.08);
      const bx = left + x;
      const by = top + y;
      if (bx < 0 || by < 0 || bx >= width || by >= height) continue;
      const dest = (by * width + bx) * channels;
      const src = (y * regionW + x) * regionChannels;
      for (let channel = 0; channel < 3; channel++) {
        const from = out[dest + channel] ?? 0;
        const to = regionRaw.data[src + channel] ?? 0;
        out[dest + channel] = clampByte(from * (1 - fade) + to * fade);
      }
    }
  }
  return encodeRaw(out, width, height, channels);
}

async function applyPost(
  image: Buffer,
  kind: "pixel" | "glitch" | "photocopy" | "riso" | "static",
  rng: () => number,
  fx: ArenaFx,
  full: boolean
) {
  if (kind === "pixel") {
    return full ? pixelate(image, 8) : pixelateRegion(image, rng, fx.pixel);
  }
  if (kind === "glitch") {
    if (full) return glitch(image, rng, 14, 40, true);
    const amount = Math.min(1, Math.max(0, fx.glitch));
    return glitch(
      image,
      rng,
      1 + Math.round(amount * 5),
      4 + Math.round(amount * 28),
      false
    );
  }
  if (kind === "photocopy") {
    return full
      ? photocopy(image, rng, true)
      : inRegion(image, rng, (region) => photocopy(region, rng, false));
  }
  if (kind === "riso") {
    return full
      ? riso(image, rng, true)
      : inRegion(image, rng, (region) => riso(region, rng, false));
  }
  return full
    ? staticLook(image, rng, true)
    : inRegion(image, rng, (region) => staticLook(region, rng, false));
}

export async function finishArenaImage(
  input: Buffer,
  primary: ArenaIngredientId,
  accents: readonly ArenaIngredientId[],
  fx: ArenaFx,
  rng: () => number
): Promise<Buffer> {
  let image = input;
  const primaryPost = arenaIngredient(primary).post;
  if (primaryPost) {
    image = await applyPost(image, primaryPost, rng, fx, true);
  }

  for (const accent of accents) {
    const post = arenaIngredient(accent).post;
    if (!post) continue;
    image = await applyPost(image, post, rng, fx, false);
  }

  return image;
}

function stamp(
  out: Buffer,
  width: number,
  height: number,
  channels: number,
  x0: number,
  y0: number,
  size: number,
  rgb: [number, number, number],
  alpha: number
) {
  const xStart = Math.max(0, Math.floor(x0));
  const yStart = Math.max(0, Math.floor(y0));
  const xEnd = Math.min(width, xStart + size);
  const yEnd = Math.min(height, yStart + size);
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      const dest = (y * width + x) * channels;
      for (let channel = 0; channel < 3; channel++) {
        const base = out[dest + channel] ?? 0;
        out[dest + channel] = clampByte(
          base * (1 - alpha) + rgb[channel] * alpha
        );
      }
    }
  }
}

async function ghostBitmap(image: Buffer, bitmap: Buffer, rng: () => number) {
  const base = await rawImage(image);
  const { width, height, channels } = base.info;
  const opacity = 0.06 + rng() * 0.04;
  const scale = 1 + rng() * 0.4;
  const size = Math.max(width, height, Math.round(Math.max(width, height) * scale));
  const scaled = await sharp(bitmap)
    .resize(size, size, { kernel: sharp.kernel.nearest, fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const left = Math.floor((size - width) / 2);
  const top = Math.floor((size - height) / 2);
  const overlay = Buffer.alloc(width * height * 4);
  const sourceChannels = scaled.info.channels;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src =
        ((top + y) * size + (left + x)) * sourceChannels;
      const dest = (y * width + x) * 4;
      const red = scaled.data[src] ?? 0;
      const green = scaled.data[src + 1] ?? 0;
      const blue = scaled.data[src + 2] ?? 0;
      const lum = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      overlay[dest] = red;
      overlay[dest + 1] = green;
      overlay[dest + 2] = blue;
      // Skip paper and mid-tone squares. Only the dark silhouette ghosts.
      overlay[dest + 3] = lum < 80 ? Math.round(opacity * 255) : 0;
    }
  }
  return sharp(base.data, { raw: { width, height, channels } })
    .composite([
      {
        input: overlay,
        raw: { width, height, channels: 4 },
        blend: "multiply",
      },
    ])
    .webp({ quality: 90 })
    .toBuffer();
}

async function scatterBitmap(
  image: Buffer,
  bitmap: Buffer,
  direction: "left" | "right",
  darkest: string,
  rng: () => number
) {
  const base = await rawImage(image);
  const { width, height, channels } = base.info;
  const sprite = await sharp(bitmap)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const spriteW = sprite.info.width;
  const spriteH = sprite.info.height;
  const spriteChannels = sprite.info.channels;
  const steps = 4 + Math.floor(rng() * 3);
  const cell = 4 + Math.floor(rng() * 4);
  const travel = width * (0.28 + rng() * 0.18);
  const dir = direction === "left" ? -1 : 1;
  const rgb = hexRgb(darkest);
  const out = Buffer.from(base.data);
  for (let py = 0; py < spriteH; py++) {
    for (let px = 0; px < spriteW; px++) {
      const src = (py * spriteW + px) * spriteChannels;
      const red = sprite.data[src] ?? 0;
      const green = sprite.data[src + 1] ?? 0;
      const blue = sprite.data[src + 2] ?? 0;
      const alpha = sprite.data[src + 3] ?? 255;
      const lum = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      if (alpha < 128 || lum > 170) continue;
      for (let step = 0; step < steps; step++) {
        const t = (step + 1) / (steps + 1);
        const fade = (1 - t) * 0.82;
        const x =
          width * 0.5 +
          (px - spriteW / 2) * cell +
          dir * t * travel;
        const y =
          height * 0.48 +
          (py - spriteH / 2) * cell +
          (hash01(px, py, step) - 0.5) * cell * 3;
        stamp(out, width, height, channels, x, y, cell, rgb, fade);
      }
    }
  }
  return encodeRaw(out, width, height, channels);
}

export async function applyArenaPixels(input: {
  image: Buffer;
  bitmap: Buffer | null;
  mode: ArenaPixelMode;
  direction: "left" | "right";
  darkest: string;
  rng: () => number;
}): Promise<Buffer> {
  if (!input.bitmap || input.mode === "none") return input.image;
  try {
    if (input.mode === "ghost") {
      return await ghostBitmap(input.image, input.bitmap, input.rng);
    }
    return await scatterBitmap(
      input.image,
      input.bitmap,
      input.direction,
      input.darkest,
      input.rng
    );
  } catch {
    return input.image;
  }
}

export async function disruptArenaImage(
  input: Buffer,
  strength: number,
  rng: () => number
): Promise<Buffer> {
  if (strength <= 0) return input;
  const amount = Math.min(0.7, strength);
  const salt = Math.floor(rng() * 1_000_000_000);
  const fringe = 1 + Math.round(amount * 2);
  const bandCount = 2 + Math.floor(rng() * 4);
  const { data, info } = await rawImage(input);
  const { width, height, channels } = info;
  const src = Buffer.from(data);
  const out = Buffer.from(data);
  const bands: { y: number; h: number; shift: number }[] = [];
  for (let band = 0; band < bandCount; band++) {
    bands.push({
      y: Math.floor(rng() * height),
      h: 2 + Math.floor(rng() * 6),
      shift: 2 + Math.floor(rng() * Math.max(2, amount * 14)),
    });
  }
  for (let y = 0; y < height; y++) {
    const band = bands.find((item) => y >= item.y && y < item.y + item.h);
    for (let x = 0; x < width; x++) {
      const dest = (y * width + x) * channels;
      const sampleX = band ? (x + band.shift) % width : x;
      const base = (y * width + sampleX) * channels;
      const noise = (hash01(x, y, salt) - 0.5) * 36 * amount;
      for (let channel = 0; channel < 3; channel++) {
        out[dest + channel] = clampByte((src[base + channel] ?? 0) + noise);
      }
      // A clamped sample at the last columns was drawing a dark line.
      if (x >= fringe + 2 && x < width - fringe - 2) {
        const redX = (x + fringe) % width;
        const blueX = (x - fringe + width) % width;
        const red = src[(y * width + redX) * channels] ?? out[dest] ?? 0;
        const blue =
          src[(y * width + blueX) * channels + 2] ?? out[dest + 2] ?? 0;
        out[dest] = clampByte((out[dest] ?? 0) * 0.72 + red * 0.28);
        out[dest + 2] = clampByte((out[dest + 2] ?? 0) * 0.72 + blue * 0.28);
      }
      if (y % 3 === 2 && x > 1 && x < width - 2) {
        for (let channel = 0; channel < 3; channel++) {
          out[dest + channel] = clampByte((out[dest + channel] ?? 0) * 0.93);
        }
      }
    }
  }
  return encodeRaw(out, width, height, channels);
}

export async function applyArenaPatch(
  input: Buffer,
  patch: ArenaPatch,
  rng: () => number
): Promise<Buffer> {
  if (patch === "none") return input;
  const { data, info } = await rawImage(input);
  const { width, height, channels } = info;
  const src = Buffer.from(data);
  const out = Buffer.from(data);
  const salt = Math.floor(rng() * 1_000_000_000);

  const shiftRow = (y: number, shift: number) => {
    for (let x = 2; x < width - 2; x++) {
      const from = ((x - 2 + shift) % (width - 4)) + 2;
      const dest = (y * width + x) * channels;
      const sample = (y * width + from) * channels;
      for (let channel = 0; channel < 3; channel++) {
        out[dest + channel] = src[sample + channel] ?? out[dest + channel] ?? 0;
      }
    }
  };

  if (patch === "slices") {
    const count = 4 + Math.floor(rng() * 4);
    for (let slice = 0; slice < count; slice++) {
      const y0 = 2 + Math.floor(rng() * Math.max(1, height - 8));
      const thick = 1 + Math.floor(rng() * 3);
      const shift = 4 + Math.floor(rng() * 10);
      for (let y = y0; y < Math.min(height - 2, y0 + thick); y++) shiftRow(y, shift);
    }
    return encodeRaw(out, width, height, channels);
  }

  if (patch === "band") {
    const y0 = Math.floor(height * (0.18 + rng() * 0.55));
    const thick = 8 + Math.floor(rng() * 16);
    const shift = 10 + Math.floor(rng() * 22);
    for (let y = y0; y < Math.min(height - 2, y0 + thick); y++) shiftRow(y, shift);
    return encodeRaw(out, width, height, channels);
  }

  const cx = Math.floor(width * (0.22 + rng() * 0.56));
  const cy = Math.floor(height * (0.22 + rng() * 0.56));
  const radius = Math.floor(Math.min(width, height) * (0.12 + rng() * 0.14));
  for (let y = Math.max(2, cy - radius); y < Math.min(height - 2, cy + radius); y++) {
    for (let x = Math.max(2, cx - radius); x < Math.min(width - 2, cx + radius); x++) {
      const dist = Math.hypot((x - cx) / radius, (y - cy) / radius);
      const edge = 0.7 + (hash01(x, y, salt) - 0.5) * 0.46;
      if (dist > edge) continue;
      const fade = Math.min(0.22, (edge - dist) * 0.3);
      const dest = (y * width + x) * channels;
      for (let channel = 0; channel < 3; channel++) {
        out[dest + channel] = clampByte(
          (out[dest + channel] ?? 0) * (1 - fade) + 236 * fade
        );
      }
    }
  }
  return encodeRaw(out, width, height, channels);
}

export async function applyArenaSeal(input: Buffer, rng: () => number): Promise<Buffer> {
  const { data, info } = await rawImage(input);
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  const corner = Math.floor(rng() * 4);
  const radius = 13 + Math.floor(rng() * 8);
  const inset = 40 + Math.floor(rng() * 24);
  const cx = corner % 2 === 0 ? inset : width - inset;
  const cy = corner < 2 ? inset : height - inset;
  const salt = Math.floor(rng() * 1_000_000_000);
  const red = [188, 42, 36];
  for (let y = cy - radius - 8; y <= cy + radius + 8; y++) {
    for (let x = cx - radius - 8; x <= cx + radius + 8; x++) {
      if (x < 12 || y < 12 || x >= width - 12 || y >= height - 12) continue;
      const dist = Math.hypot((x - cx) / radius, (y - cy) / radius);
      const edge = 0.82 + (hash01(x, y, salt) - 0.5) * 0.28;
      if (dist > edge) continue;
      const dest = (y * width + x) * channels;
      for (let channel = 0; channel < 3; channel++) {
        out[dest + channel] = red[channel] ?? 0;
      }
    }
  }
  return encodeRaw(out, width, height, channels);
}

/**
 * A drawn black mat is a near-uniform border on all four sides.
 * Cut it off and scale the picture back to the full frame.
 */
export async function fillIfFramed(input: Buffer): Promise<Buffer> {
  const { data, info } = await rawImage(input);
  const { width, height, channels } = info;
  const lum = (x: number, y: number) => {
    const i = (Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))) * channels;
    return (data[i] ?? 0) * 0.3 + (data[i + 1] ?? 0) * 0.59 + (data[i + 2] ?? 0) * 0.11;
  };
  const samples = [0.2, 0.35, 0.5, 0.65, 0.8];
  const meanAt = (at: (t: number) => number) => {
    const values = samples.map((t) => at(t));
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };
  const edge = meanAt((t) => lum(1, Math.floor(height * t)));
  if (edge > 48) return input;
  const insetOf = (at: (t: number, i: number) => number, length: number) => {
    const limit = Math.floor(length * 0.28);
    let depth = 0;
    while (depth < limit) {
      const band = meanAt((t) => at(t, depth));
      if (band > 55 || Math.abs(band - edge) > 36) break;
      depth += 1;
    }
    return depth;
  };
  const left = insetOf((t, i) => lum(i, Math.floor(height * t)), width);
  const right = insetOf((t, i) => lum(width - 1 - i, Math.floor(height * t)), width);
  const top = insetOf((t, i) => lum(Math.floor(width * t), i), height);
  const bottom = insetOf((t, i) => lum(Math.floor(width * t), height - 1 - i), height);
  if (Math.min(left, right, top, bottom) < 12) return input;
  const cropW = width - left - right;
  const cropH = height - top - bottom;
  if (cropW < width * 0.55 || cropH < height * 0.55) return input;
  return sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: cropW, height: cropH })
    .resize(width, height, { fit: "fill" })
    .webp({ quality: 90 })
    .toBuffer();
}

/** Drop a thin dark border left by a clamped sample or a drawn frame. */
export async function bleedDarkEdges(input: Buffer): Promise<Buffer> {
  const { data, info } = await rawImage(input);
  const { width, height, channels } = info;
  const out = Buffer.from(data);
  const columnMean = (x: number) => {
    let sum = 0;
    let count = 0;
    for (let y = 0; y < height; y += 4) {
      const i = (y * width + x) * channels;
      sum +=
        (out[i] ?? 0) * 0.3 + (out[i + 1] ?? 0) * 0.59 + (out[i + 2] ?? 0) * 0.11;
      count += 1;
    }
    return sum / Math.max(1, count);
  };
  const rowMean = (y: number) => {
    let sum = 0;
    let count = 0;
    for (let x = 0; x < width; x += 4) {
      const i = (y * width + x) * channels;
      sum +=
        (out[i] ?? 0) * 0.3 + (out[i + 1] ?? 0) * 0.59 + (out[i + 2] ?? 0) * 0.11;
      count += 1;
    }
    return sum / Math.max(1, count);
  };
  const copyColumn = (from: number, to: number) => {
    for (let y = 0; y < height; y++) {
      const source = (y * width + from) * channels;
      const dest = (y * width + to) * channels;
      out[dest] = out[source] ?? 0;
      out[dest + 1] = out[source + 1] ?? 0;
      out[dest + 2] = out[source + 2] ?? 0;
    }
  };
  const copyRow = (from: number, to: number) => {
    for (let x = 0; x < width; x++) {
      const source = (from * width + x) * channels;
      const dest = (to * width + x) * channels;
      out[dest] = out[source] ?? 0;
      out[dest + 1] = out[source + 1] ?? 0;
      out[dest + 2] = out[source + 2] ?? 0;
    }
  };
  for (let inset = 0; inset < 6; inset++) {
    const x = width - 1 - inset;
    const inner = Math.max(0, x - 10);
    if (columnMean(x) > columnMean(inner) - 28) break;
    copyColumn(inner, x);
  }
  for (let inset = 0; inset < 6; inset++) {
    const inner = Math.min(width - 1, inset + 10);
    if (columnMean(inset) > columnMean(inner) - 28) break;
    copyColumn(inner, inset);
  }
  for (let inset = 0; inset < 6; inset++) {
    const y = height - 1 - inset;
    const inner = Math.max(0, y - 10);
    if (rowMean(y) > rowMean(inner) - 28) break;
    copyRow(inner, y);
  }
  for (let inset = 0; inset < 6; inset++) {
    const inner = Math.min(height - 1, inset + 10);
    if (rowMean(inset) > rowMean(inner) - 28) break;
    copyRow(inner, inset);
  }
  return encodeRaw(out, width, height, channels);
}
