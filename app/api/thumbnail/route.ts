import { getArtworkRaw, saveArtwork } from "@/lib/redis";
import { persistThumbnailToBlob } from "@/lib/storage";

const PNG_DATA_URL_PREFIX = "data:image/png;base64,";
const MAX_BASE64_LENGTH = 4_000_000; // ~3MB decoded, plenty for a capture snapshot

export async function POST(request: Request) {
  const { tokenId, dataUrl } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return new Response(JSON.stringify({ error: "tokenId required" }), {
      status: 400,
    });
  }

  if (
    !dataUrl ||
    typeof dataUrl !== "string" ||
    !dataUrl.startsWith(PNG_DATA_URL_PREFIX) ||
    dataUrl.length > MAX_BASE64_LENGTH
  ) {
    return new Response(JSON.stringify({ error: "invalid dataUrl" }), {
      status: 400,
    });
  }

  const artwork = await getArtworkRaw(tokenId);

  if (!artwork || artwork.kind !== "sketch") {
    return new Response(null, { status: 404 });
  }

  // First-capture-wins: concurrent visitors racing to capture is safe.
  if (artwork.imageUrl) {
    return new Response(null, { status: 200 });
  }

  const base64 = dataUrl.slice(PNG_DATA_URL_PREFIX.length);
  const buffer = Buffer.from(base64, "base64");
  const imageUrl = await persistThumbnailToBlob(buffer, tokenId);

  await saveArtwork({ ...artwork, imageUrl });

  return new Response(null, { status: 200 });
}
