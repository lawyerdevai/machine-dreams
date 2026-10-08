// app/api/generate-datagram/route.ts
//
// v6 — adds the blended house-style layer we scoped earlier and deferred
// until the base engine (v4 motion/glitch) and the data-legibility pass (v5
// palette/rationale/variety) were both solid. Everything from v5 is intact;
// this only adds `styleWeights`.
//
// styleWeights are 8 continuous 0-1 dials, abstracted from documented,
// publicly-known digital-art TECHNIQUES (never named, never a specific
// artwork) — depth/layering, pixel-grid reduction, decay-vs-mundane
// collision, gestural minimalism, warm glow, reductive starkness, noir
// shadow, rendered/painterly finish. Claude blends all 8 together every
// time, in different proportions driven by that week's real numbers, so no
// single piece ever reads as "one mode" — every piece is part of the same
// family, drawing on the same pool of technique in a different mix. That's
// the whole point: recognizable as a family, not traceable to one source.
// No artist name, logo, or specific-artwork reference is permitted anywhere
// in this prompt or in the model's output — this rule is non-negotiable.
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WeekStats {
  weekLabel: string;
  fills: number;
  volumeEth: number;
  churn: number;
  wallets: number;
  volatility: number;
}

function sampleWeek(): WeekStats {
  return {
    weekLabel: new Date().toISOString().slice(0, 10),
    fills: 14 + Math.floor(Math.random() * 220),
    volumeEth: +(Math.random() * 9).toFixed(3),
    churn: 3 + Math.floor(Math.random() * 60),
    wallets: 4 + Math.floor(Math.random() * 70),
    volatility: +Math.random().toFixed(3),
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function interpretWeek(stats: WeekStats): Promise<string> {
  const res = await anthropic.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 1024,
    system:
      "You read real numbers from a pixel marketplace and say, in one honest " +
      "sentence, what you genuinely think happened this week. Do not describe " +
      "any image, scene, color, or object. Do not use metaphor yet. Just the " +
      "plainest true read of the pattern in these numbers. If the numbers are " +
      "unremarkable, say so plainly rather than inventing drama.",
    messages: [
      {
        role: "user",
        content:
          `Week: ${stats.weekLabel}\n` +
          `Pixel Market fills: ${stats.fills}\n` +
          `Volume: ${stats.volumeEth} ETH\n` +
          `Listings churn (opened + cancelled): ${stats.churn}\n` +
          `Unique wallets: ${stats.wallets}\n` +
          `Volatility (0-1): ${stats.volatility}\n\n` +
          `What's your honest one-sentence read of this week?`,
      },
    ],
  });
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("interpretWeek: no text in response");
  return text.text.trim();
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

const COMPOSITIONS = ["centered", "scattered", "grid", "radial", "collage"] as const;
type Composition = (typeof COMPOSITIONS)[number];

const GROUNDS = ["void", "pale", "flood"] as const;
type Ground = (typeof GROUNDS)[number];

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

function isPrimitive(x: unknown): x is Primitive {
  return typeof x === "string" && (PRIMITIVES as readonly string[]).includes(x);
}
function isComposition(x: unknown): x is Composition {
  return typeof x === "string" && (COMPOSITIONS as readonly string[]).includes(x);
}
function isGround(x: unknown): x is Ground {
  return typeof x === "string" && (GROUNDS as readonly string[]).includes(x);
}
function isRationaleEntry(x: unknown): x is RationaleEntry {
  return (
    !!x &&
    typeof x === "object" &&
    typeof (x as RationaleEntry).factor === "string" &&
    typeof (x as RationaleEntry).value === "string" &&
    typeof (x as RationaleEntry).effect === "string"
  );
}

function parseStyleWeights(x: unknown, rngSeed: number): StyleWeights {
  const out: Partial<StyleWeights> = {};
  const obj = typeof x === "object" && x !== null ? (x as Record<string, unknown>) : {};
  for (const dim of STYLE_DIMENSIONS) {
    const v = obj[dim];
    out[dim] = typeof v === "number" && Number.isFinite(v) ? clamp(v, 0, 1) : (hashStr(dim + rngSeed) % 1000) / 1000;
  }
  return out as StyleWeights;
}

async function directPiece(interpretation: string, stats: WeekStats): Promise<Directive> {
  const res = await anthropic.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 2560,
    temperature: 1,
    system:
      "You are the creative director for a generative art piece driven by a one-sentence " +
      "read of real marketplace data. You don't write a scene for an image model — you make " +
      "the actual creative decisions yourself, as JSON, for a code renderer to execute exactly. " +
      "The renderer runs live in a browser, animates individual shapes independently, derives its " +
      "own palette directly from the week's numbers, and scales shape counts/scatter by the numbers " +
      "too — so your job is choosing WHICH primitives, composition, ground and collision fit this " +
      "week's specific read, blending the series' house style for this piece, and explaining the " +
      "link between the data and your choices.\n\n" +
      `Primitives available (pick 1-4, order matters, first is dominant): ${PRIMITIVES.join(", ")}.\n` +
      "- distressed-figure: a rough, damaged humanoid or creature silhouette, torn or jagged, never a clean illustration\n" +
      "- particle-swarm: scattered lines, dots, or streaks with directional energy\n" +
      "- fractured-type: large broken/shattered numerals or letterforms, pulled from the week's own numbers\n" +
      "- geometric-fracture: sharp angular shards, cracks, triangulated breakage\n" +
      "- pattern-field: a repeating woven, gridded, or rippling texture with no subject\n" +
      "- found-object: a plain, recognizable, mundane everyday object or furniture silhouette (chair, mug, window, phone) rendered flat and ordinary\n" +
      "- mosaic-grid: an overhead grid of discrete cells/tiles that shift, some lit, most not\n" +
      "- line-structure: taut or slack structural lines, threads, wires, or cables under tension or none\n" +
      "- face: an abstract, slightly unsettling face — not a portrait, a mark that reads as a face\n" +
      "- rain: many thin falling strokes across the frame\n" +
      "- orbit-ring: concentric rings of small satellite marks circling a center\n" +
      "- wave-ribbon: one or more sine-curved ribbons of line sweeping across the frame\n\n" +
      `Compositions: ${COMPOSITIONS.join(", ")}. Avoid mosaic-grid + grid composition together unless ` +
      "churn or volatility specifically calls for a rigid, tiled read — that combination is the single " +
      "most overused result and must be earned, not defaulted to.\n" +
      "Grounds: void (near-black), pale (bone/paper), flood (one saturated color fills the frame). " +
      "Ground is usually void — that's the resting state for this series — reach for pale or flood " +
      "only when this week's specific read earns a real departure.\n\n" +
      "Collision: when true, force a pairing of something mundane/ordinary (found-object) directly " +
      "against something damaged/threatening (distressed-figure or geometric-fracture) in the same frame — " +
      "only use this when the data's volatility or drama actually earns it, not by default.\n\n" +
      "STYLE WEIGHTS — this is what makes every piece feel like it belongs to the same unseen family. " +
      "Output a value from 0 to 1 for each of these 8 dimensions, EVERY time, blended in different " +
      "proportions depending on this week's specific read. Never treat these as a mode to switch between " +
      "— always a blend. A viewer should be able to look at many pieces and feel they're all drawn from " +
      "the same deep well of technique without being able to name any one source, because none dominates " +
      "and the mix is different every week:\n" +
      "- depthLayering (0-1): how much the piece reads as stacked, offset layers with real depth vs. one flat plane\n" +
      "- pixelGridReduction (0-1): how much the whole image gets pulled toward a coarse, blocky pixel grid\n" +
      "- decayCollision (0-1): how strongly something ordinary and something damaged are forced into the same frame\n" +
      "- gestureMinimalism (0-1): how sparse and economical the piece is — fewer marks, bolder, more empty ground\n" +
      "- glowWarmth (0-1): how much warm, soft bloom/glow washes over the piece\n" +
      "- reductiveStarkness (0-1): how flat, high-contrast and texture-free the piece reads, the opposite pole from depthLayering\n" +
      "- noirShadow (0-1): how dark, shadow-heavy and vignetted the edges of the frame get\n" +
      "- renderedFinish (0-1): how soft/painterly the edges feel vs. crisp flat vector\n\n" +
      "A quiet, unremarkable week should still get a full, deliberate blend across all 8 — never default " +
      "to 0.5 across the board, that is the one blend to avoid, since it reads as no decision at all.\n\n" +
      "Respond with ONLY this JSON shape, no prose outside it:\n" +
      "{\n" +
      '  "note": "1-2 sentences, your own voice, the overall read of the piece",\n' +
      '  "rationale": [\n' +
      '    {"factor": "short name of the data point", "value": "its actual value this week", ' +
      '"effect": "the specific visual choice it drove, stated plainly"}\n' +
      "    // 3 to 5 of these, one per notable number — fills, volume, churn, wallets, volatility\n" +
      "  ],\n" +
      '  "primitives": ["..."], "composition": "...", "ground": "...", ' +
      '"collision": false, "intensity": 0.5,\n' +
      '  "styleWeights": {"depthLayering": 0, "pixelGridReduction": 0, "decayCollision": 0, ' +
      '"gestureMinimalism": 0, "glowWarmth": 0, "reductiveStarkness": 0, "noirShadow": 0, "renderedFinish": 0}\n' +
      "}\n\n" +
      "Each rationale entry must name a REAL number from the stats given, not a vague impression. " +
      "Vary primitive/composition/ground choices and the style blend hard from call to call — don't let " +
      "any one become a default. Reach for the newer primitives (face, rain, orbit-ring, wave-ribbon) " +
      "often, not just the original eight. A quiet week does not have to mean a quiet piece, and a wild " +
      "week does not have to mean a crowded one — let the specific read decide.",
    messages: [
      { role: "user", content: `Read: ${interpretation}\n\nRaw stats for reference: ${JSON.stringify(stats)}` },
    ],
  });
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("directPiece: no text in response");
  const match = text.text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("directPiece: no JSON found in response: " + text.text.slice(0, 200));
  const parsed = JSON.parse(match[0]);
  const primitives: Primitive[] = (Array.isArray(parsed.primitives) ? parsed.primitives : [])
    .filter(isPrimitive)
    .slice(0, 4);
  const rationale: RationaleEntry[] = (Array.isArray(parsed.rationale) ? parsed.rationale : [])
    .filter(isRationaleEntry)
    .slice(0, 6);
  return {
    note: typeof parsed.note === "string" ? parsed.note : "No note returned.",
    rationale,
    primitives: primitives.length ? primitives : ["pattern-field"],
    composition: isComposition(parsed.composition) ? parsed.composition : "scattered",
    ground: isGround(parsed.ground) ? parsed.ground : "void",
    collision: Boolean(parsed.collision),
    intensity: typeof parsed.intensity === "number" ? clamp(parsed.intensity, 0, 1) : 0.5,
    styleWeights: parseStyleWeights(parsed.styleWeights, hashStr(JSON.stringify(stats))),
  };
}

export async function POST() {
  try {
    const stats = sampleWeek();
    const seed = hashStr(JSON.stringify(stats));

    const interpretation = await interpretWeek(stats);
    const directive = await directPiece(interpretation, stats);

    return NextResponse.json({
      stats,
      seed,
      interpretation,
      directive,
    });
  } catch (err) {
    console.error("[generate-datagram]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "unknown error" }, { status: 500 });
  }
}
