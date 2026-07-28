import { notFound } from "next/navigation";
import { ArtworkPageClient } from "@/app/components/artwork-page-client";
import { getAgentInfo } from "@/lib/normies";
import { getArtwork, getIntro } from "@/lib/redis";

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

  // Prefer Redis intro (agent voice); fall back to API backstory when uncached.
  let aboutBio = intro?.trim() || null;
  if (!aboutBio) {
    const info = await getAgentInfo(tokenId);
    aboutBio = info?.backstory?.trim() || null;
  }

  return (
    <main className="flex flex-1 flex-col bg-white">
      <ArtworkPageClient artwork={artwork} aboutBio={aboutBio} />
    </main>
  );
}
