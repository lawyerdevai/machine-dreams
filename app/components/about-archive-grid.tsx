import Image from "next/image";
import { AgentTokenLine } from "@/app/components/typography";
import { TYPE } from "@/lib/typography";
import type { Artwork } from "@/lib/types";

export function AboutArchiveGrid({ artworks }: { artworks: Artwork[] }) {
  if (artworks.length === 0) {
    return <p className={TYPE.status}>no archived works yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {artworks.map((artwork) => (
        <div key={artwork.tokenId} className="border border-[#0a0a0a]">
          <div className="relative aspect-square w-full overflow-hidden">
            <Image
              src={artwork.imageUrl}
              alt={artwork.agentName}
              fill
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-cover"
            />
          </div>
          <div className="p-3 flex flex-col gap-1">
            <AgentTokenLine
              name={artwork.agentName}
              tokenId={artwork.tokenId}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
