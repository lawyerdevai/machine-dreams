import { createArtwork } from "@/lib/create-artwork";
import { getArtworkRaw } from "@/lib/redis";

export const maxDuration = 120;

export async function POST(request: Request) {
  const { tokenId } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return Response.json({ error: "tokenId required" }, { status: 400 });
  }

  const existing = await getArtworkRaw(tokenId);
  if (existing && !existing.imageExpired) {
    return Response.json(
      { error: "Artwork already exists for this token" },
      { status: 409 }
    );
  }

  try {
    const result = await createArtwork(tokenId, {
      regenerate: existing?.imageExpired === true,
      evalBatch: true,
    });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Creation failed" },
      { status: 500 }
    );
  }
}
