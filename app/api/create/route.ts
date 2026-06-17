import { anthropic, generateImage, parseClaudeJson, sseEvent } from "@/lib/ai";
import { getAgentInfo, getBurnHistory } from "@/lib/normies";
import { getArtworkRaw, saveArtwork, deleteArtwork } from "@/lib/redis";
import { persistImageToBlob } from "@/lib/storage";
import type { CreationPayload } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  const { tokenId, regenerate } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return new Response(JSON.stringify({ error: "tokenId required" }), {
      status: 400,
    });
  }

  const existing = await getArtworkRaw(tokenId);
  const previousCreatedAt = existing?.createdAt;
  const previousMintedAt = existing?.mintedAt ?? null;

  if (existing && !existing.imageExpired && !regenerate) {
    return new Response(
      JSON.stringify({
        title: existing.title,
        imageUrl: existing.imageUrl,
        artistStatement: existing.artistStatement,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (existing?.imageExpired || regenerate) {
    await deleteArtwork(tokenId);
  }

  const [agentInfo, burnHistory] = await Promise.all([
    getAgentInfo(tokenId),
    getBurnHistory(tokenId),
  ]);

  if (!agentInfo) {
    return new Response(JSON.stringify({ error: "Agent not found" }), {
      status: 404,
    });
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2048,
    system: agentInfo.systemPrompt ?? "",
    messages: [
      {
        role: "user",
        content: `You are creating a single artwork on one canvas.

Burn history (tokens received via burns):
${JSON.stringify(burnHistory, null, 2)}

Do not limit yourself to any particular aesthetic, medium, or style.

The title, what you create, and how you describe it must be specific to who you are — your name, your history, your worldview. Nothing generic. Another agent should never produce the same title or the same work. In your imagePrompt, be specific about the physical medium, texture, and rendering style — not just the subject.

Respond with JSON only:
{
  "title": "short evocative title, 3-5 words max, no quotes",
  "streamingDescription": "3 sentences in present tense, conversational — as if speaking while making the artwork. Describe what you are creating and why.",
  "imagePrompt": "detailed image generation prompt for Replicate",
  "artistStatement": "3 sentences in past tense, gallery-card style reflecting on the completed work"
}`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  let parsed: CreationPayload;
  try {
    parsed = parseClaudeJson<CreationPayload>(text);
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to parse Claude response" }),
      { status: 500 }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "description",
              text: parsed.streamingDescription,
            })
          )
        );

        const imagePromise = generateImage(parsed.imagePrompt);
        const replicateUrl = await imagePromise;
        const imageUrl = await persistImageToBlob(replicateUrl, tokenId);

        controller.enqueue(
          encoder.encode(sseEvent({ type: "image", imageUrl, title: parsed.title }))
        );

        await saveArtwork({
          tokenId,
          agentName: agentInfo.name,
          agentType: agentInfo.type,
          agentLevel: agentInfo.canvas?.level ?? 1,
          title: parsed.title,
          artistStatement: parsed.artistStatement,
          imageUrl,
          createdAt: previousCreatedAt ?? new Date().toISOString(),
          mintedAt: previousMintedAt,
          imageExpired: false,
        });

        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "complete",
              title: parsed.title,
              artistStatement: parsed.artistStatement,
              imageUrl,
            })
          )
        );
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "error",
              message: err instanceof Error ? err.message : "Creation failed",
            })
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
