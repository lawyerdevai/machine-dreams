import { sseEvent } from "@/lib/ai";
import { ARTWORK_CREATION_ERROR_CODE } from "@/lib/artwork-creation-messages";
import { createArtworkTestPreview } from "@/lib/create-artwork-test";
import { getAgentBinding, getAgentInfo } from "@/lib/normies";

export const maxDuration = 120;

/**
 * Sandbox creation endpoint — streams a preview artwork.
 * Never calls saveArtwork or any Redis/blob persistence.
 */
export async function POST(request: Request) {
  const { tokenId } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return new Response(JSON.stringify({ error: "tokenId required" }), {
      status: 400,
    });
  }

  const trimmed = tokenId.trim();
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 0 || Number(trimmed) > 9999) {
    return new Response(JSON.stringify({ error: "invalid_token_id" }), {
      status: 400,
    });
  }

  const [binding, info] = await Promise.all([
    getAgentBinding(trimmed),
    getAgentInfo(trimmed),
  ]);

  if (!binding || !info) {
    return new Response(
      JSON.stringify({ error: "agent_not_awakened" }),
      { status: 404 }
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const result = await createArtworkTestPreview(trimmed);

        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "complete",
              title: result.title,
              artistStatement: result.artistStatement,
              imageUrl: result.imageUrl,
              createdAt: result.createdAt,
              agentName: result.agentName,
              tokenId: result.tokenId,
              aboutBio: result.aboutBio,
            })
          )
        );
      } catch (err) {
        if (err instanceof Error && err.message === "Agent not found") {
          controller.enqueue(
            encoder.encode(
              sseEvent({
                type: "error",
                code: "agent_not_found",
              })
            )
          );
          return;
        }

        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "error",
              code: ARTWORK_CREATION_ERROR_CODE,
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
