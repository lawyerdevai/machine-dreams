import { NextResponse } from "next/server";
import { getAgentBinding, getAgentInfo } from "@/lib/normies";

export async function POST(request: Request) {
  const { tokenId } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return NextResponse.json({ error: "token_id_required" }, { status: 400 });
  }

  const trimmed = tokenId.trim();
  if (!/^\d+$/.test(trimmed) || Number(trimmed) < 0 || Number(trimmed) > 9999) {
    return NextResponse.json({ error: "invalid_token_id" }, { status: 400 });
  }

  const [binding, info] = await Promise.all([
    getAgentBinding(trimmed),
    getAgentInfo(trimmed),
  ]);

  if (!binding || !info) {
    return NextResponse.json({ awakened: false, tokenId: trimmed });
  }

  return NextResponse.json({ awakened: true, tokenId: trimmed, name: info.name });
}
