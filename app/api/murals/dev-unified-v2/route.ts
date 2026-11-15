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
import { pickStyleDirection } from "@/lib/arena-murals-styles";

export const maxDuration = 120;

const IMAGE_SUFFIX =
  "Flat artwork filling the entire frame. No text, no letters, no numerals, no writing of any kind. Not a photograph of an object, wall, or cloth.";

const VISION_CHECK =
  'Look at this image. Respond with JSON only: {"hasText": boolean, "isPhotoOfAnObject": boolean}. hasText means any letters, numerals, or lettering-like marks. isPhotoOfAnObject means it shows a physical object, wall, cloth, frame, or room instead of flat artwork filling the frame.';

const TONES = ["combat", "quiet", "other"] as const;
type MuralToneV2 = (typeof TONES)[number];

function buildBrief(input: {
  startingDirection: string;
  usedMedia: string[];
  usedFigures: string[];
  figureKit: FigureKit;
  season: DummySeasonV2;
  forceCombat: boolean;
}) {
  const used =
    input.usedMedia.length > 0 ? input.usedMedia.join("; ") : "(none yet)";
  const usedFigures =
    input.usedFigures.length > 0
      ? input.usedFigures.join("; ")
      : "(none yet)";
  const combatRule = input.forceCombat
    ? `- The moment MUST be a clash between two sides drawn from this season's war or violence. Show the fight itself.`
    : `- The moment can be combat or quiet, whichever the season truly calls for. Combat is welcome, stylized, not gory. Some seasons are about war, some about trade, plague, politics, or a single act of kindness. Let the data decide.`;

  return `You are making one artwork that records a season of a world called the Arena, where AI-agent Normies of five factions (Human, Cat, Alien, Agent, Zombie) live, fight, trade, vote, and die. Below is the record of the season.

Rules:
- Do NOT try to record the whole season. Choose ONE moment, figure, or turning point that stands for it. Build the whole image around that single subject, with room around it. One main subject, or one pair or group in conflict, plus at most one or two supporting elements.
${combatRule}
- When the moment is combat, show the clash itself: at least two figures in physical conflict, caught mid-action (a swing, a grapple, a charge, a block, a leap), at the instant of impact or just before. Not a lone figure posing, not a victory stance, not the aftermath, not a lone hero on wreckage. Keep it TV-14: stylized, no blood, no wounds, no gore, no dead bodies shown, no sexual content, no hate symbols.
- Show characters as their faction type (Human, Cat, Alien, Agent, Zombie), not as specific individuals; the named character belongs in the moment line and the statement.
- Every figure must look specific and different from the last. Apply the FIGURE KIT to whichever faction you draw, adapting freely. A Cat can be any coat, size, age, or posture; an Alien any skin color, head shape, or number of eyes; a Human or Agent any age, build, and dress; a Zombie any stage of decay. Never default to the generic version of a faction.
- FIGURE KIT: ${input.figureKit.label}
- Do not reuse or resemble these figure looks: ${usedFigures}.
- Use the STARTING DIRECTION for the visual style: ${input.startingDirection}. Commit to it fully. Hybrids should feel like one coherent image, not two styles pasted together.
- Do not resemble these looks already used: ${used}.
- The image IS the artwork: flat, straight-on, filling the entire frame edge to edge. It is not a photograph of an object. No cloth hanging from a wall, no frame, no wall, no room, no surface the art sits on, no scenery around it. No paper edges, deckled edges, borders, margins, or visible paper or canvas texture beyond the artwork itself; the picture runs to the very edge of the frame.
- ABSOLUTELY NO TEXT: no letters, words, numerals, signage, captions, or inscriptions.
- It must not look photorealistic or like generic AI output: no glossy over-smooth render, no cinematic lighting, no fantasy illustration, no glowing swords. Dynamic action is wanted. What is banned is the glossy cinematic poster look: a backlit hero silhouette, a glowing explosion, dramatic fog. Digital, glitch, pixel, and hybrid looks are welcome; what is banned is the generic AI-render look.
- Don't mention that it is AI-made.

Respond with JSON only:
{"title": "3-6 words", "style": "the final look in one phrase", "medium": "the medium in one phrase", "tone": "combat" | "quiet" | "other", "moment": "one sentence naming the moment and why it stands for the season", "figure": "one sentence on the main figure's specific look", "imagePrompt": "detailed prompt for an image model; end it with: '${IMAGE_SUFFIX}'", "statement": "2-3 sentences on what this records and why it takes this form"}

SEASON DATA:
${formatSeasonRecordV2(input.season)}`;
}

type UnifiedBriefV2 = {
  title: string;
  style: string;
  medium: string;
  tone: MuralToneV2;
  moment: string;
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
  return { title, style, medium, tone, moment, figure, imagePrompt, statement };
}

async function requestBrief(input: {
  season: DummySeasonV2;
  usedMedia: string[];
  usedFigures: string[];
  startingDirection: string;
  figureKit: FigureKit;
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
          usedMedia: input.usedMedia,
          usedFigures: input.usedFigures,
          figureKit: input.figureKit,
          season: input.season,
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
    }>(text);
    return {
      hasText: parsed.hasText === true,
      isPhotoOfAnObject: parsed.isPhotoOfAnObject === true,
    };
  } catch {
    return { hasText: false, isPhotoOfAnObject: false };
  }
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

    const season = pickDummySeasonV2({
      lastSeasonId,
      combatOnly: forceCombat,
    });
    const direction = pickStyleDirection(usedStyles);
    const startingDirection = direction.label;
    const figureKit = pickFigureKit();

    let brief = await requestBrief({
      season,
      usedMedia,
      usedFigures,
      startingDirection,
      figureKit,
      forceCombat,
    });
    if (!brief) {
      brief = await requestBrief({
        season,
        usedMedia,
        usedFigures,
        startingDirection,
        figureKit,
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
    if (firstCheck.hasText || firstCheck.isPhotoOfAnObject) {
      bytes = await renderFlux(brief.imagePrompt);
      const secondCheck = await checkImage(bytes);
      flagged = secondCheck.hasText || secondCheck.isPhotoOfAnObject;
    }

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
      figure: brief.figure,
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
