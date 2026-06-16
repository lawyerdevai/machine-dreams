import { lowercaseName, sentenceCase, uppercaseTitle } from "@/lib/format";
import { agentImageUrl } from "@/lib/normies";

export function ArtworkLeftColumn({
  tokenId,
  agentName,
  intro,
}: {
  tokenId: string;
  agentName: string;
  intro?: string | null;
}) {
  return (
    <div className="flex flex-col gap-8">
      <img
        src={agentImageUrl(tokenId)}
        alt={agentName}
        className="w-full max-w-md bg-white"
      />
      <p className="name-agent lowercase">{lowercaseName(agentName)}</p>
      {intro && (
        <p className="text-prose">{sentenceCase(intro)}</p>
      )}
    </div>
  );
}

export function ArtworkRightColumn({
  title,
  imageUrl,
  artistStatement,
}: {
  title: string;
  imageUrl: string;
  artistStatement: string;
}) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="title-artwork uppercase">
        {uppercaseTitle(title)}
      </h1>
      <img src={imageUrl} alt={title} className="w-full" />
      <div className="flex flex-col gap-4">
        <span className="font-mono text-xs uppercase tracking-widest">
          Artist Statement
        </span>
        <div className="h-px bg-[#0a0a0a] w-full" />
        <p className="text-prose">{sentenceCase(artistStatement)}</p>
      </div>
    </div>
  );
}
