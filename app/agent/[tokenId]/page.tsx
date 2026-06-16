import { notFound } from "next/navigation";
import { AgentPageClient } from "@/app/components/agent-page-client";
import { getAgentInfo } from "@/lib/normies";
import { getArtwork, getArtworkRaw, getIntro } from "@/lib/redis";

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

  return (
    <main className="flex-1 px-6 py-12 bg-white">
      <AgentPageClient
        agent={agent}
        artwork={artwork}
        expiredArtwork={expiredArtwork}
        cachedIntro={cachedIntro}
      />
    </main>
  );
}
