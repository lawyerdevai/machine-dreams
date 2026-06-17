import {
  deleteArtwork,
  deleteArchivedArtwork,
  snapshotArtworksToArchive,
} from "../lib/redis";

const BAD_TOKENS = ["1243", "9754", "7374"];

async function main() {
  for (const tokenId of BAD_TOKENS) {
    await deleteArtwork(tokenId);
    await deleteArchivedArtwork(tokenId);
  }

  const archived = await snapshotArtworksToArchive();
  console.log(
    JSON.stringify({ deleted: BAD_TOKENS.length, archived }, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
