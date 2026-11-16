/**
 * TEMPORARY. Dev-only mural generation v2 (Flux only). Do not expose in production.
 */
import { NextResponse } from "next/server";
import sharp from "sharp";
import { anthropic, generateImage, parseClaudeJson } from "@/lib/ai";
import {
  formatSeasonRecordV2,
  pickDummySeasonV2,
  seasonIdOfV2,
  type DummySeasonV2,
} from "@/lib/arena-murals-dummy-v2";
import { pickFigureKit, type FigureKit } from "@/lib/arena-murals-figures";
import { pickSceneKit, type SceneKit } from "@/lib/arena-murals-scenes";
import {
  pickStyleDirection,
  styleMarksOf,
} from "@/lib/arena-murals-styles-v2";

export const maxDuration = 120;

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

function buildBrief(input: {
  startingDirection: string;
  styleMarks: string | null;
  usedMedia: string[];
  usedFigures: string[];
  usedBeats: string[];
  figureKit: FigureKit;
  sceneKit: SceneKit;
  season: DummySeasonV2;
  targetTone: MuralToneV2;
  forceCombat: boolean;
}) {
  const used =
    input.usedMedia.length > 0 ? input.usedMedia.join("; ") : "(none yet)";
  const usedFigures =
    input.usedFigures.length > 0
      ? input.usedFigures.join("; ")
      : "(none yet)";
  const usedBeats =
    input.usedBeats.length > 0 ? input.usedBeats.join("; ") : "(none yet)";

  const toneRule = input.forceCombat
    ? `- The tone MUST be combat. The moment MUST be a clash between two sides drawn from this season's war or violence. Show the fight itself.`
    : `- Pick a moment whose tone is ${input.targetTone}. Combat, quiet, and other are equally welcome when asked for; follow the target tone.`;

  const combatRules =
    input.targetTone === "combat" || input.forceCombat
      ? `- When the moment is combat, show the clash itself: at least two figures in physical conflict, caught mid-action (a swing, a grapple, a charge, a block, a leap), at the instant of impact or just before unless the violence level says otherwise. Not a lone figure posing, not a victory stance, not the aftermath unless the violence level is aftermath, not a lone hero on wreckage. Keep it TV-14: stylized, no blood, no wounds, no gore, no dead bodies shown, no sexual content, no hate symbols.
- Use the SCENE KIT as the starting shape of the moment; adapt it if the season data demands, but do not default to two figures grappling face to face. Vary the pose, direction, and distance of the conflict. The violence level applies only if the moment is combat. Keep it TV-14: no blood, no wounds, no gore, no dead bodies shown. Show impact through motion, flying debris, twisted poses, and the style itself. The blow should land, not just be threatened, unless the level says otherwise.
- At the brawl and all-out clash levels, the blow has already connected: a body recoiling or airborne, a weapon caught mid-impact, a shove already moving someone off their feet. Show the force through the pose and the style, not through blood or wounds. At the standoff and about-to-happen levels, hold the instant before.
- SCENE KIT: ${input.sceneKit.label}
- Do not reuse these conflict beats: ${usedBeats}.`
      : `- The target tone is ${input.targetTone}. Ignore the SCENE KIT violence level for this run; choose a quiet or other moment that fits the season. SCENE KIT cast and camera may still shape the picture: cast ${input.sceneKit.castSize}; camera ${input.sceneKit.camera}.`;

  const styleMarksRule = input.styleMarks
    ? `- STYLE MARKS: ${input.styleMarks}. Name these in the imagePrompt right after the medium, before any figure detail.`
    : "";

  return `You are making one artwork that records a season of a world called the Arena, where AI-agent Normies of five factions (Human, Cat, Alien, Agent, Zombie) live, fight, trade, vote, and die. Below is the record of the season.

Rules:
- Do NOT try to record the whole season. Choose ONE moment, figure, or turning point that stands for it. Build the whole image around that single subject, with room around it. One main subject, or one pair or group in conflict, plus at most one or two supporting elements.
${toneRule}
${combatRules}
- Show characters as their faction type (Human, Cat, Alien, Agent, Zombie), not as specific individuals; the named character belongs in the moment line and the statement.
- When two factions meet, make each faction visible in its silhouette (an alien's head shape, a cat's ears and tail, an agent's machine parts, a zombie's decay), so the two sides can be told apart. Describe each side's faction first in the imagePrompt.
- Every figure must look specific and different from the last. Apply the FIGURE KIT to whichever faction you draw, adapting freely. A Cat can be any coat, size, or posture; an Alien any skin color, head shape, or number of eyes; a Human or Agent any adult build and dress; a Zombie any stage of decay. Never default to the generic version of a faction.
- Humans are always clearly adult, aged 18 to 80: adult proportions, adult faces, adult builds. Never draw a human, or any humanlike figure, as a child or teenager, or with a youthful cartoon face, in any style, including manga, comics, and picture-book illustration.
- FIGURE KIT: ${input.figureKit.label}
- Do not reuse or resemble these figure looks: ${usedFigures}.
- Use the STARTING DIRECTION for the visual style: ${input.startingDirection}. Commit to it fully. Hybrids should feel like one coherent image, not two styles pasted together. If two hybrid styles don't combine naturally, let the stronger one dominate.
${styleMarksRule}
- Do not resemble these looks already used: ${used}.
- The image IS the artwork: flat, straight-on, filling the entire frame edge to edge. It is not a photograph of an object. No cloth hanging from a wall, no frame, no wall, no room, no surface the art sits on, no scenery around it. No paper edges, deckled edges, borders, margins, or visible paper or canvas texture beyond the artwork itself; the picture runs to the very edge of the frame.
- ABSOLUTELY NO TEXT: no letters, words, numerals, signage, captions, or inscriptions.
- Describe figures in the imagePrompt as marks of the chosen medium (flat shapes, visible brush, line, print texture), not as realistic creatures. No glow, halos, backlighting, or fur and skin rendering.
- It must not look photorealistic or like generic AI output: no glossy over-smooth render, no cinematic lighting, no fantasy illustration, no glowing swords. Dynamic action is wanted. What is banned is the glossy cinematic poster look: a backlit hero silhouette, a glowing explosion, dramatic fog. Digital, glitch, pixel, and hybrid looks are welcome; what is banned is the generic AI-render look.
- Don't mention that it is AI-made.

Respond with JSON only:
{"title": "3-6 words", "style": "the final look in one phrase", "medium": "the medium in one phrase", "tone": "combat" | "quiet" | "other", "moment": "one sentence naming the moment and why it stands for the season", "scene": "one phrase: the beat and cast", "figure": "one sentence on the main figure's specific look", "imagePrompt": "detailed prompt for an image model; end it with: '${IMAGE_SUFFIX}'", "statement": "2-3 sentences on what this records and why it takes this form"}

SEASON DATA:
${formatSeasonRecordV2(input.season)}`;
}

