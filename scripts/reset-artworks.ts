import { redis, artworkKey, archiveKey } from "../lib/redis";

const ARTWORK_INDEX = "artworks:index";
const ARCHIVE_INDEX = "archive:index";

async function clearIndex(
  indexKey: string,
  recordKey: (tokenId: string) => string,
  label: string
) {
  const tokenIds = await redis.smembers<string[]>(indexKey);
  const ids = (tokenIds ?? []).map(String);

  if (ids.length > 0) {
    await Promise.all(ids.map((tokenId) => redis.del(recordKey(tokenId))));
  }

  await redis.del(indexKey);

  console.log(`Deleted ${ids.length} ${label} records and cleared ${indexKey}`);
  return ids.length;
}

async function main() {
  const liveDeleted = await clearIndex(ARTWORK_INDEX, artworkKey, "live artwork");
  const archiveDeleted = await clearIndex(
    ARCHIVE_INDEX,
    archiveKey,
    "archive"
  );

  console.log(`Total deleted: ${liveDeleted + archiveDeleted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
