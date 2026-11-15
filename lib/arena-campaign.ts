import "server-only";

import { createHash } from "node:crypto";
import { anthropic, generateImage, parseClaudeJson } from "@/lib/ai";
import { applyIdentityCard, type CampaignCorner } from "@/lib/arena-campaign-card";
import { fetchNormieBitmap } from "@/lib/arena-pixels";
import {
  ARENA_DRAW_USER_MESSAGE,
  ARENA_NOT_AWAKENED_MESSAGE,
} from "@/lib/create-arena";
import { getAgentBinding, getAgentInfo } from "@/lib/normies";
import type { AgentInfo } from "@/lib/types";

/**
 * Lab-only Campaign pack. The abstract Arena pipeline is a separate path.
 */

const BASE_STYLE =
  "Bright, charming collectible-card illustration: bold clean outlines, flat vivid colours with soft shading, rounded friendly character proportions, full-body character from head to feet, centred, in a rich scene. 1920s to 40s dieselpunk world: olive drab, rust, steel, brass, riveted iron, diesel engines, tank yards, zeppelin docks, rail depots, radio towers, searchlights, sodium lamps, mud, rain, banners. Aviator caps, greatcoats, goggles, leather. Not photorealistic.";

const IMAGE_SUFFIX =
  "Full-body character from head to feet, whole figure visible. No text, no letters, no numbers, no logos, no signature, no border, no frame, no real flags or emblems. Safe for all ages: no blood, no wounds, no gore, no dead or defeated bodies, no guns, nothing pointed at any figure.";

export const CAMPAIGN_ROLES = [
  "tank-rider",
  "radio operator",
  "zeppelin rigger",
  "diesel mechanic",
  "flag signaller",
  "dispatch rider",
  "searchlight keeper",
  "track layer",
  "courier",
  "standard-bearer",
  "scout",
  "sentinel",
  "quartermaster",
  "field cook",
] as const;

export const CAMPAIGN_SETTINGS = [
  "tank yard",
  "zeppelin dock",
  "rail depot",
  "radio tower",
  "trench camp",
  "steel bridge",
  "diesel foundry",
  "harbour with moored ships",
  "desert supply depot",
  "snowbound rail station",
  "flooded canal lock",
  "mountain fort",
  "rooftop signal tower",
  "clocktower workshop",
] as const;

export const CAMPAIGN_WEATHER = [
  "dawn mist",
  "noon haze",
  "dusk",
  "night with searchlights",
  "rain",
  "snow",
  "ash sky",
  "storm",
] as const;

export const CAMPAIGN_FOREGROUND = [
  "sandbags",
  "crates",
  "a lantern",
  "gears",
  "a campfire",
  "a tank or cannon at rest with barrel pointing at the sky",
  "steam pipes",
  "a flag pole with an abstract banner",
  "a map table",
  "rail track",
  "puddles",
  "barrels",
  "hanging chains",
  "a motorbike",
] as const;

export const CAMPAIGN_PROPS = [
  "binoculars",
  "tool belt",
  "lantern",
  "bugle",
  "brass shield",
  "satchel",
  "goggles",
  "signal flag",
  "wrench",
  "telescope",
  "kettle",
  "radio set",
  "parcel",
  "canteen",
  "compass",
  "leather gloves",
  "scarf",
  "oil can",
  "coil of rope",
  "mess tin",
  "pocket watch",
  "rolled blanket",
  "whistle",
  "spark plug",
] as const;

export const CAMPAIGN_FRAMING = [
  "wide scene with smaller figure",
  "mid-wide hero shot",
  "low angle hero",
  "high angle",
  "side-on",
  "through-the-scenery",
] as const;

export const CAMPAIGN_POSE_LEVELS = [
  "working or calm",
  "watching or bracing",
  "action",
] as const;

export const CAMPAIGN_PALETTES = [
  "olive and rust",
  "steel blue and brass",
  "ash grey with signal red",
  "sepia and teal",
  "night blue with sodium orange",
  "snow white with coal black and one red",
  "mud brown and sodium yellow",
  "forest green and cream",
  "charcoal and copper",
  "dusty rose and iron grey",
  "fog grey and brass",
  "rain blue and olive drab",
] as const;

export const CAMPAIGN_TWISTS = [
  "none",
  "tin-toy",
  "poster",
  "static",
  "talisman",
] as const;

export type CampaignTwist = (typeof CAMPAIGN_TWISTS)[number];
export type CampaignPoseLevel = (typeof CAMPAIGN_POSE_LEVELS)[number];

