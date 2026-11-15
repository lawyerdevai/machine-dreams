import { notFound } from "next/navigation";
import { ArenaPieceClient } from "@/app/components/arena-piece-client";
import { getArenaPortrait, isArenaEnabled, isArenaTokenId } from "@/lib/arena";

export const dynamic = "force-dynamic";

export default async function ArenaPiecePage({
  params,
  searchParams,
}: {
  params: Promise<{ tokenId: string }>;
  searchParams: Promise<{ justCreated?: string; debugRegenerate?: string }>;
}) {
  if (!isArenaEnabled()) notFound();
  const { tokenId } = await params;
  const { justCreated, debugRegenerate } = await searchParams;
  if (!isArenaTokenId(tokenId)) notFound();

  const portrait = await getArenaPortrait(tokenId);
  if (!portrait) notFound();

  return (
    <ArenaPieceClient
      portrait={portrait}
      playReveal={justCreated === "true"}
      debugRegenerate={
        debugRegenerate === "true" && process.env.NODE_ENV === "development"
      }
    />
  );
}
