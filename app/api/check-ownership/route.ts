import { NextResponse } from "next/server";
import { checkOwnership } from "@/lib/check-ownership";

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

  const trimmedTokenId = tokenId.trim();

  try {
    const eligible = await checkOwnership(trimmedAddress, trimmedTokenId);
    return NextResponse.json({ eligible });
  } catch {
    return NextResponse.json(
      { error: "ownership_check_failed" },
      { status: 500 }
    );
  }
}
