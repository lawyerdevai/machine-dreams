import "server-only";

import { anthropic, generateImage, parseClaudeJson } from "@/lib/ai";
import { ARTWORK_CREATION_ERROR_CODE } from "@/lib/artwork-creation-messages";
import { getAgentInfo, getBurnHistory } from "@/lib/normies";
import { getArtworkRaw, saveArtwork } from "@/lib/redis";
import { persistImageToBlob } from "@/lib/storage";
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
  evalBatch?: boolean;
};

export type CreateArtworkResult = {
  tokenId: string;
  agentName: string;
  title: string;
  artistStatement: string;
  imageUrl: string;
  createdAt: string;
};

function buildCreateUserMessage(
  burnHistory: unknown[],
  mintTraits: Record<string, unknown>
): string {
  return `You are creating a single artwork on one canvas.

Identity context (this is part of who you are, not a checklist to depict): your mint traits — ${JSON.stringify(mintTraits)} — and your on-chain activity — ${JSON.stringify(burnHistory)}.

Do not limit yourself to any particular aesthetic, medium, or style.

The title, what you create, and how you describe it must be specific to who you are — your name, your history, your worldview. Nothing generic. Another agent should never produce the same title or the same work. In your imagePrompt, be specific about the physical medium, texture, and rendering style — not just the subject.

There is no restriction on style or medium — anything genuinely fitting your identity is welcome. The only thing to avoid is output that reads as generic AI filler: crisp, clean studio-photography-style 3D renders of objects, sculptures, or architecture floating in empty space, and photorealistic human headshots. Aim for something that looks intentionally made and worth sharing, not something a machine produced by default.

Describe a single artistic medium applied to one surface that IS the artwork itself — a drawing, a painting, a print, a woven piece, a pixel composition — and let it fill the frame. Do NOT describe the work as a collage, board, wall, or arrangement of multiple real-world objects (such as torn photographs, receipts, sticky notes, handwritten notes pinned together, red thread, or signage on wood); these read as photographs of a cluttered surface rather than a singular artwork.

The imagePrompt must never include nudity, sexual content, graphic violence, gore, hate symbols, or other content that would violate standard content moderation policy. Choose a different subject or composition if your initial impulse trends in that direction.

Respond with JSON only:
{
  "title": "short evocative title, 3-5 words max, no quotes",
  "imagePrompt": "detailed image generation prompt for Replicate",
  "artistStatement": "3 sentences in past tense, gallery-card style reflecting on the completed work"
}`;
}

function parseCreationPayload(text: string): CreationPayload {
  try {
    const parsed = parseClaudeJson<CreationPayload>(text);
    if (
      !parsed.title?.trim() ||
      !parsed.imagePrompt?.trim() ||
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

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: agentInfo.systemPrompt ?? "",
    messages: [
      {
        role: "user",
        content: buildCreateUserMessage(burnHistory, mintTraits),
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  const parsed = parseCreationPayload(text);

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
  },
  options: Pick<CreateArtworkOptions, "evalBatch"> = {}
): Promise<CreateArtworkResult> {
  const replicateUrl = await generateImage(parsed.imagePrompt);
  const imageUrl = await persistImageToBlob(replicateUrl, tokenId);

  const artwork: Artwork = {
    tokenId,
    agentName: agentInfo.name,
    agentType: agentInfo.type,
    agentLevel: agentInfo.canvas?.level ?? 1,
    title: parsed.title,
    artistStatement: parsed.artistStatement,
    imagePrompt: parsed.imagePrompt,
    imageUrl,
    createdAt: meta.previousCreatedAt ?? new Date().toISOString(),
    mintedAt: meta.previousMintedAt,
    imageExpired: false,
    ...(options.evalBatch ? { evalBatch: true } : {}),
  };

  await saveArtwork(artwork);

  return {
    tokenId,
    agentName: agentInfo.name,
    title: parsed.title,
    artistStatement: parsed.artistStatement,
    imageUrl,
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
      { previousCreatedAt, previousMintedAt },
      options
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
