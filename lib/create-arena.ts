import "server-only";

import { anthropic, generateImage, parseClaudeJson } from "@/lib/ai";
import {
  applyArenaPatch,
  applyArenaPixels,
  applyArenaSeal,
  bleedDarkEdges,
  disruptArenaImage,
  fillIfFramed,
  finishArenaImage,
} from "@/lib/arena-finish";
import { fetchNormieBitmap } from "@/lib/arena-pixels";
import {
  arenaDisruptRng,
  arenaFinishRng,
  arenaPatchRng,
  arenaPixelRng,
  arenaSealRng,
  arenaTextureTitle,
  dealArenaHand,
  saveArenaPortrait,
  type ArenaDeal,
  type ArenaFx,
  type ArenaPortrait,
} from "@/lib/arena";
import {
  arenaIngredient,
  isArenaIngredientId,
  type ArenaIngredientId,
} from "@/lib/arena-schools";
import { getAgentBinding, getAgentInfo } from "@/lib/normies";
import { persistImageBuffer } from "@/lib/storage";

export const ARENA_DRAW_USER_MESSAGE =
  "This portrait couldn't be drawn right now. Please try again in a moment.";

export const ARENA_NOT_AWAKENED_MESSAGE =
  "This Normie has not awakened yet.";

export const ARENA_SAFETY_MESSAGE =
  "This drawing was held back. Please try again in a moment.";

const IMAGE_SUFFIX =
  "A single fighter mid-motion. No text, no letters, no numbers, no logos, no signature, no border, no frame, no rectangle, no outlined box. Not photorealistic. Safe for all ages: no blood, no wounds, no gore, no dead bodies, no guns. Abstract, gestural, rough, imperfect. No detailed face. No polished illustration. Figure is a loose silhouette or brush gesture, not a detailed character.";

const BANNED_WORDS = [
  "before",
  "after",
  "waiting",
  "waits",
  "wait",
  "calm",
  "still",
  "quiet",
  "pre-strike",
  "observer",
  "tranquil",
  "steady",
  "standing",
];

const BANNED_PATTERN = new RegExp(`\\b(?:${BANNED_WORDS.join("|")})\\b`, "i");

const SAFETY_WORDS = [
  "blood",
  "bloody",
  "gore",
  "gory",
  "wound",
  "wounded",
  "corpse",
  "dead",
  "death",
  "kill",
  "killing",
  "gun",
  "pistol",
  "rifle",
  "shotgun",
  "bullet",
  "nude",
];

const SAFETY_PATTERN = new RegExp(`\\b(?:${SAFETY_WORDS.join("|")})\\b`, "i");

const TYPE_MOVE: Record<string, string> = {
  zombie: "heavy, slow, relentless",
  agent: "a heavy hitter, tough and deliberate",
  alien: "balanced, unpredictable",
  cat: "fast, light, hard to hit",
  human: "light, resourceful, lives by wits and friends",
};

type ArenaChoice = {
  title: string;
  primary: ArenaIngredientId;
  accents: ArenaIngredientId[];
  style: string;
  scene: string;
  fx: ArenaFx;
};

