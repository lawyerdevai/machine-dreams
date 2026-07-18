import { sseEvent } from "@/lib/ai";
import { ARTWORK_CREATION_ERROR_CODE } from "@/lib/artwork-creation-messages";
import { createArtwork } from "@/lib/create-artwork";

export const maxDuration = 120;

// SEASON-2-MOTION TEST BRANCH ONLY — do not merge to main.
// The existing-artwork short-circuit (and its "Artwork already exists"
// fallback below) is removed so generation can be triggered for any
// awakened Normie, including ones that already have a Season 1 piece.

export async function POST(request: Request) {
  const { tokenId, regenerate } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return new Response(JSON.stringify({ error: "tokenId required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const result = await createArtwork(tokenId, { regenerate });

        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "complete",
              title: result.title,
              artistStatement: result.artistStatement,
              kind: result.kind,
              sketchCode: result.sketchCode,
              sketchUrl: result.sketchUrl,
              createdAt: result.createdAt,
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
