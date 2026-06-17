import { NextResponse } from "next/server";
import { getAwakenedAgents, getAgentInfo, getHolderTokenIds } from "@/lib/normies";

export async function POST(request: Request) {
  const { address } = await request.json();

  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "address_required" }, { status: 400 });
  }

  const trimmed = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return NextResponse.json({ error: "invalid_address" }, { status: 400 });
  }

  try {
    const tokenIds = await getHolderTokenIds(trimmed);
    const awakened = await getAwakenedAgents(tokenIds);
    const agents = await Promise.all(
      awakened.map(async (a) => {
        const info = await getAgentInfo(a.tokenId);
        return {
          tokenId: a.tokenId,
          name: info?.name ?? `normie #${a.tokenId}`,
        };
      })
    );
    return NextResponse.json({ agents });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch holders" },
      { status: 500 }
    );
  }
}
