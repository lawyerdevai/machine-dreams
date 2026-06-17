import { pickRandomTokenIdsWithoutArtwork } from "@/lib/test-batch";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const count = Math.min(
    30,
    Math.max(1, Number(searchParams.get("count") ?? 30))
  );

  const tokenIds = await pickRandomTokenIdsWithoutArtwork(count);

  return Response.json({ tokenIds });
}
