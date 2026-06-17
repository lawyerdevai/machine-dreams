import { Redis } from "@upstash/redis";
import type { Artwork } from "./types";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ARTWORK_PREFIX = "artwork:";
const ARTWORK_INDEX = "artworks:index";
const INTRO_PREFIX = "intro:";
const MIGRATION_KEY = "migration:imageExpiry:v1";

export function artworkKey(tokenId: string) {
  return `${ARTWORK_PREFIX}${tokenId}`;
}

export function introKey(tokenId: string) {
  return `${INTRO_PREFIX}${tokenId}`;
}

export async function getIntro(tokenId: string): Promise<string | null> {
  const text = await redis.get<string>(introKey(tokenId));
  return text ?? null;
}

export async function saveIntro(tokenId: string, text: string): Promise<void> {
  await redis.set(introKey(tokenId), text);
}

function isExpired(artwork: Artwork) {
  return artwork.imageExpired === true;
}

async function isImageUrlExpired(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return !res.ok;
  } catch {
    return true;
  }
}

export async function migrateExpiredArtworks(): Promise<void> {
  const done = await redis.get<boolean>(MIGRATION_KEY);
  if (done) return;

  const tokenIds = await redis.smembers<string[]>(ARTWORK_INDEX);
  if (!tokenIds || tokenIds.length === 0) {
    await redis.set(MIGRATION_KEY, true);
    return;
  }

  await Promise.all(
    tokenIds.map(async (id) => {
      const tokenId = String(id);
      const artwork = await redis.get<Artwork>(artworkKey(tokenId));
      if (!artwork || artwork.imageExpired) return;

      const expired = await isImageUrlExpired(artwork.imageUrl);
      if (expired) {
        await redis.set(artworkKey(tokenId), { ...artwork, imageExpired: true });
      }
    })
  );

  await redis.set(MIGRATION_KEY, true);
}

async function ensureMigration(): Promise<void> {
  await migrateExpiredArtworks();
}

export async function getArtwork(tokenId: string): Promise<Artwork | null> {
  await ensureMigration();
  const data = await redis.get<Artwork>(artworkKey(tokenId));
  if (!data || isExpired(data)) return null;
  return data;
}

export async function getArtworkRaw(tokenId: string): Promise<Artwork | null> {
  await ensureMigration();
  const data = await redis.get<Artwork>(artworkKey(tokenId));
  return data ?? null;
}

export async function saveArtwork(artwork: Artwork): Promise<void> {
  await redis.set(artworkKey(artwork.tokenId), artwork);
  await redis.sadd(ARTWORK_INDEX, artwork.tokenId);
}

export async function deleteArtwork(tokenId: string): Promise<void> {
  await redis.del(artworkKey(tokenId));
  await redis.srem(ARTWORK_INDEX, tokenId);
}

export async function deleteEvalBatchArtworks(): Promise<number> {
  const artworks = await getAllArtworks();
  const evalArtworks = artworks.filter((a) => a.evalBatch === true);

  await Promise.all(
    evalArtworks.map((a) => deleteArtwork(a.tokenId))
  );

  return evalArtworks.length;
}

export async function getAllArtworks(): Promise<Artwork[]> {
  await ensureMigration();

  const tokenIds = await redis.smembers<string[]>(ARTWORK_INDEX);
  if (!tokenIds || tokenIds.length === 0) return [];

  const artworks = await Promise.all(
    tokenIds.map((id) => redis.get<Artwork>(artworkKey(String(id))))
  );
  return artworks.filter((a): a is Artwork => a !== null);
}

export async function getValidArtworks(): Promise<Artwork[]> {
  return (await getAllArtworks()).filter((a) => !isExpired(a));
}