type UnifiedBriefV2 = {
  title: string;
  style: string;
  medium: string;
  tone: MuralToneV2;
  moment: string;
  scene: string;
  figure: string;
  imagePrompt: string;
  statement: string;
};

function parseTone(value: unknown): MuralToneV2 | null {
  if (typeof value !== "string") return null;
  const tone = value.trim().toLowerCase();
  if (tone === "political") return "other";
  return (TONES as readonly string[]).includes(tone)
    ? (tone as MuralToneV2)
    : null;
}

function parseBrief(text: string): UnifiedBriefV2 | null {
  let parsed: {
    title?: unknown;
    style?: unknown;
    medium?: unknown;
    tone?: unknown;
    moment?: unknown;
    scene?: unknown;
    figure?: unknown;
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
  const figure =
    typeof parsed.figure === "string"
      ? parsed.figure.trim().replace(/\s+/g, " ")
      : "";
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
    !figure ||
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
    figure,
    imagePrompt,
    statement,
  };
}

async function requestBrief(input: {
  season: DummySeasonV2;
  usedMedia: string[];
  usedFigures: string[];
  usedBeats: string[];
  startingDirection: string;
  styleMarks: string | null;
  figureKit: FigureKit;
  sceneKit: SceneKit;
  targetTone: MuralToneV2;
  forceCombat: boolean;
}): Promise<UnifiedBriefV2 | null> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: buildBrief({
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

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => null);
    const lastSeasonId =
      typeof body?.lastSeasonId === "string" ? body.lastSeasonId : undefined;
    const forceTone =
      typeof body?.forceTone === "string" ? body.forceTone.trim().toLowerCase() : "";
    const forceCombat = forceTone === "combat";
    const usedMedia = stringList(body?.usedMedia, 10);
    const usedStyles = stringList(body?.usedStyles, 10);
    const usedFigures = stringList(body?.usedFigures, 10);
    const usedBeats = stringList(body?.usedBeats, 10);

    const targetTone = pickTargetTone(forceCombat);
    const season = pickDummySeasonV2({
      lastSeasonId,
      combatOnly: forceCombat || targetTone === "combat",
    });
    const direction = pickStyleDirection(usedStyles);
    const startingDirection = direction.label;
    const styleMarks = styleMarksOf(direction);
    const figureKit = pickFigureKit();
    const sceneKit = pickSceneKit(usedBeats);

    let brief = await requestBrief({
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
      });
    }
    if (!brief) {
      return NextResponse.json(
        { ok: false, message: "The mural brief could not be read. Try again." },
        { status: 200 }
      );
    }
    if (forceCombat) {
      brief = { ...brief, tone: "combat" };
    }

    let bytes = await renderFlux(brief.imagePrompt);
    let flags: string[] = [];
    const firstCheck = await checkImage(bytes);
    if (failsCheck(firstCheck)) {
      bytes = await renderFlux(brief.imagePrompt);
      const secondCheck = await checkImage(bytes);
      flags = flagsFromCheck(secondCheck);
    }
    const flagged = flags.length > 0;

    const imageDataUrl = await toPngDataUrl(bytes);
    return NextResponse.json({
      ok: true,
      version: "v2",
      seasonId: seasonIdOfV2(season),
      seasonName: season.name,
      title: brief.title,
      style: brief.style,
      medium: brief.medium,
      tone: brief.tone,
      moment: brief.moment,
      scene: brief.scene,
      figure: brief.figure,
      violenceLevel: sceneKit.violenceLevel,
      castSize: sceneKit.castSize,
      camera: sceneKit.camera,
      beat: sceneKit.beat,
      statement: brief.statement,
      flagged,
      flags,
      imageDataUrl,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "This mural couldn't be drawn right now. Please try again.",
      },
      { status: 200 }
    );
  }
}
