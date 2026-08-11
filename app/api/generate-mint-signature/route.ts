import { NextResponse } from "next/server";
import {
  generateMintSignatureForNormie,
  MintSignatureError,
} from "@/lib/generate-mint-signature";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const walletAddress = body?.walletAddress;
  const tokenId = body?.tokenId;

  if (!walletAddress || typeof walletAddress !== "string") {
    return NextResponse.json(
      { error: "wallet_address_required" },
      { status: 400 }
    );
  }

  const trimmedAddress = walletAddress.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmedAddress)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  if (
    tokenId === undefined ||
    tokenId === null ||
    typeof tokenId !== "string" ||
    !tokenId.trim()
  ) {
    return NextResponse.json({ error: "token_id_required" }, { status: 400 });
  }

  try {
    const signedPayload = await generateMintSignatureForNormie(
      trimmedAddress,
      tokenId.trim()
    );
    return NextResponse.json({ signedPayload });
  } catch (err) {
    if (err instanceof MintSignatureError) {
      const status =
        err.code === "not_eligible"
          ? 403
          : err.code === "already_minted"
            ? 409
            : err.code === "missing_config"
              ? 500
              : 500;
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status }
      );
    }
    return NextResponse.json(
      { error: "signature_failed", message: "Failed to generate mint signature" },
      { status: 500 }
    );
  }
}
