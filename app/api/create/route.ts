import { sseEvent } from "@/lib/ai";
import {
  completeArtworkCreation,
  generateCreationPayload,
} from "@/lib/create-artwork";
import type { CreationPayload } from "@/lib/types";
import { getArtworkRaw } from "@/lib/redis";

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

  let parsed: CreationPayload;
  let agentInfo;
  try {
    const result = await generateCreationPayload(tokenId, { regenerate });
    parsed = result.parsed;
    agentInfo = result.agentInfo;
  } catch (err) {
    if (err instanceof Error && err.message === "Artwork already exists") {
      return new Response(
        JSON.stringify({
          title: existing!.title,
          imageUrl: existing!.imageUrl,
          artistStatement: existing!.artistStatement,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (err instanceof Error && err.message === "Agent not found") {
      return new Response(JSON.stringify({ error: "Agent not found" }), {
        status: 404,
      });
    }
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

        const result = await completeArtworkCreation(
          tokenId,
          parsed,
          agentInfo,
          { previousCreatedAt, previousMintedAt }
        );

        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "image",
              imageUrl: result.imageUrl,
              title: result.title,
            })
          )
        );

        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "complete",
              title: result.title,
              artistStatement: result.artistStatement,
              imageUrl: result.imageUrl,
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
