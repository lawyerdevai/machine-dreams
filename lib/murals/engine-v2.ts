/**
 * Arena Murals engine v2. Used by the dev route and generateMural.
 */
import sharp from "sharp";
import { anthropic, generateImage, parseClaudeJson } from "@/lib/ai";
import { pickDummySeasonV2, seasonIdOfV2 } from "@/lib/arena-murals-dummy-v2";
import { pickFigureKit, type FigureKit } from "@/lib/arena-murals-figures";
import { pickSceneKit, type SceneKit } from "@/lib/arena-murals-scenes";
import {
  pickStyleDirection,
  styleMarksOf,
} from "@/lib/arena-murals-styles-v2";
import { buildBriefV2 } from "./build-brief-v2";
import type { MuralDirection } from "./direction";
import type { SeasonRecord } from "./season";
import type { NormieCastMember } from "./types";

const IMAGE_SUFFIX =
  "Flat artwork filling the entire frame. No text, no letters, no numerals, no writing of any kind. Not a photograph of an object, wall, or cloth.";

const VISION_CHECK =
  'Look at this image. Respond with JSON only: {"hasText": boolean, "isPhotoOfAnObject": boolean, "looksLikeGlossyAIRender": boolean, "looksLikeChild": boolean}. hasText means any letters, numerals, or lettering-like marks. isPhotoOfAnObject means it shows a physical object, wall, cloth, frame, or room instead of flat artwork filling the frame. looksLikeGlossyAIRender is true for smooth realistic rendering of skin, fur, or fabric, soft cinematic lighting, glow, or halos instead of looking made in a physical or digital medium. looksLikeChild is true if any humanlike figure (human, android, alien, or zombie in human shape) appears to be a child or teenager, or has childlike proportions or a youthful cartoon face.';

const TONES = ["combat", "quiet", "other"] as const;
type MuralToneV2 = (typeof TONES)[number];

function pickTargetTone(forceCombat: boolean): MuralToneV2 {
  if (forceCombat) return "combat";
  const roll = Math.random();
  if (roll < 0.5) return "combat";
  if (roll < 0.9) return "quiet";
  return "other";
}

type UnifiedBriefV2 = {
  title: string;
  style: string;
  medium: string;
  tone: MuralToneV2;
  moment: string;
  scene: string;
  figure: string;
  caption: string;
  imagePrompt: string;
  statement: string;
  motionBrief?: string;
};

export type RunV2Input = {
  lastSeasonId?: string;
  forceTone?: string;
  usedMedia?: string[];
  usedStyles?: string[];
  usedFigures?: string[];
  usedBeats?: string[];
  /** When set, use this season instead of picking. */
  season?: SeasonRecord;
  /** Text-path Normie cast; ignored on the test-data path. */
  normieCast?: NormieCastMember[];
  /** Directed mode; omitted or empty must not change the brief. */
  direction?: MuralDirection;
  /** Animation-ready composition + motionBrief; off by default. */
  animationReady?: boolean;
};

export type RunV2Result =
  | {
      ok: true;
      version: "v2";
      engine: "v2";
      seasonId: string;
      seasonName: string;
      title: string;
      style: string;
      medium: string;
      tone: MuralToneV2;
      moment: string;
      scene: string;
      figure: string;
      caption: string;
      violenceLevel: string;
      castSize: string;
      camera: string;
      beat: string;
      statement: string;
      motionBrief?: string;
      flagged: boolean;
      flags: string[];
      imageDataUrl: string;
      imageBytes: Buffer;
    }
  | { ok: false; message: string; stage: "brief" | "image" | "vision" };


function parseTone(value: unknown): MuralToneV2 | null {
  if (typeof value !== "string") return null;
  const tone = value.trim().toLowerCase();
  if (tone === "political") return "other";
  return (TONES as readonly string[]).includes(tone)
    ? (tone as MuralToneV2)
    : null;
}

