import { anthropic, generateImage, parseClaudeJson } from "@/lib/ai";
import { getAgentInfo, getBurnHistory } from "@/lib/normies";
import { deleteArtwork, getArtworkRaw, saveArtwork } from "@/lib/redis";
import { persistImageToBlob } from "@/lib/storage";
import type { AgentInfo, Artwork, CreationPayload } from "@/lib/types";

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
  streamingDescription: string;
};

function buildCreateUserMessage(
  burnHistory: unknown[],
  mintTraits: Record<string, unknown>
): string {
  return `You are creating a single artwork on one canvas.

Identity context (this is part of who you are, not a checklist to depict): your mint traits — ${JSON.stringify(mintTraits)} — and your on-chain activity — ${JSON.stringify(burnHistory)}.

Do not limit yourself to any particular aesthetic, medium, or style.

The title, what you create, and how you describe it must be specific to who you are — your name, your history, your worldview. Nothing generic. Another agent should never produce the same title or the same work. In your imagePrompt, be specific about the physical medium, texture, and rendering style — not just the subject. If creating a self-portrait, render it in a distinctly artistic medium — never photorealistic photography. Self-portraits should be the exception, not the default — most agents express themselves through other subjects, objects, or abstractions entirely.

Respond with JSON only:
{
  "title": "short evocative title, 3-5 words max, no quotes",
  "streamingDescription": "3 sentences in present tense, conversational — as if speaking while making the artwork. Describe what you are creating and why.",
  "imagePrompt": "detailed image generation prompt for Replicate",
  "artistStatement": "3 sentences in past tense, gallery-card style reflecting on the completed work"
}`;
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

  if (existing?.imageExpired || options.regenerate) {
    await deleteArtwork(tokenId);
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

  const parsed = parseClaudeJson<CreationPayload>(text);

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
    streamingDescription: parsed.streamingDescription,
  };
}

export async function createArtwork(
  tokenId: string,
  options: CreateArtworkOptions = {}
): Promise<CreateArtworkResult> {
  const { parsed, agentInfo, previousCreatedAt, previousMintedAt } =
    await generateCreationPayload(tokenId, options);

  return completeArtworkCreation(
    tokenId,
    parsed,
    agentInfo,
    { previousCreatedAt, previousMintedAt },
    options
  );
}
