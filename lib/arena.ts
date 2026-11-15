import "server-only";

import { createPublicClient, http, isAddress } from "viem";
import { verifyMessage } from "viem/actions";
import { mainnet } from "viem/chains";
import { createHash } from "node:crypto";
import {
  ARENA_INGREDIENTS,
  ingredientWeight,
  type ArenaIngredientId,
} from "@/lib/arena-schools";
import { checkOwnership } from "@/lib/check-ownership";
import { redis } from "@/lib/redis";
import { readArenaCreateMessage } from "@/lib/routes";

/**
 * Server gate for the signed ownership check.
 * The create page always asks for a wallet signature.
 * Set this to false only for local development without a wallet.
 */
export const ARENA_REQUIRE_OWNERSHIP = true;

const ARENA_PREFIX = "arena:";
const ARENA_INDEX = "arena:index";
const LOCK_PREFIX = "arena:lock:";
const RATE_PREFIX = "arena:rate:";
const RATE_LIMIT = 5;
const RATE_WINDOW_SECONDS = 60 * 60;
const LOCK_SECONDS = 180;
const SIGNATURE_MAX_AGE_MS = 10 * 60 * 1000;
const SIGNATURE_FUTURE_SKEW_MS = 2 * 60 * 1000;

export const FRAMING = [
  "small figure in vast empty space",
  "large figure filling the frame",
  "low angle looking up",
  "tight on the upper body and the action",
  "off-centre with open space on one side",
  "cropped by the edge of the picture",
] as const;

export const DIRECTION = ["left", "right"] as const;

export const MARKS = ["restrained", "moderate", "explosive"] as const;

/** One required action. The figure is mid-motion, never standing still. */
export const ACTIONS = [
  "lunging",
  "leaping",
  "striking",
  "guarding",
  "spinning",
  "dodging",
  "throwing",
  "sweeping",
  "bracing for impact",
  "charging",
] as const;

export type ArenaAction = (typeof ACTIONS)[number];

export const ACTION_NOUN: Record<ArenaAction, string> = {
  lunging: "Lunge",
  leaping: "Leap",
  striking: "Strike",
  guarding: "Guard",
  spinning: "Spin",
  dodging: "Dodge",
  throwing: "Throw",
  sweeping: "Sweep",
  "bracing for impact": "Brace",
  charging: "Charge",
};

/** Fallback titles name a texture, never a moment in time. */
export const TEXTURES = [
  "Torn",
  "Splattered",
  "Smeared",
  "Grainy",
  "Broken",
  "Scraped",
  "Frayed",
  "Blotted",
] as const;

/** Interference mark drawn in code. About 30% of pieces get none. */
export const PATCHES = ["torn", "slices", "band", "none"] as const;

export type ArenaPatch = (typeof PATCHES)[number];

export const DISSOLUTION = [
  "barely a figure",
  "half-resolved",
  "clearer figure with broken edges",
] as const;

export type ArenaPalette = {
  name: string;
  /** Pure black, grey, and white, or black on a paper white. */
  mono: boolean;
  darkest: string;
};

/** Colour is chosen here. Ingredient text does not name a hue. */
export const PALETTES: readonly ArenaPalette[] = [
  { name: "black on bone white", mono: true, darkest: "#141210" },
  { name: "black, grey and white only", mono: true, darkest: "#141210" },
  { name: "black, bone and vermilion", mono: false, darkest: "#141210" },
  { name: "indigo ink, pale grey and mustard", mono: false, darkest: "#1c2454" },
  { name: "charcoal, ash and sulphur yellow", mono: false, darkest: "#2a2a28" },
  { name: "deep forest green and cream", mono: false, darkest: "#1a3324" },
  { name: "dark brown, sand and rust", mono: false, darkest: "#3a2418" },
  { name: "cobalt blue on off-white", mono: false, darkest: "#1d3fbf" },
  { name: "black, cream and acid green", mono: false, darkest: "#141210" },
  { name: "violet, bone and black", mono: false, darkest: "#141210" },
  { name: "oxblood, black and cream", mono: false, darkest: "#141210" },
  { name: "teal, black and pale peach", mono: false, darkest: "#141210" },
  { name: "dark navy and pale pink", mono: false, darkest: "#1a2340" },
  { name: "olive, black and chalk", mono: false, darkest: "#141210" },
];

