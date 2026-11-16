/**
 * TEMPORARY. Dev-only mural generation v3 (Flux only). Do not expose in production.
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
import {
  pickFactionKits,
  type FactionKitsV3,
} from "@/lib/arena-murals-figures-v3";
import { pickSceneKit, type SceneKit } from "@/lib/arena-murals-scenes";
import {
  pickStyleMix,
  type MixLevelV3,
  type StyleMixV3,
} from "@/lib/arena-murals-styles-v3";

export const maxDuration = 120;

const IMAGE_SUFFIX =
  "Flat artwork filling the entire frame. No text, no letters, no numerals, no writing of any kind. Not a photograph of an object, wall, or cloth.";

const VISION_CHECK =
  'Look at this image. Respond with JSON only: {"hasText": boolean, "isPhotoOfAnObject": boolean, "looksLikeGlossyAIRender": boolean}. hasText means any letters, numerals, or lettering-like marks. isPhotoOfAnObject means it shows a physical object, wall, cloth, frame, or room instead of flat artwork filling the frame. looksLikeGlossyAIRender is true for smooth realistic rendering of skin, fur, or fabric, soft cinematic lighting, glow, or halos instead of looking made in a physical or digital medium.';

const TONES = ["combat", "quiet", "other"] as const;
type MuralToneV3 = (typeof TONES)[number];

function pickTargetTone(forceCombat: boolean): MuralToneV3 {
  if (forceCombat) return "combat";
  const roll = Math.random();
  if (roll < 0.5) return "combat";
  if (roll < 0.9) return "quiet";
  return "other";
}

function sceneKitLabelWithoutCamera(sceneKit: SceneKit) {
  return `${sceneKit.violenceLevel}; ${sceneKit.castSize}; ${sceneKit.beat}`;
}

function buildBrief(input: {
  startingDirection: string;
  styleMarks: string | null;
  usedMedia: string[];
  usedFigures: string[];
  usedBeats: string[];
  factionKits: FactionKitsV3;
  sceneKit: SceneKit;
  season: DummySeasonV2;
  targetTone: MuralToneV3;
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
  const sceneLabel = sceneKitLabelWithoutCamera(input.sceneKit);

  const toneRule = input.forceCombat
    ? `- The tone MUST be combat. The moment MUST be a clash between two sides drawn from this season's war or violence. Show the fight itself.`
    : `- Pick a moment whose tone is ${input.targetTone}. Combat, quiet, and other are equally welcome when asked for; follow the target tone.`;

  const combatRules =
    input.targetTone === "combat" || input.forceCombat
      ? `- When the moment is combat, show the clash itself: at least two figures in physical conflict, caught mid-action (a swing, a grapple, a charge, a block, a leap), at the instant of impact or just before unless the violence level says otherwise. Not a lone figure posing, not a victory stance, not the aftermath unless the violence level is aftermath, not a lone hero on wreckage. Keep it TV-14: stylized, no blood, no wounds, no gore, no dead bodies shown, no sexual content, no hate symbols.
- Use the SCENE KIT as the starting shape of the moment; adapt it if the season data demands, but do not default to two figures grappling face to face. Vary the pose, direction, and distance of the conflict. The violence level applies only if the moment is combat. Keep it TV-14: no blood, no wounds, no gore, no dead bodies shown. Show impact through motion, flying debris, twisted poses, and the style itself. The blow should land, not just be threatened, unless the level says otherwise.
- At the brawl and all-out clash levels, the blow has already connected: a body recoiling or airborne, a weapon caught mid-impact, a shove already moving someone off their feet. Show the force through the pose and the style, not through blood or wounds. At the standoff and about-to-happen levels, hold the instant before.
- SCENE KIT: ${sceneLabel}
- Do not reuse these conflict beats: ${usedBeats}.`
      : `- The target tone is ${input.targetTone}. Ignore the SCENE KIT violence level for this run; choose a quiet or other moment that fits the season. SCENE KIT cast may still shape the picture: cast ${input.sceneKit.castSize}. Composition (not camera) shapes the framing.`;

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
- Every figure must look specific. Figures of different factions in the same image must differ clearly in scale and silhouette, not just in color. Never draw the generic default of any faction. Humans are always adults. Describe each figure's faction cues first in the imagePrompt.
- FACTION KITS: Use kit A for the first figure of each faction and kit B for the second; if there are more, vary them from A and B. Each kit sets that faction's scale, form, color, and features. Follow them, adapting only where the moment demands.
${input.factionKits.label}
- Do not reuse or resemble these figure looks: ${usedFigures}.
- Use the STARTING DIRECTION for the visual style: ${input.startingDirection}. Commit to it fully. Hybrids should feel like one coherent image, not two styles pasted together. If two hybrid styles don't combine naturally, let the stronger one dominate.
${styleMarksRule}
- Whatever the style, it must still read clearly as a scene with figures doing something. Style serves the moment.
- Craft-based styles (tapestry, mosaic, stained glass, embroidery, quilt, tile) are a way of drawing, not an object. Render them as the flat image itself filling the frame, never as a physical item hanging, lying, or mounted anywhere.
- Combined styles must merge into one coherent image, not sit side by side. If two styles do not combine naturally, let the stronger one dominate.
- Dealt options are a starting point. If any dealt option would require text, numerals, photorealism, or a glossy render, ignore that part. Where a style normally carries lettering (maps, blueprints, diagrams, teletext, playing cards, heraldry), render its marks only, with no lettering of any kind.
- Do not resemble these looks already used: ${used}.
- The image IS the artwork: flat, straight-on, filling the entire frame edge to edge. It is not a photograph of an object. No cloth hanging from a wall, no frame, no wall, no room, no surface the art sits on, no scenery around it. No paper edges, deckled edges, borders, margins, or visible paper or canvas texture beyond the artwork itself; the picture runs to the very edge of the frame.
- ABSOLUTELY NO TEXT: no letters, words, numerals, signage, captions, or inscriptions.
- Describe figures in the imagePrompt as marks of the chosen medium (flat shapes, visible brush, line, print texture), not as realistic creatures. No glow, halos, backlighting, or fur and skin rendering.
- It must not look photorealistic or like generic AI output: no glossy over-smooth render, no cinematic lighting, no fantasy illustration, no glowing swords. Dynamic action is wanted. What is banned is the glossy cinematic poster look: a backlit hero silhouette, a glowing explosion, dramatic fog. Digital, glitch, pixel, and hybrid looks are welcome; what is banned is the generic AI-render look.
- Don't mention that it is AI-made.

Respond with JSON only:
{"title": "3-6 words", "style": "the final look in one phrase", "medium": "the medium in one phrase", "tone": "combat" | "quiet" | "other", "moment": "one sentence naming the moment and why it stands for the season", "scene": "one phrase: the beat and cast", "figures": ["one short phrase per main figure: faction, scale, form, color"], "imagePrompt": "detailed prompt for an image model; end it with: '${IMAGE_SUFFIX}'", "statement": "2-3 sentences on what this records and why it takes this form"}

SEASON DATA:
${formatSeasonRecordV2(input.season)}`;
}

type UnifiedBriefV3 = {
  title: string;
  style: string;
  medium: string;
  tone: MuralToneV3;
  moment: string;
  scene: string;
  figures: string[];
  imagePrompt: string;
  statement: string;
};

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
  factionKits: FactionKitsV3;
  sceneKit: SceneKit;
  targetTone: MuralToneV3;
  forceCombat: boolean;
}): Promise<UnifiedBriefV3 | null> {
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
          factionKits: input.factionKits,
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

async function checkImage(bytes: Buffer): Promise<{
  hasText: boolean;
  isPhotoOfAnObject: boolean;
  looksLikeGlossyAIRender: boolean;
}> {
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
    }>(text);
    return {
      hasText: parsed.hasText === true,
      isPhotoOfAnObject: parsed.isPhotoOfAnObject === true,
      looksLikeGlossyAIRender: parsed.looksLikeGlossyAIRender === true,
    };
  } catch {
    return {
      hasText: false,
      isPhotoOfAnObject: false,
      looksLikeGlossyAIRender: false,
    };
  }
}

function failsCheck(check: {
  hasText: boolean;
  isPhotoOfAnObject: boolean;
  looksLikeGlossyAIRender: boolean;
}) {
  return (
    check.hasText || check.isPhotoOfAnObject || check.looksLikeGlossyAIRender
  );
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
    const usedStyles = stringList(body?.usedStyles, 20);
    const usedPalettes = stringList(body?.usedPalettes, 8);
    const usedCompositions = stringList(body?.usedCompositions, 8);
    const usedFigures = stringList(body?.usedFigures, 10);
    const usedBeats = stringList(body?.usedBeats, 10);

    const targetTone = pickTargetTone(forceCombat);
    const season = pickDummySeasonV2({
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

    let brief = await requestBrief({
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
    let flagged = false;
    const firstCheck = await checkImage(bytes);
    if (failsCheck(firstCheck)) {
      bytes = await renderFlux(brief.imagePrompt);
      const secondCheck = await checkImage(bytes);
      flagged = failsCheck(secondCheck);
    }

    const imageDataUrl = await toPngDataUrl(bytes);
    const mixLevel: MixLevelV3 = mix.mixLevel;
    return NextResponse.json({
      ok: true,
      version: "v3",
      seasonId: seasonIdOfV2(season),
      seasonName: season.name,
      title: brief.title,
      style: brief.style,
      medium: brief.medium,
      tone: brief.tone,
      moment: brief.moment,
      scene: brief.scene,
      figures: brief.figures,
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
