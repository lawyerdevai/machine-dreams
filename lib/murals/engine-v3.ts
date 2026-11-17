/**
 * Arena Murals engine v3. Used by the dev route and generateMural.
 */
import sharp from "sharp";
import { anthropic, generateImage, parseClaudeJson } from "@/lib/ai";
import { pickDummySeasonV2, seasonIdOfV2 } from "@/lib/arena-murals-dummy-v2";
import {
  pickFactionKits,
  type FactionKitsV3,
} from "@/lib/arena-murals-figures-v3";
import { pickSceneKit, type SceneKit } from "@/lib/arena-murals-scenes-v3";
import {
  pickStyleMix,
  type MixLevelV3,
  type StyleMixV3,
} from "@/lib/arena-murals-styles-v3";
import { buildBriefV3 } from "./build-brief-v3";
import type { MuralDirection } from "./direction";
import type { SeasonRecord } from "./season";
import type { NormieCastMember } from "./types";

const IMAGE_SUFFIX =
  "Flat artwork filling the entire frame. No text, no letters, no numerals, no writing of any kind. Not a photograph of an object, wall, or cloth.";

const VISION_CHECK =
  'Look at this image. Respond with JSON only: {"hasText": boolean, "isPhotoOfAnObject": boolean, "looksLikeGlossyAIRender": boolean, "looksLikeChild": boolean}. hasText means any letters, numerals, or lettering-like marks. isPhotoOfAnObject means it shows a physical object, wall, cloth, frame, or room instead of flat artwork filling the frame. looksLikeGlossyAIRender is true for smooth realistic rendering of skin, fur, or fabric, soft cinematic lighting, glow, or halos instead of looking made in a physical or digital medium. looksLikeChild is true if any humanlike figure (human, android, alien, or zombie in human shape) appears to be a child or teenager, or has childlike proportions or a youthful cartoon face.';

const TONES = ["combat", "quiet", "other"] as const;
type MuralToneV3 = (typeof TONES)[number];

function pickTargetTone(forceCombat: boolean): MuralToneV3 {
  if (forceCombat) return "combat";
  const roll = Math.random();
  if (roll < 0.5) return "combat";
  if (roll < 0.9) return "quiet";
  return "other";
}

type UnifiedBriefV3 = {
  title: string;
  style: string;
  medium: string;
  tone: MuralToneV3;
  moment: string;
  scene: string;
  figures: string[];
  caption: string;
  imagePrompt: string;
  statement: string;
};

export type RunV3Input = {
  lastSeasonId?: string;
  forceTone?: string;
  usedMedia?: string[];
  usedStyles?: string[];
  usedPalettes?: string[];
  usedCompositions?: string[];
  usedFigures?: string[];
  usedBeats?: string[];
  /** When set, use this season instead of picking. */
  season?: SeasonRecord;
  /** Text-path Normie cast; ignored on the test-data path. */
  normieCast?: NormieCastMember[];
  /** Directed mode; omitted or empty must not change the brief. */
  direction?: MuralDirection;
};

export type RunV3Result =
  | {
      ok: true;
      version: "v3";
      engine: "v3";
      seasonId: string;
      seasonName: string;
      title: string;
      style: string;
      medium: string;
      tone: MuralToneV3;
      moment: string;
      scene: string;
      figures: string[];
      caption: string;
      violenceLevel: string;
      castSize: string;
      beat: string;
      mixLevel: MixLevelV3;
      styles: string[];
      palette: string | null;
      composition: string | null;
      texture: string | null;
      statement: string;
      flagged: boolean;
      flags: string[];
      imageDataUrl: string;
      imageBytes: Buffer;
    }
  | { ok: false; message: string; stage: "brief" | "image" | "vision" };


function parseTone(value: unknown): MuralToneV3 | null {
  if (typeof value !== "string") return null;
  const tone = value.trim().toLowerCase();
  if (tone === "political") return "other";
  return (TONES as readonly string[]).includes(tone)
    ? (tone as MuralToneV3)
    : null;
}

function parseFigures(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .slice(0, 12);
}

