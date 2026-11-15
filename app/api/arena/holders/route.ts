import { NextResponse } from "next/server";
import { getArenaPortrait, isArenaEnabled } from "@/lib/arena";
import { getAgentInfo, getAwakenedAgents, getHolderTokenIds } from "@/lib/normies";

export async function POST(request: Request) {
  if (!isArenaEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const address = body?.address;

  if (!address || typeof address !== "string") {
    return NextResponse.json(
      { error: "address_required", message: "Enter a wallet address." },
      { status: 400 }
    );
  }

  const trimmed = address.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    return NextResponse.json(
      { error: "invalid_address", message: "That doesn't look like a valid Ethereum address." },
      { status: 400 }
    );
  }

  try {
    const tokenIds = await getHolderTokenIds(trimmed);
    const awakened = await getAwakenedAgents(tokenIds);
    const normies = await Promise.all(
      awakened.map(async (entry) => {
        const [info, portrait] = await Promise.all([
          getAgentInfo(entry.tokenId),
          getArenaPortrait(entry.tokenId),
        ]);
        return {
          tokenId: entry.tokenId,
          name: info?.name ?? `Normie #${entry.tokenId}`,
          type: info?.type ?? "",
          hasPortrait: portrait !== null,
        };
      })
    );
    return NextResponse.json({ normies });
  } catch {
    return NextResponse.json(
      {
        error: "holders_failed",
        message: "Something went wrong looking up that wallet. Please try again.",
      },
      { status: 500 }
    );
  }
}
