import { NextResponse } from "next/server";
import { isArtworkMinted } from "@/lib/artworks";
import { isNormieClaimAlreadyMinted } from "@/lib/check-already-minted";
import {
  getArtworkRaw,
  reconcileArtworkMintedOnChain,
} from "@/lib/redis";
import { getCurrentNftDeployment } from "@/lib/thirdweb-contract";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tokenId = body?.tokenId;

  if (
    tokenId === undefined ||
    tokenId === null ||
    typeof tokenId !== "string" ||
    !tokenId.trim()
  ) {
    return NextResponse.json({ error: "token_id_required" }, { status: 400 });
  }

  const trimmed = tokenId.trim();
  const deployment = getCurrentNftDeployment();

  try {
    // Fast path: Redis mint scoped to the currently configured contract/chain
    const artwork = await getArtworkRaw(trimmed);
    if (artwork && isArtworkMinted(artwork)) {
      return NextResponse.json({
        minted: true,
        source: "redis",
        mintTxHash: artwork.mintTxHash ?? null,
        mintedBy: artwork.mintedBy ?? null,
        mintedAt: artwork.mintedAt ?? null,
        mintedOnContract: artwork.mintedOnContract ?? null,
        mintedOnChainId: artwork.mintedOnChainId ?? null,
      });
    }

    // Fallback: on-chain uid check against CURRENT contract; reconcile if ahead
    const onChainMinted = await isNormieClaimAlreadyMinted(trimmed);
    if (onChainMinted) {
      await reconcileArtworkMintedOnChain(trimmed);
      return NextResponse.json({
        minted: true,
        source: "chain",
        mintedOnContract: deployment?.address ?? null,
        mintedOnChainId: deployment?.chainId ?? null,
      });
    }

    return NextResponse.json({
      minted: false,
      source: "chain",
      mintedOnContract: deployment?.address ?? null,
      mintedOnChainId: deployment?.chainId ?? null,
    });
  } catch (err) {
    console.error("[check-minted]", err);
    return NextResponse.json(
      { error: "check_minted_failed" },
      { status: 500 }
    );
  }
}
