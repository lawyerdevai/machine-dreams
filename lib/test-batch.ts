import { getAgentInfo } from "@/lib/normies";
import { getAllArtworks } from "@/lib/redis";

export async function pickRandomTokenIdsWithoutArtwork(
  count: number
): Promise<string[]> {
  const artworks = await getAllArtworks();
  const existing = new Set(artworks.map((a) => a.tokenId));
  const picked: string[] = [];
  let attempts = 0;
  const maxAttempts = count * 100;

  while (picked.length < count && attempts < maxAttempts) {
    const id = String(Math.floor(Math.random() * 10000));
    attempts++;
    if (existing.has(id) || picked.includes(id)) continue;

    const agent = await getAgentInfo(id);
    if (!agent) continue;

    picked.push(id);
  }

  return picked;
}
