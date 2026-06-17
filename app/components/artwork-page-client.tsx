import {
  AgentName,
  ArtworkTitle,
  CreatedDate,
  ProseText,
  SectionLabel,
} from "@/app/components/typography";
import { agentImageUrl } from "@/lib/normies";
import type { Artwork } from "@/lib/types";

const IMAGE_FRAME = "w-full aspect-square";

export function ArtworkPageClient({
  artwork,
  intro,
}: {
  artwork: Artwork;
  intro: string | null;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-6xl mx-auto">
      <div className="flex flex-col gap-6">
        <div className={IMAGE_FRAME}>
          <img
            src={agentImageUrl(artwork.tokenId)}
            alt={artwork.agentName}
            className="w-full h-full object-cover"
          />
        </div>
        <AgentName name={artwork.agentName} prominent as="p" />
        {intro && <ProseText text={intro} />}
      </div>

      <div className="flex flex-col gap-6">
        <ArtworkTitle title={artwork.title} />
        <div className={IMAGE_FRAME}>
          <img
            src={artwork.imageUrl}
            alt={artwork.title}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex flex-col gap-3">
          <SectionLabel>Artist Statement</SectionLabel>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <ProseText text={artwork.artistStatement} />
          <CreatedDate iso={artwork.createdAt} />
        </div>
      </div>
    </div>
  );
}
