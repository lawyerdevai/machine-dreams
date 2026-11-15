import { sseEvent } from "@/lib/ai";
import {
  ARENA_REQUIRE_OWNERSHIP,
  acquireArenaLock,
  authorizeArenaCreate,
  clientIp,
  consumeArenaRateLimit,
  getArenaPortrait,
  isArenaEnabled,
  isArenaTokenId,
  releaseArenaLock,
} from "@/lib/arena";
import {
  ARENA_DRAW_USER_MESSAGE,
  ARENA_NOT_AWAKENED_MESSAGE,
  ARENA_SAFETY_MESSAGE,
  drawArenaPortrait,
} from "@/lib/create-arena";
import { getAgentBinding, getAgentInfo } from "@/lib/normies";

export const maxDuration = 120;

function jsonError(message: string, status: number, error: string) {
  return new Response(JSON.stringify({ error, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  if (!isArenaEnabled()) {
    return jsonError("Not found", 404, "not_found");
  }

  const body = await request.json().catch(() => null);
  const tokenId = typeof body?.tokenId === "string" ? body.tokenId.trim() : "";
  if (!isArenaTokenId(tokenId)) {
    return jsonError(
      "Enter a Normie number between 0 and 9999.",
      400,
      "invalid_token_id"
    );
  }

  const regenerate =
    body?.regenerate === true && process.env.NODE_ENV === "development";

  const existing = await getArenaPortrait(tokenId);
  if (existing && !regenerate) {
    return new Response(
      JSON.stringify({
        title: existing.title,
        imageUrl: existing.imageUrl,
        createdAt: existing.createdAt,
        alreadyExisted: true,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  let creator = "development";
  if (ARENA_REQUIRE_OWNERSHIP) {
    const wallet = typeof body?.walletAddress === "string" ? body.walletAddress : "";
    const message = typeof body?.message === "string" ? body.message : "";
    const signature = typeof body?.signature === "string" ? body.signature : "";
    const auth = await authorizeArenaCreate({
      tokenId,
      wallet,
      message,
      signature,
    });
    if (!auth.ok) {
      return jsonError(auth.message, 403, "not_allowed");
    }
    creator = auth.wallet;
  } else if (typeof body?.walletAddress === "string" && body.walletAddress.trim()) {
    creator = body.walletAddress.trim().toLowerCase();
  }

  try {
    const [binding, info] = await Promise.all([
      getAgentBinding(tokenId),
      getAgentInfo(tokenId),
    ]);
    if (!binding || !info) {
      return jsonError(ARENA_NOT_AWAKENED_MESSAGE, 400, "not_awakened");
    }
  } catch {
    return jsonError(
      "Something went wrong checking that Normie. Please try again.",
      500,
      "check_failed"
    );
  }

  const locked = await acquireArenaLock(tokenId);
  if (!locked) {
    return jsonError(
      "This Normie is already being drawn. Please wait.",
      409,
      "in_flight"
    );
  }

  try {
    const allowed = await consumeArenaRateLimit(clientIp(request));
    if (!allowed) {
      await releaseArenaLock(tokenId);
      return jsonError(
        "Too many drawings were started from here. Please try again in a little while.",
        429,
        "rate_limited"
      );
    }
  } catch {
    await releaseArenaLock(tokenId);
    return jsonError(
      "This portrait couldn't be drawn right now. Please try again in a moment.",
      500,
      "rate_check_failed"
    );
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const again = await getArenaPortrait(tokenId);
        if (again && !regenerate) {
          controller.enqueue(
            encoder.encode(
              sseEvent({
                type: "complete",
                title: again.title,
                imageUrl: again.imageUrl,
                createdAt: again.createdAt,
                alreadyExisted: true,
              })
            )
          );
          return;
        }

        const portrait = await drawArenaPortrait({
          tokenId,
          creator,
          previousCreatedAt: regenerate ? again?.createdAt : undefined,
        });

        controller.enqueue(
          encoder.encode(
            sseEvent({
              type: "complete",
              title: portrait.title,
              imageUrl: portrait.imageUrl,
              createdAt: portrait.createdAt,
              alreadyExisted: false,
            })
          )
        );
      } catch (err) {
        const message =
          err instanceof Error &&
          (err.message === ARENA_NOT_AWAKENED_MESSAGE ||
            err.message === ARENA_SAFETY_MESSAGE)
            ? err.message
            : ARENA_DRAW_USER_MESSAGE;
        controller.enqueue(
          encoder.encode(sseEvent({ type: "error", message }))
        );
      } finally {
        await releaseArenaLock(tokenId).catch(() => undefined);
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