export const INTERFERENCE = [
  "a huge looming slab or edge cutting across one side",
  "a foreground smear crossing the lower third",
  "torn paper strips",
  "a scribble field",
  "ghost echoes of the figure",
  "a dripping edge from the top",
  "a large pale disc",
  "vertical streaks",
  "a halftone patch",
  "tape marks and stamp-like blocks (never letters or numbers)",
  "a diagonal cut across the picture",
  "scattered fragments",
] as const;

export type ArenaPixelMode = "ghost" | "scatter" | "none";

/**
 * Not used. The fighter chooses the pose. This list stays so a pose
 * is never picked from it by mistake.
 */
export const POSES = [
  "preparing",
  "entering",
  "mid-fight",
  "standing after",
] as const;

export type ArenaFx = {
  pixel: number;
  glitch: number;
};

export type ArenaDeal = {
  hand: ArenaIngredientId[];
  framing: (typeof FRAMING)[number];
  direction: (typeof DIRECTION)[number];
  marks: (typeof MARKS)[number];
  action: ArenaAction;
  texture: (typeof TEXTURES)[number];
  /** Code overlay. "none" draws no patch. */
  patch: ArenaPatch;
  /** About one piece in five gets a small plain red seal. */
  seal: boolean;
  dissolution: (typeof DISSOLUTION)[number];
  palette: ArenaPalette;
  interference: string[];
  /** 0 means the disruption layer is skipped. */
  disruption: number;
  pixelMode: ArenaPixelMode;
  /** Flux seed, taken from the same token hash as the hand. */
  fluxSeed: number;
};

export type ArenaPortrait = {
  tokenId: string;
  name: string;
  type: string;
  title: string;
  primary: ArenaIngredientId;
  accents: ArenaIngredientId[];
  fx: ArenaFx;
  style: string;
  scene: string;
  /** Final text sent to the image step: style, scene, and the fixed ending. */
  imagePrompt: string;
  dissolution: string;
  palette: string;
  interference: string[];
  action: ArenaAction;
  patch: ArenaPatch;
  seal: boolean;
  disruption: number;
  pixelMode: ArenaPixelMode;
  imageUrl: string;
  createdAt: string;
  /** Wallet that drew this portrait. */
  creator: string;
};

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tokenDigest(tokenId: string, variation = 0) {
  const offset = Math.max(0, Math.floor(variation));
  return createHash("sha256").update(`${tokenId.trim()}:${offset}`).digest();
}

function pickDissolution(rng: () => number) {
  const roll = rng();
  if (roll < 0.5) return DISSOLUTION[0];
  if (roll < 0.85) return DISSOLUTION[1];
  return DISSOLUTION[2];
}

function pickPalette(rng: () => number): ArenaPalette {
  const mono = PALETTES.filter((item) => item.mono);
  const colour = PALETTES.filter((item) => !item.mono);
  const group = rng() < 0.25 ? mono : colour;
  return group[Math.floor(rng() * group.length)] ?? PALETTES[0];
}

function pickInterference(rng: () => number): string[] {
  const roll = rng();
  const count = roll < 0.15 ? 0 : roll < 0.575 ? 1 : 2;
  const pool: string[] = [...INTERFERENCE];
  const picked: string[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(rng() * pool.length);
    picked.push(pool[index]!);
    pool.splice(index, 1);
  }
  return picked;
}

function pickDisruption(rng: () => number) {
  if (rng() < 0.25) return 0;
  return Math.round((0.18 + rng() * 0.52) * 100) / 100;
}

function pickPixelMode(rng: () => number): ArenaPixelMode {
  const roll = rng();
  if (roll < 0.25) return "none";
  if (roll < 0.625) return "ghost";
  return "scatter";
}

function pickPatch(rng: () => number): ArenaPatch {
  if (rng() < 0.3) return "none";
  const marks = PATCHES.filter((item) => item !== "none");
  return marks[Math.floor(rng() * marks.length)] ?? "torn";
}

export function arenaTextureTitle(
  texture: string,
  ingredientName: string,
  action: ArenaAction
) {
  return `${texture} ${ingredientName} ${ACTION_NOUN[action]}`;
}

