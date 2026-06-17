import {
  formatCreatedAt,
  formatTokenId,
  lowercaseName,
  sentenceCase,
  uppercaseTitle,
} from "@/lib/format";
import { TYPE } from "@/lib/typography";
import type { ReactNode } from "react";

export function SectionLabel({ children }: { children: ReactNode }) {
  return <span className={TYPE.sectionLabel}>{children}</span>;
}

export function ArtworkTitle({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  return (
    <h1 className={`${TYPE.artworkTitle} ${className}`.trim()}>
      {uppercaseTitle(title)}
    </h1>
  );
}

export function TileTitle({ title }: { title: string }) {
  return (
    <span className={TYPE.tileTitle}>{uppercaseTitle(title)}</span>
  );
}

export function AgentName({
  name,
  prominent = false,
  as: Tag = "span",
}: {
  name: string;
  prominent?: boolean;
  as?: "span" | "p";
}) {
  return (
    <Tag className={prominent ? TYPE.metadataLg : TYPE.metadata}>
      {lowercaseName(name)}
    </Tag>
  );
}

export function TokenId({
  tokenId,
  as: Tag = "span",
}: {
  tokenId: string;
  as?: "span" | "p";
}) {
  return <Tag className={TYPE.metadata}>{formatTokenId(tokenId)}</Tag>;
}

export function AgentTokenLine({
  name,
  tokenId,
}: {
  name: string;
  tokenId: string;
}) {
  return (
    <span className={TYPE.metadata}>
      {lowercaseName(name)} · {formatTokenId(tokenId)}
    </span>
  );
}

export function CreatedDate({
  iso,
  as: Tag = "p",
}: {
  iso: string;
  as?: "p" | "span";
}) {
  return <Tag className={TYPE.metadata}>{formatCreatedAt(iso)}</Tag>;
}

export function ProseSm({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`${TYPE.proseSm} ${className}`.trim()}>{children}</p>
  );
}

export function ProseText({ text }: { text: string }) {
  return <ProseSm>{sentenceCase(text)}</ProseSm>;
}