export type ArenaPreview = {
  tokenId: string;
  name: string;
  type: string;
  title: string;
  primary: ArenaIngredientId;
  accents: ArenaIngredientId[];
  fx: ArenaFx;
  style: string;
  scene: string;
  imagePrompt: string;
  hand: ArenaIngredientId[];
  framing: string;
  direction: string;
  marks: string;
  action: ArenaPortrait["action"];
  patch: ArenaPortrait["patch"];
  seal: boolean;
  dissolution: string;
  palette: string;
  interference: string[];
  disruption: number;
  pixelMode: ArenaPortrait["pixelMode"];
  variation: number;
  image: Buffer;
};

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function buildUserMessage(input: {
  type: string;
  traits: Record<string, unknown>;
  deal: ArenaDeal;
  retryNote: string;
}): string {
  const move =
    TYPE_MOVE[input.type.trim().toLowerCase()] ??
    "shaped by your own build";
  const hand = input.deal.hand
    .map((id) => `- ${id}: ${arenaIngredient(id).descriptor}`)
    .join("\n");
  const interference =
    input.deal.interference.length > 0
      ? `\n\nInclude: ${input.deal.interference.join("; ")}.`
      : "";

  const sealLine = "No seal, no stamp, no chop, no signature.";

  return `You are showing yourself as a fighter in the Arena, in your own way. The mood comes from your personality, temperament and body. The action does not: it is required.

Your body, by type: Zombie: heavy, slow, relentless; Agent: a heavy hitter, tough and deliberate; Alien: balanced, unpredictable; Cat: fast, light, hard to hit; Human: light, resourceful, lives by wits and friends. You are ${input.type}. Let your type shape how you move: ${move}.

Required: action ${input.deal.action}. The figure is mid-motion, never standing still. Framing ${input.deal.framing}; the figure faces ${input.deal.direction}; marks: ${input.deal.marks}, expressed in the terms of the finish you choose (splatter, speed lines, light streaks and so on).

Your mint traits are ${JSON.stringify(input.traits)}.

${input.deal.dissolution}. Describe the figure only as a gesture, silhouette, brush mark or mass of shapes. Never name clothing, jewellery, glasses, hair detail or facial features. Show your mint traits only as shapes and empty space.

Use ONLY these colours: ${input.deal.palette.name}.${interference}

Do not draw a rectangle, frame, panel, or outlined box. ${sealLine}

Your hand of ingredients is:
${hand}
Pull from it however you like: one, two or three. One is the PRIMARY and clearly dominant (about 70% or more of the picture); any others appear only as small accents or single motifs. Keep it abstract: gesture over detail, a strong silhouette, large areas of empty space. It is ALWAYS the required action, mid-motion, never standing still. Rough and imperfect, not a polished illustration.

The title names an image or a texture, never a moment in time. Do not use these words in the title or the scene: before, after, waiting, waits, wait, calm, still, quiet, pre-strike, observer, tranquil, steady, standing.

Safe for children: no blood, wounds, injury or gore, no dead or defeated bodies, no guns or firearms; weapons only stylised (swords, staffs and the like) and never pointed at another figure. No real artist, brand or existing character. No text, letters or numbers. Do not mention your name. Be specific to who you are; another Normie must never get the same title or description.

Respond with JSON only:
{
  "title": "2 to 4 words naming an image or texture, no digits, no quotes",
  "primary": "<id from the hand>",
  "accents": [],
  "style": "one coherent paragraph, max 60 words, describing how the finish combines the chosen ingredients",
  "scene": "one paragraph, max 70 words, only marks, gesture, mass, silhouette and mood",
  "fx": { "pixel": 0, "glitch": 0 }
}
accents holds 0 to 2 ids from the hand, never the primary. fx may be above 0 only if pixel or glitch is the primary or an accent.${input.retryNote}`;
}

function textureTitle(deal: ArenaDeal, primary: ArenaIngredientId) {
  return arenaTextureTitle(deal.texture, arenaIngredient(primary).name, deal.action);
}

function gestureScene(deal: ArenaDeal) {
  return `A loose silhouette is mid-motion, ${deal.action}, a mass of marks and empty space.`;
}

