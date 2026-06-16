import { anthropic, sseEvent } from "@/lib/ai";
import { getAgentInfo, getBurnHistory } from "@/lib/normies";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { tokenId } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return new Response(JSON.stringify({ error: "tokenId required" }), {
      status: 400,
    });
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

  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: agentInfo.systemPrompt ?? "",
    messages: [
      {
        role: "user",
        content: `Introduce yourself in 4-6 sentences in your own voice — who you are, what you stand for, what you have witnessed on the chain.

Burn history (tokens received via burns):
${JSON.stringify(burnHistory, null, 2)}

Write only the introduction. No preamble, no labels.`,
      },
    ],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(
              encoder.encode(sseEvent({ type: "text", text: event.delta.text }))
            );
          }
        }
        controller.enqueue(encoder.encode(sseEvent({ type: "done" })));
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "error",
              message: err instanceof Error ? err.message : "Stream failed",
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
