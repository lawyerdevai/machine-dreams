import { Redis } from "@upstash/redis";
import {
  matchesGallerySearch,
  type GallerySort,
} from "./gallery";
import type { Artwork } from "./types";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ARTWORK_PREFIX = "artwork:";
const ARTWORK_INDEX = "artworks:index";
const ARCHIVE_PREFIX = "archive:";
const ARCHIVE_INDEX = "archive:index";
const INTRO_PREFIX = "intro:";
const MIGRATION_KEY = "migration:imageExpiry:v1";

export function artworkKey(tokenId: string) {
  return `${ARTWORK_PREFIX}${tokenId}`;
}

export function archiveKey(tokenId: string) {
  return `${ARCHIVE_PREFIX}${tokenId}`;
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

export async function deleteArchivedArtwork(tokenId: string): Promise<void> {
  await redis.del(archiveKey(tokenId));
  await redis.srem(ARCHIVE_INDEX, tokenId);
}

export type GalleryArtworksResult = {
  items: Artwork[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

async function mgetArtworks(tokenIds: string[]): Promise<Artwork[]> {
  if (tokenIds.length === 0) return [];

  const keys = tokenIds.map((id) => artworkKey(String(id)));
  const chunkSize = 100;
  const artworks: Artwork[] = [];

  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    const batch = await redis.mget<(Artwork | null)[]>(...chunk);
    for (const record of batch) {
      if (record) artworks.push(record);
    }
  }

  return artworks;
}

export async function getGalleryArtworks({
  page,
  perPage,
  sort,
  search = "",
}: {
  page: number;
  perPage: number;
  sort: GallerySort;
  search?: string;
}): Promise<GalleryArtworksResult> {
  await ensureMigration();

  const tokenIds = await redis.smembers<string[]>(ARTWORK_INDEX);
  if (!tokenIds || tokenIds.length === 0) {
    return { items: [], total: 0, page: 1, perPage, totalPages: 1 };
  }

  let artworks = (await mgetArtworks(tokenIds)).filter((a) => !isExpired(a));

  if (search.trim()) {
    artworks = artworks.filter((a) => matchesGallerySearch(a, search));
  }

  artworks.sort((a, b) => {
    const diff =
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return sort === "newest" ? diff : -diff;
  });

  const total = artworks.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  const items = artworks.slice(start, start + perPage);

  return {
    items,
    total,
    page: currentPage,
    perPage,
    totalPages,
  };
}

export async function deleteEvalBatchArtworks(): Promise<number> {
  const artworks = await getAllArtworks();
  const evalArtworks = artworks.filter((a) => a.evalBatch === true);

  await Promise.all(
    evalArtworks.map((a) => deleteArtwork(a.tokenId))
  );

  return evalArtworks.length;
}

export async function deleteExpiredArtworks(): Promise<number> {
  const tokenIds = await redis.smembers<string[]>(ARTWORK_INDEX);
  if (!tokenIds || tokenIds.length === 0) return 0;

  let deleted = 0;

  await Promise.all(
    tokenIds.map(async (id) => {
      const tokenId = String(id);
      const artwork = await redis.get<Artwork>(artworkKey(tokenId));
      if (!artwork?.imageExpired) return;

      await redis.del(artworkKey(tokenId));
      await redis.srem(ARTWORK_INDEX, tokenId);
      deleted++;
    })
  );

  return deleted;
}

export async function snapshotArtworksToArchive(): Promise<number> {
  const existingArchiveIds = await redis.smembers<string[]>(ARCHIVE_INDEX);
  if (existingArchiveIds && existingArchiveIds.length > 0) {
    await Promise.all(
      existingArchiveIds.map((id) => redis.del(archiveKey(String(id))))
    );
  }
  await redis.del(ARCHIVE_INDEX);

  const tokenIds = await redis.smembers<string[]>(ARTWORK_INDEX);
  if (!tokenIds || tokenIds.length === 0) return 0;

  let archived = 0;

  await Promise.all(
    tokenIds.map(async (id) => {
      const tokenId = String(id);
      const artwork = await redis.get<Artwork>(artworkKey(tokenId));
      if (!artwork) return;

      await redis.set(archiveKey(tokenId), artwork);
      await redis.sadd(ARCHIVE_INDEX, tokenId);
      archived++;
    })
  );

  return archived;
}

export async function purgeExpiredAndArchiveArtworks(): Promise<{
  deletedExpired: number;
  archived: number;
}> {
  const deletedExpired = await deleteExpiredArtworks();
  const archived = await snapshotArtworksToArchive();
  return { deletedExpired, archived };
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

export async function getAllArchivedArtworks(): Promise<Artwork[]> {
  const tokenIds = await redis.smembers<string[]>(ARCHIVE_INDEX);
  if (!tokenIds || tokenIds.length === 0) return [];

  const artworks = await Promise.all(
    tokenIds.map((id) => redis.get<Artwork>(archiveKey(String(id))))
  );

  return artworks
    .filter((a): a is Artwork => a !== null)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}