function parseBrief(text: string): UnifiedBriefV3 | null {
  let parsed: {
    title?: unknown;
    style?: unknown;
    medium?: unknown;
    tone?: unknown;
    moment?: unknown;
    scene?: unknown;
    figures?: unknown;
    caption?: unknown;
    imagePrompt?: unknown;
    statement?: unknown;
  };
  try {
    parsed = parseClaudeJson(text);
  } catch {
    return null;
  }

  const title =
    typeof parsed.title === "string" ? parsed.title.trim().replace(/\s+/g, " ") : "";
  const style =
    typeof parsed.style === "string" ? parsed.style.trim().replace(/\s+/g, " ") : "";
  const medium =
    typeof parsed.medium === "string"
      ? parsed.medium.trim().replace(/\s+/g, " ")
      : "";
  const moment =
    typeof parsed.moment === "string"
      ? parsed.moment.trim().replace(/\s+/g, " ")
      : "";
  const scene =
    typeof parsed.scene === "string" ? parsed.scene.trim().replace(/\s+/g, " ") : "";
  const figures = parseFigures(parsed.figures);
  let caption =
    typeof parsed.caption === "string"
      ? parsed.caption.trim().replace(/\s+/g, " ")
      : "";
  if (caption.length > 220) caption = caption.slice(0, 220).trim();
  const statement =
    typeof parsed.statement === "string"
      ? parsed.statement.trim().replace(/\s+/g, " ")
      : "";
  const tone = parseTone(parsed.tone);
  let imagePrompt =
    typeof parsed.imagePrompt === "string"
      ? parsed.imagePrompt.trim().replace(/\s+/g, " ")
      : "";

  if (
    !title ||
    !style ||
    !medium ||
    !moment ||
    !scene ||
    figures.length === 0 ||
    !caption ||
    !statement ||
    !tone ||
    !imagePrompt
  ) {
    return null;
  }
  if (!imagePrompt.includes(IMAGE_SUFFIX)) {
    imagePrompt = `${imagePrompt} ${IMAGE_SUFFIX}`;
  }
  return {
    title,
    style,
    medium,
    tone,
    moment,
    scene,
    figures,
    caption,
    imagePrompt,
    statement,
  };
}

async function requestBrief(input: {
  season: SeasonRecord;
  usedMedia: string[];
  usedFigures: string[];
  usedBeats: string[];
  startingDirection: string;
  styleMarks: string | null;
  factionKits: FactionKitsV3;
  sceneKit: SceneKit;
  targetTone: MuralToneV3;
  forceCombat: boolean;
  normieCast?: NormieCastMember[];
  direction?: MuralDirection;
}): Promise<UnifiedBriefV3 | null> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: buildBriefV3({
          startingDirection: input.startingDirection,
          styleMarks: input.styleMarks,
          usedMedia: input.usedMedia,
          usedFigures: input.usedFigures,
          usedBeats: input.usedBeats,
          factionKits: input.factionKits,
          sceneKit: input.sceneKit,
          season: input.season,
          targetTone: input.targetTone,
          forceCombat: input.forceCombat,
          ...(input.normieCast ? { normieCast: input.normieCast } : {}),
          ...(input.direction ? { direction: input.direction } : {}),
        }),
      },
    ],
  });
  const block = message.content.find((part) => part.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  return parseBrief(text);
}

async function toPngDataUrl(bytes: Buffer): Promise<string> {
  const png = await sharp(bytes).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

async function renderFlux(prompt: string): Promise<Buffer> {
  const imageUrl = await generateImage(prompt, { aspectRatio: "3:2" });
  const fetched = await fetch(imageUrl);
  if (!fetched.ok) throw new Error("flux_fetch_failed");
  return Buffer.from(await fetched.arrayBuffer());
}

type VisionFlags = {
  hasText: boolean;
  isPhotoOfAnObject: boolean;
  looksLikeGlossyAIRender: boolean;
  looksLikeChild: boolean;
};

async function checkImage(bytes: Buffer): Promise<VisionFlags> {
  const jpeg = await sharp(bytes)
    .resize({ width: 1024, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: jpeg.toString("base64"),
            },
          },
          { type: "text", text: VISION_CHECK },
        ],
      },
    ],
  });
  const block = message.content.find((part) => part.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  try {
    const parsed = parseClaudeJson<{
      hasText?: unknown;
      isPhotoOfAnObject?: unknown;
      looksLikeGlossyAIRender?: unknown;
      looksLikeChild?: unknown;
    }>(text);
    return {
      hasText: parsed.hasText === true,
      isPhotoOfAnObject: parsed.isPhotoOfAnObject === true,
      looksLikeGlossyAIRender: parsed.looksLikeGlossyAIRender === true,
      looksLikeChild: parsed.looksLikeChild === true,
    };
  } catch {
    return {
      hasText: false,
      isPhotoOfAnObject: false,
      looksLikeGlossyAIRender: false,
      looksLikeChild: false,
    };
  }
}

function failsCheck(check: VisionFlags) {
  return (
    check.hasText ||
    check.isPhotoOfAnObject ||
    check.looksLikeGlossyAIRender ||
    check.looksLikeChild
  );
}