function parseBrief(
  text: string,
  opts?: { requireMotionBrief?: boolean }
): UnifiedBriefV2 | null {
  let parsed: {
    title?: unknown;
    style?: unknown;
    medium?: unknown;
    tone?: unknown;
    moment?: unknown;
    scene?: unknown;
    figure?: unknown;
    caption?: unknown;
    imagePrompt?: unknown;
    statement?: unknown;
    motionBrief?: unknown;
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
  const figure =
    typeof parsed.figure === "string"
      ? parsed.figure.trim().replace(/\s+/g, " ")
      : "";
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

  const motionBriefRaw =
    typeof parsed.motionBrief === "string"
      ? parsed.motionBrief.trim().replace(/\s+/g, " ")
      : "";
  const motionBrief =
    motionBriefRaw.length > 800
      ? motionBriefRaw.slice(0, 800).trim()
      : motionBriefRaw;

  if (
    !title ||
    !style ||
    !medium ||
    !moment ||
    !scene ||
    !figure ||
    !caption ||
    !statement ||
    !tone ||
    !imagePrompt
  ) {
    return null;
  }
  if (opts?.requireMotionBrief && !motionBrief) {
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
    figure,
    caption,
    imagePrompt,
    statement,
    ...(motionBrief ? { motionBrief } : {}),
  };
}

async function requestBrief(input: {
  season: SeasonRecord;
  usedMedia: string[];
  usedFigures: string[];
  usedBeats: string[];
  startingDirection: string;
  styleMarks: string | null;
  figureKit: FigureKit;
  sceneKit: SceneKit;
  targetTone: MuralToneV2;
  forceCombat: boolean;
  normieCast?: NormieCastMember[];
  direction?: MuralDirection;
  animationReady?: boolean;
}): Promise<UnifiedBriefV2 | null> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: buildBriefV2({
          startingDirection: input.startingDirection,
          styleMarks: input.styleMarks,
          usedMedia: input.usedMedia,
          usedFigures: input.usedFigures,
          usedBeats: input.usedBeats,
          figureKit: input.figureKit,
          sceneKit: input.sceneKit,
          season: input.season,
          targetTone: input.targetTone,
          forceCombat: input.forceCombat,
          ...(input.normieCast ? { normieCast: input.normieCast } : {}),
          ...(input.direction ? { direction: input.direction } : {}),
          ...(input.animationReady ? { animationReady: true } : {}),
        }),
      },
    ],
  });
  const block = message.content.find((part) => part.type === "text");
  const text = block && block.type === "text" ? block.text : "";
  return parseBrief(text, {
    requireMotionBrief: Boolean(input.animationReady),
  });
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

export async function runV2(input: RunV2Input = {}): Promise<RunV2Result> {
  const lastSeasonId =
    typeof input.lastSeasonId === "string" ? input.lastSeasonId : undefined;
  const forceTone =
    typeof input.forceTone === "string" ? input.forceTone.trim().toLowerCase() : "";
  const forceCombat = forceTone === "combat";
  const usedMedia = stringList(input.usedMedia, 10);
  const usedStyles = stringList(input.usedStyles, 10);
  const usedFigures = stringList(input.usedFigures, 10);
  const usedBeats = stringList(input.usedBeats, 10);

  const targetTone = pickTargetTone(forceCombat);
  const season =
    input.season ??
    pickDummySeasonV2({
      lastSeasonId,
      combatOnly: forceCombat || targetTone === "combat",
    });
  const styleDirection = pickStyleDirection(usedStyles);
  const startingDirection = styleDirection.label;
  const styleMarks = styleMarksOf(styleDirection);
  const figureKit = pickFigureKit();
  const sceneKit = pickSceneKit(usedBeats);
  const normieCast = input.normieCast;
  const muralDirection = input.direction;
  const animationReady = Boolean(input.animationReady);

  let brief: UnifiedBriefV2 | null;
  try {
    brief = await requestBrief({
      season,
      usedMedia,
      usedFigures,
      usedBeats,
      startingDirection,
      styleMarks,
      figureKit,
      sceneKit,
      targetTone,
      forceCombat,
      ...(normieCast ? { normieCast } : {}),
      ...(muralDirection ? { direction: muralDirection } : {}),
      ...(animationReady ? { animationReady: true } : {}),
    });
    if (!brief) {
      brief = await requestBrief({
        season,
        usedMedia,
        usedFigures,
        usedBeats,
        startingDirection,
        styleMarks,
        figureKit,
        sceneKit,
        targetTone,
        forceCombat,
        ...(normieCast ? { normieCast } : {}),
        ...(muralDirection ? { direction: muralDirection } : {}),
        ...(animationReady ? { animationReady: true } : {}),
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
  return {
    ok: true,
    version: "v2",
    engine: "v2",
    seasonId: seasonIdOfV2(season),
    seasonName: season.name,
    title: brief.title,
    style: brief.style,
    medium: brief.medium,
    tone: brief.tone,
    moment: brief.moment,
    scene: brief.scene,
    figure: brief.figure,
    caption: brief.caption,
    violenceLevel: sceneKit.violenceLevel,
    castSize: sceneKit.castSize,
    camera: sceneKit.camera,
    beat: sceneKit.beat,
    statement: brief.statement,
    ...(brief.motionBrief ? { motionBrief: brief.motionBrief } : {}),
    flagged,
    flags,
    imageDataUrl,
    imageBytes: bytes,
  };
}
