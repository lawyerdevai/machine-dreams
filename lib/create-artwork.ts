import "server-only";

import { anthropic, parseClaudeJson } from "@/lib/ai";
import { ARTWORK_CREATION_ERROR_CODE } from "@/lib/artwork-creation-messages";
import { getAgentInfo, getBurnHistory } from "@/lib/normies";
import { getArtworkRaw, saveArtwork } from "@/lib/redis";
import { persistSketchToBlob } from "@/lib/storage";
import type { AgentInfo, Artwork, CreationPayload } from "@/lib/types";

export class ArtworkCreationError extends Error {
  readonly code = ARTWORK_CREATION_ERROR_CODE;

  constructor() {
    super(ARTWORK_CREATION_ERROR_CODE);
    this.name = "ArtworkCreationError";
  }
}

export function isArtworkCreationError(
  err: unknown
): err is ArtworkCreationError {
  return err instanceof ArtworkCreationError;
}

export type CreateArtworkOptions = {
  regenerate?: boolean;
};

export type CreateArtworkResult = {
  tokenId: string;
  agentName: string;
  title: string;
  artistStatement: string;
  sketchCode: string;
  sketchUrl: string;
  kind: "sketch";
  createdAt: string;
};

function buildCreateUserMessage(
  burnHistory: unknown[],
  _mintTraits: Record<string, unknown>
): string {
  return `You have one canvas. It moves.

Show us how your world works — not what it looks like, but how it behaves. The rhythm of it. The weight of it. What it does when nothing is watching.

You decide everything: what lives in this world, how it moves, what it resists, what it repeats, what breaks. Make it unmistakably yours — something no other agent could have made.

On-chain context (part of your story, not a checklist): ${JSON.stringify(burnHistory)}.

Write a self-contained p5.js sketch in global mode that expresses this. Requirements:
- Define setup() calling createCanvas(windowWidth, windowHeight)
- Define draw() for the animation loop
- Define windowResized() calling resizeCanvas(windowWidth, windowHeight)
- No network calls, no external assets, no DOM access outside the canvas, p5 core only
- No nudity, sexual content, graphic violence, or hate symbols

Avoid defaults that feel like decisions but aren't: smooth constant rotation, particles floating upward, rainbow color cycling, perfect symmetry at uniform speed, sine waves for their own sake. These are screensavers, not expression. Make something that feels like it came from a specific internal logic. Motion should have weight or intention or resistance. Color should feel chosen. If someone watched this for sixty seconds they should understand something about you that words wouldn't say.

Respond with JSON only:
{
  "title": "3-5 words, no quotes",
  "sketchCode": "complete self-contained p5.js sketch as a string",
  "artistStatement": "2-3 sentences in your own voice, past tense. Not gallery language. What you made, what it does, why it moves the way it does."
}`;
}

function parseCreationPayload(text: string): CreationPayload {
  try {
    const parsed = parseClaudeJson<CreationPayload>(text);
    if (
      !parsed.title?.trim() ||
      !parsed.sketchCode?.trim() ||
      !parsed.artistStatement?.trim()
    ) {
      throw new ArtworkCreationError();
    }
    return parsed;
  } catch (err) {
    if (isArtworkCreationError(err)) throw err;
    throw new ArtworkCreationError();
  }
}

export async function generateCreationPayload(
  tokenId: string,
  options: Pick<CreateArtworkOptions, "regenerate"> = {}
) {
  const existing = await getArtworkRaw(tokenId);
  const previousCreatedAt = existing?.createdAt;
  const previousMintedAt = existing?.mintedAt ?? null;

  if (existing && !existing.imageExpired && !options.regenerate) {
    throw new Error("Artwork already exists");
  }

  const [agentInfo, burnHistory] = await Promise.all([
    getAgentInfo(tokenId),
    getBurnHistory(tokenId),
  ]);

  if (!agentInfo) {
    throw new Error("Agent not found");
  }

  const mintTraits =
    (agentInfo.traits as { attributes?: Record<string, unknown> } | undefined)
      ?.attributes ?? {};

  const userMessage = buildCreateUserMessage(burnHistory, mintTraits);

  const requestSketchPayload = async () => {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8000,
      system: agentInfo.systemPrompt ?? "",
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return parseCreationPayload(text);
  };

  let parsed: CreationPayload;
  try {
    parsed = await requestSketchPayload();
  } catch (err) {
    if (!isArtworkCreationError(err)) throw err;
    // Sketch code is far more likely to break naive JSON parsing than a
    // short prose imagePrompt was — retry once before giving up.
    parsed = await requestSketchPayload();
  }

  return {
    parsed,
    agentInfo,
    previousCreatedAt,
    previousMintedAt,
  };
}

export async function completeArtworkCreation(
  tokenId: string,
  parsed: CreationPayload,
  agentInfo: AgentInfo,
  meta: {
    previousCreatedAt?: string;
    previousMintedAt: string | null;
  }
): Promise<CreateArtworkResult> {
  const sketchUrl = await persistSketchToBlob(parsed.sketchCode, tokenId);

  const artwork: Artwork = {
    tokenId,
    agentName: agentInfo.name,
    agentType: agentInfo.type,
    agentLevel: agentInfo.canvas?.level ?? 1,
    kind: "sketch",
    title: parsed.title,
    artistStatement: parsed.artistStatement,
    sketchUrl,
    imageUrl: undefined,
    createdAt: meta.previousCreatedAt ?? new Date().toISOString(),
    mintedAt: meta.previousMintedAt,
    imageExpired: false,
  };

  await saveArtwork(artwork);

  return {
    tokenId,
    agentName: agentInfo.name,
    title: parsed.title,
    artistStatement: parsed.artistStatement,
    sketchCode: parsed.sketchCode,
    sketchUrl,
    kind: "sketch",
    createdAt: artwork.createdAt,
  };
}

export async function createArtwork(
  tokenId: string,
  options: CreateArtworkOptions = {}
): Promise<CreateArtworkResult> {
  try {
    const { parsed, agentInfo, previousCreatedAt, previousMintedAt } =
      await generateCreationPayload(tokenId, options);

    return await completeArtworkCreation(
      tokenId,
      parsed,
      agentInfo,
      { previousCreatedAt, previousMintedAt }
    );
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message === "Artwork already exists" || err.message === "Agent not found")
    ) {
      throw err;
    }
    throw new ArtworkCreationError();
  }
}
