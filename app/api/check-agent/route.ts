import { NextResponse } from "next/server";
import { getAgentBinding, getAgentInfo } from "@/lib/normies";

export async function POST(request: Request) {
  const { tokenId } = await request.json();

  if (!tokenId || typeof tokenId !== "string") {
    return NextResponse.json({ error: "tokenId required" }, { status: 400 });
  }

  const [binding, info] = await Promise.all([
    getAgentBinding(tokenId),
    getAgentInfo(tokenId),
  ]);

  if (!binding || !info) {
    return NextResponse.json({ awakened: false });
  }

  return NextResponse.json({ awakened: true, tokenId, name: info.name });
}
