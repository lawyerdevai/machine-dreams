import { Redis } from "@upstash/redis";
import type { Artwork } from "./types";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ARTWORK_PREFIX = "artwork:";
const ARTWORK_INDEX = "artworks:index";

export function artworkKey(tokenId: string) {
  return `${ARTWORK_PREFIX}${tokenId}`;
}

export async function getArtwork(tokenId: string): Promise<Artwork | null> {
  const data = await redis.get<Artwork>(artworkKey(tokenId));
  return data ?? null;
}

export async function saveArtwork(artwork: Artwork): Promise<void> {
  await redis.set(artworkKey(artwork.tokenId), artwork);
  await redis.sadd(ARTWORK_INDEX, artwork.tokenId);
}

export async function getAllArtworks(): Promise<Artwork[]> {
  const tokenIds = await redis.smembers<string[]>(ARTWORK_INDEX);
  if (!tokenIds || tokenIds.length === 0) return [];

  const artworks = await Promise.all(
    tokenIds.map((id) => getArtwork(id))
  );
  return artworks.filter((a): a is Artwork => a !== null);
}
