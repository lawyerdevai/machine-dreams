import { NextResponse } from "next/server";
import { getAgentBinding, getAgentInfo } from "@/lib/normies";
import { getArtwork } from "@/lib/redis";

export async function POST(request: Request) {
  const { tokenId } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return NextResponse.json({ error: "token_id_required" }, { status: 400 });
  }

  const trimmed = tokenId.trim();
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 0 || Number(trimmed) > 9999) {
    return NextResponse.json({ error: "invalid_token_id" }, { status: 400 });
  }

  const [binding, info, artwork] = await Promise.all([
    getAgentBinding(trimmed),
    getAgentInfo(trimmed),
    getArtwork(trimmed),
  ]);

  if (!binding || !info) {
    return NextResponse.json({ awakened: false, tokenId: trimmed, hasArtwork: false });
  }

  return NextResponse.json({
    awakened: true,
    tokenId: trimmed,
    name: info.name,
    hasArtwork: artwork !== null,
  });
}