function fallbackChoice(deal: ArenaDeal, title: string): ArenaChoice {
  const primary = deal.hand[0] ?? "ink";
  const fx: ArenaFx = {
    pixel: primary === "pixel" ? 1 : 0,
    glitch: primary === "glitch" ? 1 : 0,
  };
  const usable =
    wordCount(title) >= 2 &&
    wordCount(title) <= 4 &&
    !/\d|["']/.test(title) &&
    !BANNED_PATTERN.test(title);
  return {
    title: usable ? title : textureTitle(deal, primary),
    primary,
    accents: [],
    style: arenaIngredient(primary).descriptor,
    scene: gestureScene(deal),
    fx,
  };
}

function hasBannedWords(choice: ArenaChoice) {
  return BANNED_PATTERN.test(`${choice.title} ${choice.scene}`);
}

function withoutBannedWords(choice: ArenaChoice, deal: ArenaDeal): ArenaChoice {
  return {
    ...choice,
    title: BANNED_PATTERN.test(choice.title)
      ? textureTitle(deal, choice.primary)
      : choice.title,
    scene: BANNED_PATTERN.test(choice.scene) ? gestureScene(deal) : choice.scene,
  };
}

function parseChoice(text: string, hand: ArenaIngredientId[]): ArenaChoice | null {
  let parsed: {
    title?: unknown;
    primary?: unknown;
    accents?: unknown;
    style?: unknown;
    scene?: unknown;
    fx?: unknown;
  };
  try {
    parsed = parseClaudeJson(text);
  } catch {
    return null;
  }

  const title =
    typeof parsed.title === "string"
      ? parsed.title.trim().replace(/\s+/g, " ")
      : "";
  if (wordCount(title) < 2 || wordCount(title) > 4 || /\d|["']/.test(title)) {
    return null;
  }
  if (typeof parsed.primary !== "string" || !isArenaIngredientId(parsed.primary)) {
    return null;
  }
  if (!hand.includes(parsed.primary)) return null;
  if (!Array.isArray(parsed.accents) || parsed.accents.length > 2) return null;

  const accents: ArenaIngredientId[] = [];
  for (const accent of parsed.accents) {
    if (typeof accent !== "string" || !isArenaIngredientId(accent)) return null;
    if (!hand.includes(accent) || accent === parsed.primary) return null;
    if (accents.includes(accent)) return null;
    accents.push(accent);
  }

  const style =
    typeof parsed.style === "string" ? parsed.style.trim().replace(/\s+/g, " ") : "";
  const scene =
    typeof parsed.scene === "string" ? parsed.scene.trim().replace(/\s+/g, " ") : "";
  if (!style || !scene || wordCount(style) > 60 || wordCount(scene) > 70) {
    return null;
  }

  const fxRaw = parsed.fx;
  if (!fxRaw || typeof fxRaw !== "object") return null;
  const pixel = (fxRaw as { pixel?: unknown }).pixel;
  const glitch = (fxRaw as { glitch?: unknown }).glitch;
  if (typeof pixel !== "number" || typeof glitch !== "number") return null;
  if (pixel < 0 || pixel > 1 || glitch < 0 || glitch > 1) return null;

  const selected = new Set<ArenaIngredientId>([parsed.primary, ...accents]);
  if (pixel > 0 && !selected.has("pixel")) return null;
  if (glitch > 0 && !selected.has("glitch")) return null;

  return {
    title,
    primary: parsed.primary,
    accents,
    style,
    scene,
    fx: { pixel: clamp01(pixel), glitch: clamp01(glitch) },
  };
}

function hasUnsafeWords(choice: ArenaChoice) {
  return SAFETY_PATTERN.test(`${choice.style} ${choice.scene}`);
}

async function requestText(system: string, user: string): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = message.content.find((part) => part.type === "text");
  return block && block.type === "text" ? block.text : "";
}

function finalPrompt(choice: ArenaChoice, deal: ArenaDeal) {
  return `${choice.style} ${choice.scene} The figure is mid-motion, ${deal.action}, never standing still. No seal, no stamp, no chop. ${IMAGE_SUFFIX}`;
}

export async function previewArenaPortrait(
  tokenId: string,
  variation = 0
): Promise<ArenaPreview> {
  const seed = Math.max(0, Math.floor(variation));
  const bitmapPromise = fetchNormieBitmap(tokenId);
  const [binding, info] = await Promise.all([
    getAgentBinding(tokenId),
    getAgentInfo(tokenId),
  ]);
  if (!binding || !info?.name) {
    throw new Error(ARENA_NOT_AWAKENED_MESSAGE);
  }

  const type = info.type ?? "";
  const traits =
    (info.traits as { attributes?: Record<string, unknown> } | undefined)
      ?.attributes ?? {};
  const deal = dealArenaHand(tokenId, type, seed);
  const system = info.systemPrompt ?? "";
  const baseUser = buildUserMessage({ type, traits, deal, retryNote: "" });

  let choice = parseChoice(await requestText(system, baseUser), deal.hand);
  if (!choice) {
    choice = parseChoice(
      await requestText(
        system,
        buildUserMessage({
          type,
          traits,
          deal,
          retryNote:
            "\n\nThe previous reply was not valid. Respond again with JSON only, matching the required shape.",
        })
      ),
      deal.hand
    );
  }
  if (!choice) choice = fallbackChoice(deal, "");

  let bannedRetries = 0;
  while (hasBannedWords(choice) && bannedRetries < 2) {
    bannedRetries += 1;
    const retried = parseChoice(
      await requestText(
        system,
        buildUserMessage({
          type,
          traits,
          deal,
          retryNote:
            "\n\nThe previous title or scene used a forbidden word of waiting or stillness. Rewrite both as mid-motion. The title must name an image or a texture, never a moment in time.",
        })
      ),
      deal.hand
    );
    if (retried && !hasUnsafeWords(retried)) choice = retried;
  }
  if (hasBannedWords(choice)) choice = withoutBannedWords(choice, deal);

  if (hasUnsafeWords(choice)) {
    const retried = parseChoice(
      await requestText(
        system,
        buildUserMessage({
          type,
          traits,
          deal,
          retryNote:
            "\n\nThe previous reply used a forbidden word. Rewrite style and scene without injury, death, or firearms.",
        })
      ),
      deal.hand
    );
    if (!retried || hasUnsafeWords(retried)) {
      throw new Error(ARENA_SAFETY_MESSAGE);
    }
    choice = retried;
  }

  const imagePrompt = finalPrompt(choice, deal);
  const replicateUrl = await generateImage(imagePrompt, { seed: deal.fluxSeed });
  const fetched = await fetch(replicateUrl);
  if (!fetched.ok) throw new Error(ARENA_DRAW_USER_MESSAGE);
  const source = Buffer.from(await fetched.arrayBuffer());
  const finished = await finishArenaImage(
    source,
    choice.primary,
    choice.accents,
    choice.fx,
    arenaFinishRng(tokenId, seed)
  );
  const bitmap = await bitmapPromise.catch(() => null);
  const withPixels = await applyArenaPixels({
    image: finished,
    bitmap,
    mode: deal.pixelMode,
    direction: deal.direction,
    darkest: deal.palette.darkest,
    rng: arenaPixelRng(tokenId, seed),
  });
  const disrupted = await disruptArenaImage(
    withPixels,
    deal.disruption,
    arenaDisruptRng(tokenId, seed)
  );
  const patched = await applyArenaPatch(
    disrupted,
    deal.patch,
    arenaPatchRng(tokenId, seed)
  );
  const filled = await fillIfFramed(patched);
  const sealed = deal.seal
    ? await applyArenaSeal(filled, arenaSealRng(tokenId, seed))
    : filled;
  const image = await bleedDarkEdges(sealed);

  return {
    tokenId,
    name: info.name,
    type,
    title: choice.title,
    primary: choice.primary,
    accents: choice.accents,
    fx: choice.fx,
    style: choice.style,
    scene: choice.scene,
    imagePrompt,
    hand: deal.hand,
    framing: deal.framing,
    direction: deal.direction,
    marks: deal.marks,
    action: deal.action,
    patch: deal.patch,
    seal: deal.seal,
    dissolution: deal.dissolution,
    palette: deal.palette.name,
    interference: deal.interference,
    disruption: deal.disruption,
    pixelMode: deal.pixelMode,
    variation: seed,
    image,
  };
}

export async function drawArenaPortrait(input: {
  tokenId: string;
  creator: string;
  previousCreatedAt?: string;
}): Promise<ArenaPortrait> {
  const preview = await previewArenaPortrait(input.tokenId);
  const imageUrl = await persistImageBuffer(preview.image, input.tokenId, "arena");
  const portrait: ArenaPortrait = {
    tokenId: preview.tokenId,
    name: preview.name,
    type: preview.type,
    title: preview.title,
    primary: preview.primary,
    accents: preview.accents,
    fx: preview.fx,
    style: preview.style,
    scene: preview.scene,
    imagePrompt: preview.imagePrompt,
    dissolution: preview.dissolution,
    palette: preview.palette,
    interference: preview.interference,
    action: preview.action,
    patch: preview.patch,
    seal: preview.seal,
    disruption: preview.disruption,
    pixelMode: preview.pixelMode,
    imageUrl,
    createdAt: input.previousCreatedAt ?? new Date().toISOString(),
    creator: input.creator,
  };
  await saveArenaPortrait(portrait);
  return portrait;
}
