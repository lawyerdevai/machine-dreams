import { anthropic, generateImage, parseClaudeJson, sseEvent } from "@/lib/ai";
import { getAgentInfo, getBurnHistory } from "@/lib/normies";
import { getArtwork, saveArtwork } from "@/lib/redis";
import type { CreationPayload } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  const { tokenId } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return new Response(JSON.stringify({ error: "tokenId required" }), {
      status: 400,
    });
  }

  const existing = await getArtwork(tokenId);
  if (existing) {
    return new Response(
      JSON.stringify({
        title: existing.title,
        imageUrl: existing.imageUrl,
        artistStatement: existing.artistStatement,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
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
        const imageUrl = await imagePromise;

        controller.enqueue(
          encoder.encode(sseEvent({ type: "image", imageUrl, title: parsed.title }))
        );

        await saveArtwork({
          tokenId,
          agentName: agentInfo.name,
          title: parsed.title,
          artistStatement: parsed.artistStatement,
          imageUrl,
          createdAt: new Date().toISOString(),
          mintedAt: null,
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
