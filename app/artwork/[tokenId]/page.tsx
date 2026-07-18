import { notFound } from "next/navigation";
import { getArtwork, getIntro } from "@/lib/redis";
import { fetchSketchCode } from "@/lib/storage";
import { ArtworkPageClient } from "@/app/components/artwork-page-client";

export default async function ArtworkPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const [artwork, intro] = await Promise.all([
    getArtwork(tokenId),
    getIntro(tokenId),
  ]);

  if (!artwork) notFound();

  const sketchCode =
    artwork.kind === "sketch" && artwork.sketchUrl
      ? await fetchSketchCode(artwork.sketchUrl)
      : null;

  return (
    <main className="flex-1 px-6 py-12 bg-white">
      <ArtworkPageClient artwork={artwork} intro={intro} sketchCode={sketchCode} />
    </main>
  );
}
