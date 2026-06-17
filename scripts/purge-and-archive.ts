import { purgeExpiredAndArchiveArtworks } from "../lib/redis";

async function main() {
  const result = await purgeExpiredAndArchiveArtworks();
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
