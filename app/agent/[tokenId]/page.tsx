import { notFound } from "next/navigation";
import { AgentPageClient } from "@/app/components/agent-page-client";
import { getAgentInfo } from "@/lib/normies";
import { getArtwork, getArtworkRaw, getIntro } from "@/lib/redis";
import { fetchSketchCode } from "@/lib/storage";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const [agent, artwork, rawArtwork, cachedIntro] = await Promise.all([
    getAgentInfo(tokenId),
    getArtwork(tokenId),
    getArtworkRaw(tokenId),
    getIntro(tokenId),
  ]);

  if (!agent) notFound();

  const expiredArtwork =
    rawArtwork?.imageExpired && !artwork ? rawArtwork : null;

  const sketchCode =
    artwork?.kind === "sketch" && artwork.sketchUrl
      ? await fetchSketchCode(artwork.sketchUrl)
      : null;

  return (
    <main className="flex-1 px-6 py-12 bg-white">
      <AgentPageClient
        agent={agent}
        artwork={artwork}
        sketchCode={sketchCode}
        expiredArtwork={expiredArtwork}
        cachedIntro={cachedIntro}
      />
    </main>
  );
}