const TWIST_TEXT: Record<CampaignTwist, string> = {
  none: "",
  "tin-toy":
    "Tin-toy diorama: the scene looks like a hand-painted miniature with shallow depth and tactile paint.",
  poster:
    "Bold geometric poster: big flat colour fields, strong diagonal composition, a radial burst behind the figure, only three colours.",
  static:
    "Dream static: the edges of the world dissolve into drifting pixels and scanline haze.",
  talisman:
    "Talisman: folk charms and painted abstract sigils hang from the gear, lantern-lit, no letters.",
};

export const TWIST_LABEL: Record<CampaignTwist, string> = {
  none: "none",
  "tin-toy": "tin-toy diorama",
  poster: "bold geometric poster",
  static: "dream static",
  talisman: "talisman",
};

const CORNER_WORDS: Record<CampaignCorner, string> = {
  "top-left": "upper left",
  "top-right": "upper right",
  "bottom-left": "lower left",
  "bottom-right": "lower right",
};

const POSE_TEXT: Record<CampaignPoseLevel, string> = {
  "working or calm":
    "The pose is working at the job, or at ease between tasks.",
  "watching or bracing":
    "The pose is watching the scene, or braced and ready.",
  action:
    "The pose is action: leaping, charging, swinging a tool, or signalling with a flag.",
};

const BANNED_WORDS = [
  "before",
  "after",
  "waiting",
  "waits",
  "calm",
  "still",
  "quiet",
  "observer",
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
  "firearm",
  "revolver",
];

const SAFETY_PATTERN = new RegExp(`\\b(?:${SAFETY_WORDS.join("|")})\\b`, "i");

const NAMED_PATTERN =
  /\b(mario|pokemon|pokémon|disney|pixar|ghibli|nintendo|warcraft|warhammer|fallout|bioshock|marvel|mickey|pikachu|zelda)\b|star wars|hello kitty|union jack|stars and stripes|swastika/i;

const CORNERS: CampaignCorner[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

export type CampaignDeal = {
  role: (typeof CAMPAIGN_ROLES)[number];
  setting: (typeof CAMPAIGN_SETTINGS)[number];
  weather: (typeof CAMPAIGN_WEATHER)[number];
  foreground: (typeof CAMPAIGN_FOREGROUND)[number];
  props: string[];
  framing: (typeof CAMPAIGN_FRAMING)[number];
  poseLevel: CampaignPoseLevel;
  palette: (typeof CAMPAIGN_PALETTES)[number];
  twist: CampaignTwist;
  corner: CampaignCorner;
  /** Degrees, a few either way, never zero. */
  rotation: number;
  fluxSeed: number;
};

type CampaignChoice = {
  title: string;
  outfit: string;
  signatureTraits: string[];
  pose: string;
  expression: string;
  sceneNote: string;
};

export type CampaignPreview = {
  tokenId: string;
  name: string;
  type: string;
  title: string;
  outfit: string;
  signatureTraits: string[];
  pose: string;
  expression: string;
  sceneNote: string;
  imagePrompt: string;
  role: string;
  setting: string;
  weather: string;
  foreground: string;
  props: string[];
  framing: string;
  poseLevel: string;
  palette: string;
  twist: string;
  corner: string;
  variation: number;
  image: Buffer;
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

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0]!;
}

function pickPoseLevel(rng: () => number): CampaignPoseLevel {
  const roll = rng();
  if (roll < 0.45) return "working or calm";
  if (roll < 0.8) return "watching or bracing";
  return "action";
}

function pickTwist(rng: () => number): CampaignTwist {
  if (rng() < 0.2) return "none";
  const twists = CAMPAIGN_TWISTS.filter((item) => item !== "none");
  return pick(twists, rng);
}

function pickTwo(rng: () => number): string[] {
  const pool: string[] = [...CAMPAIGN_PROPS];
  const first = Math.floor(rng() * pool.length);
  const a = pool.splice(first, 1)[0] ?? CAMPAIGN_PROPS[0];
  const second = Math.floor(rng() * pool.length);
  const b = pool[second] ?? CAMPAIGN_PROPS[1];
  return [a, b];
}

/**
 * Same token id and variation always deal the same cards.
 * Variation 0 is the lab default. Other values are lab-only.
 */
