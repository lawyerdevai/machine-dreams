import { lowercaseName, sentenceCase, uppercaseTitle } from "@/lib/format";
import { agentImageUrl } from "@/lib/normies";
import type { Artwork } from "@/lib/types";

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
        <img
          src={agentImageUrl(artwork.tokenId)}
          alt={artwork.agentName}
          className="w-full max-w-md"
        />
        <p className="text-lg lowercase">{lowercaseName(artwork.agentName)}</p>
        {intro && (
          <p className="text-sm leading-relaxed">{sentenceCase(intro)}</p>
        )}
      </div>

      <div className="flex flex-col gap-6">
        <h1 className="text-xl uppercase tracking-wide">
          {uppercaseTitle(artwork.title)}
        </h1>
        <img src={artwork.imageUrl} alt={artwork.title} className="w-full" />
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-widest">
            Artist Statement
          </span>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className="text-sm leading-relaxed">
            {sentenceCase(artwork.artistStatement)}
          </p>
        </div>
      </div>
    </div>
  );
}
