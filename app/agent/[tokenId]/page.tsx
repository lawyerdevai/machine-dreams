import { notFound } from "next/navigation";
import Link from "next/link";
import { AgentExperience } from "@/app/components/agent-experience";
import { getAgentInfo } from "@/lib/normies";
import { getArtwork } from "@/lib/redis";

export default async function AgentPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params;
  const [agent, artwork] = await Promise.all([
    getAgentInfo(tokenId),
    getArtwork(tokenId),
  ]);

  if (!agent) notFound();

  return (
    <main className="flex flex-col items-center px-6 py-12 gap-8 bg-[#0a0a0a] min-h-screen">
      <Link
        href="/"
        className="self-start text-xs text-[#666] hover:text-[#e3e5e4] transition-colors duration-500"
      >
        ← Back
      </Link>
      <AgentExperience agent={agent} initialArtwork={artwork} />
    </main>
  );
}