export function dealCampaign(tokenId: string, variation = 0): CampaignDeal {
  const offset = Math.max(0, Math.floor(variation));
  const digest = createHash("sha256")
    .update(`campaign:${tokenId.trim()}:${offset}`)
    .digest();
  const rng = mulberry32(digest.readUInt32BE(0));
  const magnitude = 3 + Math.floor(rng() * 6);
  const rotation = (rng() < 0.5 ? -1 : 1) * magnitude;
  return {
    role: pick(CAMPAIGN_ROLES, rng),
    setting: pick(CAMPAIGN_SETTINGS, rng),
    weather: pick(CAMPAIGN_WEATHER, rng),
    foreground: pick(CAMPAIGN_FOREGROUND, rng),
    props: pickTwo(rng),
    framing: pick(CAMPAIGN_FRAMING, rng),
    poseLevel: pickPoseLevel(rng),
    palette: pick(CAMPAIGN_PALETTES, rng),
    twist: pickTwist(rng),
    corner: pick(CORNERS, rng),
    rotation,
    fluxSeed: (digest.readUInt32BE(4) % 2147483646) + 1,
  };
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function typeLook(type: string) {
  switch (type.trim().toLowerCase()) {
    case "cat":
      return "This character is a cat. Obvious cat ears and a tail on the body. Not a human.";
    case "alien":
      return "This character is clearly alien. A non-human face and body. Not a human in a hat.";
    case "agent":
      return "This character is part mechanical. Visible metal, gears, or machine parts on the body. Not an ordinary human.";
    case "zombie":
      return "This character is a friendly zombie. Pale green skin, patched clothes, goofy, no wounds.";
    default:
      return "This character is a normal human.";
  }
}

function speciesTrait(type: string): string | null {
  switch (type.trim().toLowerCase()) {
    case "cat":
      return "cat ears and a tail";
    case "alien":
      return "a clearly alien face";
    case "agent":
      return "mechanical parts";
    case "zombie":
      return "pale green skin and patched clothes";
    default:
      return null;
  }
}

function visibleTrait(key: string, value: string) {
  const low = `${key} ${value}`.toLowerCase();
  if (/glass|spectacles|monocle|shades/.test(low)) return "goggles";
  if (/\bhat\b|\bcap\b|beanie|beret|helmet/.test(low)) {
    return `${value} worn as a cap or helmet`;
  }
  if (/hair/.test(low)) return `${value} hair shape`;
  if (/eye patch|eyepatch/.test(low)) return "an eye patch";
  return value;
}

function fallbackTraits(
  type: string,
  attributes: Record<string, unknown>
): string[] {
  const preferred = [
    "Hair Style",
    "Facial Feature",
    "Eyes",
    "Accessory",
    "Mouth",
    "Hat",
    "Glasses",
    "Clothes",
    "Clothing",
  ];
  const skipKey = /^(type|gender|age|expression|background)$/i;
  const skipValue = /^(none|no|n\/a|null|empty)$/i;
  const ordered = [
    ...preferred.flatMap((key) =>
      Object.prototype.hasOwnProperty.call(attributes, key)
        ? [[key, attributes[key]] as const]
        : []
    ),
    ...Object.entries(attributes),
  ];
  const picked: string[] = [];
  for (const [key, value] of ordered) {
    if (picked.length >= 3) break;
    if (skipKey.test(key) || typeof value !== "string") continue;
    const text = value.trim().replace(/\s+/g, " ");
    if (!text || skipValue.test(text) || /\d/.test(text)) continue;
    const phrase = visibleTrait(key, text);
    if (picked.includes(phrase)) continue;
    if (SAFETY_PATTERN.test(phrase) || NAMED_PATTERN.test(phrase)) continue;
    if (BANNED_PATTERN.test(phrase)) continue;
    picked.push(phrase);
  }
  const species = speciesTrait(type);
  if (species && picked.length < 2 && !picked.includes(species)) {
    picked.push(species);
  }
  while (picked.length < 2) {
    const filler = picked.length === 0 ? "aviator cap" : "greatcoat";
    if (!picked.includes(filler)) picked.push(filler);
    else break;
  }
  return picked.slice(0, 3);
}

function titleCase(phrase: string) {
  return phrase.replace(/(^|[\s-])(\w)/g, (full) => full.toUpperCase());
}

function safeTitle(deal: CampaignDeal) {
  const tone = titleCase(deal.palette.split(" ")[0] ?? "Olive");
  const role = titleCase(deal.role);
  const title = `${tone} ${role}`.replace(/\s+/g, " ").trim();
  if (
    wordCount(title) >= 2 &&
    wordCount(title) <= 5 &&
    !BANNED_PATTERN.test(title) &&
    !SAFETY_PATTERN.test(title) &&
    !/\d|["']/.test(title)
  ) {
    return title;
  }
  return role;
}

function fallbackChoice(
  deal: CampaignDeal,
  type: string,
  attributes: Record<string, unknown>
): CampaignChoice {
  const signatureTraits = fallbackTraits(type, attributes);
  const pose =
    deal.poseLevel === "action"
      ? "leaping while signalling with a flag"
      : deal.poseLevel === "watching or bracing"
        ? "braced, watching the yard, one hand on the goggles"
        : "busy at the work of the role, weight shifted onto one foot";
  return {
    title: safeTitle(deal),
    outfit: `greatcoat and leather, with ${signatureTraits.join(", ")} clearly visible. ${typeLook(type)}`,
    signatureTraits,
    pose,
    expression: "friendly and intent",
    sceneNote: `${deal.role} at the ${deal.setting}, ${deal.weather}, ${deal.foreground} in front.`,
  };
}

function cleanField(value: unknown, maxWords: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text || wordCount(text) > maxWords || /\d|"/.test(text)) return null;
  return text;
}

function parseTraits(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) return null;
  const traits: string[] = [];
  for (const item of value) {
    const text = cleanField(item, 8);
    if (!text) return null;
    traits.push(text);
  }
  return traits;
}

function parseChoice(text: string): CampaignChoice | null {
  let parsed: {
    title?: unknown;
    outfit?: unknown;
    signatureTraits?: unknown;
    pose?: unknown;
    expression?: unknown;
    sceneNote?: unknown;
  };
  try {
    parsed = parseClaudeJson(text);
  } catch {
    return null;
  }
  const title = cleanField(parsed.title, 5);
  const outfit = cleanField(parsed.outfit, 40);
  const pose = cleanField(parsed.pose, 30);
  const expression = cleanField(parsed.expression, 20);
  const sceneNote = cleanField(parsed.sceneNote, 50);
  const signatureTraits = parseTraits(parsed.signatureTraits);
  if (!title || wordCount(title) < 2 || !outfit || !pose || !expression || !sceneNote) {
    return null;
  }
  if (!signatureTraits) return null;
  if (BANNED_PATTERN.test(title)) return null;
  const joined = [title, outfit, pose, expression, sceneNote, ...signatureTraits].join(
    " "
  );
  if (SAFETY_PATTERN.test(joined) || NAMED_PATTERN.test(joined)) return null;
  return { title, outfit, signatureTraits, pose, expression, sceneNote };
}

function personalityText(info: AgentInfo) {
  const parts: string[] = [];
  if (Array.isArray(info.personalityTraits)) {
    for (const trait of info.personalityTraits) {
      if (typeof trait === "string" && trait.trim()) parts.push(trait.trim());
    }
  }
  if (typeof info.communicationStyle === "string" && info.communicationStyle.trim()) {
    parts.push(info.communicationStyle.trim());
  }
  return parts.join(" ");
}

function buildUserMessage(input: {
  type: string;
  attributes: Record<string, unknown>;
  personality: string;
  deal: CampaignDeal;
  retryNote: string;
}) {
  const corner = CORNER_WORDS[input.deal.corner];
  const twist = TWIST_TEXT[input.deal.twist];
  return `Draw yourself as the character on a collectible card. Never name a franchise, game, studio, artist, existing character, logo, or real flag.

Species look, mandatory: ${typeLook(input.type)}
Name that species look in the outfit, the signature traits, and the scene. A cat is not a person. An alien does not have an ordinary human face. An agent shows machinery on the body. A zombie is pale green and friendly.
Mint traits: ${JSON.stringify(input.attributes)}
Personality: ${input.personality || "unspecified"}

These cards are already chosen:
Role: ${input.deal.role}
Setting: ${input.deal.setting}
Time and weather: ${input.deal.weather}
Foreground: ${input.deal.foreground}
Props: ${input.deal.props.join(", ")}
Framing: ${input.deal.framing}
Pose level: ${POSE_TEXT[input.deal.poseLevel]}
Palette: ${input.deal.palette}
${twist ? `Twist: ${twist}` : "Twist: none."}

Choose 2 or 3 signature traits from the mint traits and the species look. Each one MUST be visible on the character as costume or body. A hat becomes a cap or helmet. Glasses become goggles. A beard stays a beard. A headband stays. Hair shape stays. Do not invent a feature that is not in the record.

Leave the ${corner} corner uncluttered.

The title is 2 to 5 words. It must not contain digits. It must not contain these words: before, after, waiting, waits, calm, still, quiet, observer.

No blood, wounds, gore, dead or defeated bodies, guns, or anything pointed at a figure. No text, letters, or numbers. Do not mention your name.

Respond with JSON only:
{
  "title": "2 to 5 words",
  "outfit": "what they wear, max 40 words",
  "signatureTraits": ["visible trait", "visible trait"],
  "pose": "the body pose, max 30 words",
  "expression": "the face, max 20 words",
  "sceneNote": "one sentence of the scene, max 50 words"
}${input.retryNote}`;
}

function withSpecies(choice: CampaignChoice, type: string): CampaignChoice {
  const species = speciesTrait(type);
  const kind = type.trim().toLowerCase();
  if (!species || kind === "human" || kind === "") return choice;
  const blob = `${choice.outfit} ${choice.signatureTraits.join(" ")}`.toLowerCase();
  const present =
    (kind === "cat" && /\bears?\b|\btail\b/.test(blob)) ||
    (kind === "alien" && /alien/.test(blob)) ||
    (kind === "agent" && /mechan|metal|gear|machine/.test(blob)) ||
    (kind === "zombie" && /green/.test(blob));
  if (present) return choice;
  const signatureTraits = [...choice.signatureTraits];
  if (signatureTraits.length >= 3) signatureTraits.pop();
  signatureTraits.push(species);
  return { ...choice, signatureTraits };
}

function finalPrompt(choice: CampaignChoice, deal: CampaignDeal, type: string) {
  const twist = TWIST_TEXT[deal.twist];
  const corner = CORNER_WORDS[deal.corner];
  const species = typeLook(type);
  return [
    BASE_STYLE,
    species,
    `Role: ${deal.role}. Setting: ${deal.setting}. Time and weather: ${deal.weather}. Foreground: ${deal.foreground}. Props: ${deal.props.join(" and ")}. Framing: ${deal.framing}. Palette: ${deal.palette}.`,
    twist,
    `Outfit: ${choice.outfit}. Pose: ${choice.pose}. Expression: ${choice.expression}. ${choice.sceneNote}`,
    `Signature traits, each clearly visible: ${choice.signatureTraits.join("; ")}.`,
    species,
    `Leave the ${corner} corner uncluttered, open sky or ground.`,
    IMAGE_SUFFIX,
  ]
    .filter(Boolean)
    .join(" ");
}

async function requestText(system: string, user: string) {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: user }],
  });
  const block = message.content.find((part) => part.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export async function previewCampaignPortrait(
  tokenId: string,
  variation = 0
): Promise<CampaignPreview> {
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
  const attributes =
    (info.traits as { attributes?: Record<string, unknown> } | undefined)
      ?.attributes ?? {};
  const deal = dealCampaign(tokenId, seed);
  const system = info.systemPrompt ?? "";
  const personality = personalityText(info);
  const baseUser = buildUserMessage({
    type,
    attributes,
    personality,
    deal,
    retryNote: "",
  });

  let choice = parseChoice(await requestText(system, baseUser));
  if (!choice) {
    choice = parseChoice(
      await requestText(
        system,
        buildUserMessage({
          type,
          attributes,
          personality,
          deal,
          retryNote:
            "\n\nThe previous reply was not valid. Respond again with JSON only. The title must avoid the forbidden words, and every field must stay free of injury, death, and firearms.",
        })
      )
    );
  }
  if (!choice) choice = fallbackChoice(deal, type, attributes);
  choice = withSpecies(choice, type);

  const imagePrompt = finalPrompt(choice, deal, type);
  const replicateUrl = await generateImage(imagePrompt, { seed: deal.fluxSeed });
  const fetched = await fetch(replicateUrl);
  if (!fetched.ok) throw new Error(ARENA_DRAW_USER_MESSAGE);
  let image: Buffer = Buffer.from(await fetched.arrayBuffer());
  const bitmap = await bitmapPromise.catch(() => null);
  if (bitmap) {
    try {
      image = await applyIdentityCard(image, bitmap, deal.corner, deal.rotation);
    } catch {
      // The portrait still stands if the card cannot be taped on.
    }
  }

  return {
    tokenId,
    name: info.name,
    type,
    title: choice.title,
    outfit: choice.outfit,
    signatureTraits: choice.signatureTraits,
    pose: choice.pose,
    expression: choice.expression,
    sceneNote: choice.sceneNote,
    imagePrompt,
    role: deal.role,
    setting: deal.setting,
    weather: deal.weather,
    foreground: deal.foreground,
    props: deal.props,
    framing: deal.framing,
    poseLevel: deal.poseLevel,
    palette: deal.palette,
    twist: TWIST_LABEL[deal.twist],
    corner: CORNER_WORDS[deal.corner],
    variation: seed,
    image,
  };
}
