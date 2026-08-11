import { NextResponse } from "next/server";
import { recordArtworkMint } from "@/lib/redis";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const tokenId = body?.tokenId;
  const mintedBy = body?.mintedBy;
  const mintTxHash = body?.mintTxHash;

  if (
    tokenId === undefined ||
    tokenId === null ||
    typeof tokenId !== "string" ||
    !tokenId.trim()
  ) {
    return NextResponse.json({ error: "token_id_required" }, { status: 400 });
  }

  if (!mintedBy || typeof mintedBy !== "string") {
    return NextResponse.json({ error: "minted_by_required" }, { status: 400 });
  }

  const trimmedAddress = mintedBy.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  if (!mintTxHash || typeof mintTxHash !== "string" || !mintTxHash.trim()) {
    return NextResponse.json({ error: "mint_tx_hash_required" }, { status: 400 });
  }

  try {
    const updated = await recordArtworkMint({
      tokenId: tokenId.trim(),
      mintedBy: trimmedAddress,
      mintTxHash: mintTxHash.trim(),
    });

    if (!updated) {
      console.error("[record-mint] artwork_not_found", {
        tokenId: tokenId.trim(),
        mintedBy: trimmedAddress,
        mintTxHash: mintTxHash.trim(),
      });
      return NextResponse.json({ error: "artwork_not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      mintStatus: updated.mintStatus,
      mintedAt: updated.mintedAt,
      mintedBy: updated.mintedBy,
      mintTxHash: updated.mintTxHash,
      mintedOnContract: updated.mintedOnContract,
      mintedOnChainId: updated.mintedOnChainId,
    });
  } catch (err) {
    console.error("[record-mint] record_mint_failed", {
      tokenId: tokenId.trim(),
      mintedBy: trimmedAddress,
      mintTxHash: mintTxHash.trim(),
      err,
    });
    return NextResponse.json(
      { error: "record_mint_failed" },
      { status: 500 }
    );
  }
}
