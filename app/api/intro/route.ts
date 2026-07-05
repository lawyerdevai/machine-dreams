import { anthropic, sseEvent } from "@/lib/ai";
import { getAgentInfo } from "@/lib/normies";
import { getIntro, saveIntro } from "@/lib/redis";

export const maxDuration = 60;

export async function POST(request: Request) {
  const { tokenId } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return new Response(JSON.stringify({ error: "tokenId required" }), {
      status: 400,
    });
  }

  const agentInfo = await getAgentInfo(tokenId);
  if (!agentInfo) {
    return new Response(JSON.stringify({ error: "Agent not found" }), {
      status: 404,
    });
  }

  const cached = await getIntro(tokenId);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        if (cached) {
          controller.enqueue(
            encoder.encode(sseEvent({ type: "text", text: cached, cached: true }))
          );
          controller.enqueue(encoder.encode(sseEvent({ type: "done" })));
          controller.close();
          return;
        }

        const stream = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system: agentInfo.systemPrompt ?? "",
          messages: [
            {
              role: "user",
              content:
                "Introduce yourself in 4-6 sentences in your own voice. Speak as a living personality — your perspective, what you notice, what you care about, how you see the world. Your on-chain history is part of your story, not the headline.",
            },
          ],
        });

        let full = "";
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            full += event.delta.text;
            controller.enqueue(
              encoder.encode(sseEvent({ type: "text", text: event.delta.text }))
            );
          }
        }

        await saveIntro(tokenId, full);
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