function pickWeighted(
  items: ArenaIngredientId[],
  weights: number[],
  rng: () => number
): ArenaIngredientId {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = rng() * total;
  for (let i = 0; i < items.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

/**
 * Same token id and variation always deal the same hand and the same
 * dissolution, palette, interference, disruption, and pixel mode.
 * Variation 0 is the portrait. Other values are for the lab only.
 */
export function dealArenaHand(
  tokenId: string,
  type: string,
  variation = 0
): ArenaDeal {
  const digest = tokenDigest(tokenId, variation);
  const rng = mulberry32(digest.readUInt32BE(0));
  const pool: ArenaIngredientId[] = ARENA_INGREDIENTS.map((item) => item.id);
  const hand: ArenaIngredientId[] = [];
  while (hand.length < 4 && pool.length > 0) {
    const weights = pool.map((id) => ingredientWeight(id, type));
    const picked = pickWeighted(pool, weights, rng);
    hand.push(picked);
    pool.splice(pool.indexOf(picked), 1);
  }
  const framing = FRAMING[Math.floor(rng() * FRAMING.length)] ?? FRAMING[0];
  const direction = rng() < 0.5 ? DIRECTION[0] : DIRECTION[1];
  const marks = MARKS[Math.floor(rng() * MARKS.length)] ?? MARKS[0];
  const dissolution = pickDissolution(rng);
  const palette = pickPalette(rng);
  const interference = pickInterference(rng);
  const disruption = pickDisruption(rng);
  const pixelMode = pickPixelMode(rng);
  const action = ACTIONS[Math.floor(rng() * ACTIONS.length)] ?? ACTIONS[0];
  const texture = TEXTURES[Math.floor(rng() * TEXTURES.length)] ?? TEXTURES[0];
  const patch = pickPatch(rng);
  const seal = rng() < 0.2;
  const fluxSeed = (digest.readUInt32BE(4) % 2147483646) + 1;
  return {
    hand,
    framing,
    direction,
    marks,
    action,
    texture,
    patch,
    seal,
    dissolution,
    palette,
    interference,
    disruption,
    pixelMode,
    fluxSeed,
  };
}

function streamRng(tokenId: string, variation: number, offset: number) {
  return mulberry32(tokenDigest(tokenId, variation).readUInt32BE(offset));
}

/** Ingredient post-process. Separate from the deal so it stays put. */
export function arenaFinishRng(tokenId: string, variation = 0) {
  return streamRng(tokenId, variation, 8);
}

/** Normie bitmap composite. */
export function arenaPixelRng(tokenId: string, variation = 0) {
  return streamRng(tokenId, variation, 12);
}

/** Disruption layer after the ingredient post-process. */
export function arenaDisruptRng(tokenId: string, variation = 0) {
  return streamRng(tokenId, variation, 16);
}

/** Torn patch, slices, or shifted band. */
export function arenaPatchRng(tokenId: string, variation = 0) {
  return streamRng(tokenId, variation, 20);
}

/** Position of the red seal, when this piece has one. */
export function arenaSealRng(tokenId: string, variation = 0) {
  return streamRng(tokenId, variation, 24);
}

export function isArenaEnabled() {
  return process.env.NEXT_PUBLIC_ARENA_ENABLED === "true";
}

export function arenaKey(tokenId: string) {
  return `${ARENA_PREFIX}${tokenId}`;
}

function lockKey(tokenId: string) {
  return `${LOCK_PREFIX}${tokenId}`;
}

export function isArenaTokenId(value: string) {
  if (!/^\d+$/.test(value)) return false;
  const n = Number(value);
  return n >= 0 && n <= 9999;
}

export async function getArenaPortrait(
  tokenId: string
): Promise<ArenaPortrait | null> {
  const data = await redis.get<ArenaPortrait>(arenaKey(tokenId));
  if (!data || typeof data !== "object" || !data.imageUrl) return null;
  return data;
}

export async function saveArenaPortrait(portrait: ArenaPortrait): Promise<void> {
  await redis.set(arenaKey(portrait.tokenId), portrait);
  await redis.sadd(ARENA_INDEX, portrait.tokenId);
}

export async function listArenaPortraits(
  limit: number,
  primary?: ArenaIngredientId
): Promise<{ items: ArenaPortrait[]; total: number }> {
  const ids = await redis.smembers<string[]>(ARENA_INDEX);
  if (!ids?.length) return { items: [], total: 0 };

  const keys = ids.map((id) => arenaKey(String(id)));
  const portraits: ArenaPortrait[] = [];
  const chunkSize = 100;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const batch = await redis.mget<(ArenaPortrait | null)[]>(...chunk);
    for (const record of batch) {
      if (!record?.imageUrl) continue;
      if (primary && record.primary !== primary) continue;
      portraits.push(record);
    }
  }

  portraits.sort((a, b) => {
    const left = Date.parse(a.createdAt);
    const right = Date.parse(b.createdAt);
    return (Number.isFinite(right) ? right : 0) - (Number.isFinite(left) ? left : 0);
  });

  const capped = Math.max(0, limit);
  return { items: portraits.slice(0, capped), total: portraits.length };
}

/** One in-flight draw per Normie. Returns false when another draw holds the lock. */
export async function acquireArenaLock(tokenId: string): Promise<boolean> {
  const result = await redis.set(lockKey(tokenId), "1", {
    nx: true,
    ex: LOCK_SECONDS,
  });
  return result === "OK";
}

export async function releaseArenaLock(tokenId: string): Promise<void> {
  await redis.del(lockKey(tokenId));
}

/**
 * Five create attempts per IP per hour. Call only after a lock is held,
 * and release the lock if this returns false.
 */
export async function consumeArenaRateLimit(ip: string): Promise<boolean> {
  const safe = ip.replace(/[^a-zA-Z0-9:.]/g, "").slice(0, 64) || "unknown";
  const key = `${RATE_PREFIX}${safe}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, RATE_WINDOW_SECONDS);
  }
  return count <= RATE_LIMIT;
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return raw;
}

let publicClient: ReturnType<typeof createPublicClient> | null = null;

function mainnetClient() {
  if (!publicClient) {
    const rpcUrl =
      process.env.ETH_RPC_URL?.trim() ||
      process.env.MAINNET_RPC_URL?.trim() ||
      "https://ethereum-rpc.publicnode.com";
    publicClient = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl),
    });
  }
  return publicClient;
}

export type ArenaAuthResult =
  | { ok: true; wallet: string }
  | { ok: false; message: string };

/**
 * The message must match the token, be fresh, and be signed by `wallet`.
 * viem's public-client verifyMessage accepts an ordinary key and falls
 * back to ERC-1271 / ERC-6492 for smart wallets. Ownership then includes
 * delegate.xyz.
 */
export async function authorizeArenaCreate(input: {
  tokenId: string;
  wallet: string;
  message: string;
  signature: string;
}): Promise<ArenaAuthResult> {
  const wallet = input.wallet.trim();
  if (!isAddress(wallet)) {
    return { ok: false, message: "Connect a wallet and sign to draw." };
  }
  if (!/^0x[0-9a-fA-F]+$/.test(input.signature)) {
    return { ok: false, message: "Connect a wallet and sign to draw." };
  }

  const parsed = readArenaCreateMessage(input.message);
  if (!parsed || parsed.tokenId !== input.tokenId) {
    return { ok: false, message: "Connect a wallet and sign to draw." };
  }

  const age = Date.now() - parsed.issuedAt;
  if (age > SIGNATURE_MAX_AGE_MS || age < -SIGNATURE_FUTURE_SKEW_MS) {
    return {
      ok: false,
      message: "That signature expired. Sign again to draw.",
    };
  }

  try {
    const valid = await verifyMessage(mainnetClient(), {
      address: wallet,
      message: input.message,
      signature: input.signature as `0x${string}`,
    });
    if (!valid) {
      return { ok: false, message: "Connect a wallet and sign to draw." };
    }
  } catch {
    return {
      ok: false,
      message: "The signature could not be checked. Please try again.",
    };
  }

  try {
    const owns = await checkOwnership(wallet, input.tokenId);
    if (!owns) {
      return {
        ok: false,
        message:
          "This wallet can't draw for that Normie. Connect the wallet that holds it, or a delegate.xyz wallet, and sign again.",
      };
    }
  } catch {
    return {
      ok: false,
      message: "Couldn't confirm this wallet right now. Please try again.",
    };
  }

  return { ok: true, wallet: wallet.toLowerCase() };
}
