import { sseEvent } from "@/lib/ai";
import { ARTWORK_CREATION_ERROR_CODE } from "@/lib/artwork-creation-messages";
import { createArtwork } from "@/lib/create-artwork";
import { getArtworkRaw } from "@/lib/redis";
import { fetchSketchCode } from "@/lib/storage";

export const maxDuration = 120;

export async function POST(request: Request) {
  const { tokenId, regenerate } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return new Response(JSON.stringify({ error: "tokenId required" }), {
      status: 400,
    });
  }

  const existing = await getArtworkRaw(tokenId);

  if (existing && !existing.imageExpired && !regenerate) {
    return new Response(
      JSON.stringify({
        title: existing.title,
        artistStatement: existing.artistStatement,
        kind: existing.kind ?? "image",
        imageUrl: existing.imageUrl,
        sketchUrl: existing.sketchUrl,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
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
        if (err instanceof Error && err.message === "Artwork already exists") {
          const sketchCode =
            existing!.kind === "sketch" && existing!.sketchUrl
              ? await fetchSketchCode(existing!.sketchUrl)
              : undefined;

          controller.enqueue(
            encoder.encode(
              sseEvent({
                type: "complete",
                title: existing!.title,
                artistStatement: existing!.artistStatement,
                kind: existing!.kind ?? "image",
                imageUrl: existing!.imageUrl,
                sketchUrl: existing!.sketchUrl,
                sketchCode,
                createdAt: existing!.createdAt,
              })
            )
          );
          return;
        }

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