function flagsFromCheck(check: VisionFlags): string[] {
  const flags: string[] = [];
  if (check.hasText) flags.push("hasText");
  if (check.isPhotoOfAnObject) flags.push("isPhotoOfAnObject");
  if (check.looksLikeGlossyAIRender) flags.push("looksLikeGlossyAIRender");
  if (check.looksLikeChild) flags.push("looksLikeChild");
  return flags;
}

function stringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export async function runV3(input: RunV3Input = {}): Promise<RunV3Result> {
  const lastSeasonId =
    typeof input.lastSeasonId === "string" ? input.lastSeasonId : undefined;
  const forceTone =
    typeof input.forceTone === "string" ? input.forceTone.trim().toLowerCase() : "";
  const forceCombat = forceTone === "combat";
  const usedMedia = stringList(input.usedMedia, 10);
  const usedStyles = stringList(input.usedStyles, 20);
  const usedPalettes = stringList(input.usedPalettes, 8);
  const usedCompositions = stringList(input.usedCompositions, 8);
  const usedFigures = stringList(input.usedFigures, 10);
  const usedBeats = stringList(input.usedBeats, 10);

  const targetTone = pickTargetTone(forceCombat);
  const season =
    input.season ??
    pickDummySeasonV2({
      lastSeasonId,
      combatOnly: forceCombat || targetTone === "combat",
    });
  const mix: StyleMixV3 = pickStyleMix({
    usedStyles,
    usedPalettes,
    usedCompositions,
  });
  const startingDirection = mix.startingDirection;
  const styleMarks = mix.styleMarks;
  const factionKits = pickFactionKits();
  const sceneKit = pickSceneKit(usedBeats);
  const normieCast = input.normieCast;
  const direction = input.direction;

  let brief: UnifiedBriefV3 | null;
  try {
    brief = await requestBrief({
      season,
      usedMedia,
      usedFigures,
      usedBeats,
      startingDirection,
      styleMarks,
      factionKits,
      sceneKit,
      targetTone,
      forceCombat,
      ...(normieCast ? { normieCast } : {}),
      ...(direction ? { direction } : {}),
    });
    if (!brief) {
      brief = await requestBrief({
        season,
        usedMedia,
        usedFigures,
        usedBeats,
        startingDirection,
        styleMarks,
        factionKits,
        sceneKit,
        targetTone,
        forceCombat,
        ...(normieCast ? { normieCast } : {}),
        ...(direction ? { direction } : {}),
      });
    }
  } catch (error) {
    return {
      ok: false,
      stage: "brief",
      message:
        error instanceof Error
          ? error.message
          : "The mural brief could not be read. Try again.",
    };
  }
  if (!brief) {
    return {
      ok: false,
      stage: "brief",
      message: "The mural brief could not be read. Try again.",
    };
  }
  if (forceCombat) {
    brief = { ...brief, tone: "combat" };
  }

  let bytes: Buffer;
  try {
    bytes = await renderFlux(brief.imagePrompt);
  } catch (error) {
    return {
      ok: false,
      stage: "image",
      message:
        error instanceof Error
          ? error.message
          : "This mural couldn't be drawn right now. Please try again.",
    };
  }

  let flags: string[] = [];
  try {
    const firstCheck = await checkImage(bytes);
    if (failsCheck(firstCheck)) {
      try {
        bytes = await renderFlux(brief.imagePrompt);
      } catch (error) {
        return {
          ok: false,
          stage: "image",
          message:
            error instanceof Error
              ? error.message
              : "This mural couldn't be drawn right now. Please try again.",
        };
      }
      const secondCheck = await checkImage(bytes);
      flags = flagsFromCheck(secondCheck);
    }
  } catch (error) {
    return {
      ok: false,
      stage: "vision",
      message:
        error instanceof Error
          ? error.message
          : "Vision check failed. Please try again.",
    };
  }
  const flagged = flags.length > 0;

  const imageDataUrl = await toPngDataUrl(bytes);
  const mixLevel: MixLevelV3 = mix.mixLevel;
  return {
    ok: true,
    version: "v3",
    engine: "v3",
    seasonId: seasonIdOfV2(season),
    seasonName: season.name,
    title: brief.title,
    style: brief.style,
    medium: brief.medium,
    tone: brief.tone,
    moment: brief.moment,
    scene: brief.scene,
    figures: brief.figures,
    caption: brief.caption,
    violenceLevel: sceneKit.violenceLevel,
    castSize: sceneKit.castSize,
    beat: sceneKit.beat,
    mixLevel,
    styles: mix.styles,
    palette: mix.palette,
    composition: mix.composition,
    texture: mix.texture,
    statement: brief.statement,
    flagged,
    flags,
    imageDataUrl,
    imageBytes: bytes,
  };
}
