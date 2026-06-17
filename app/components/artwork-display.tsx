import {
  AgentName,
  ArtworkTitle,
  ProseText,
  SectionLabel,
} from "@/app/components/typography";
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
      <AgentName name={agentName} prominent as="p" />
      {intro && <ProseText text={intro} />}
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
      <ArtworkTitle title={title} className="title-artwork" />
      <img src={imageUrl} alt={title} className="w-full" />
      <div className="flex flex-col gap-4">
        <SectionLabel>Artist Statement</SectionLabel>
        <div className="h-px bg-[#0a0a0a] w-full" />
        <ProseText text={artistStatement} />
      </div>
    </div>
  );
}
