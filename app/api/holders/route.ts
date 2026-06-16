import { NextResponse } from "next/server";
import { getAwakenedAgents, getHolderTokenIds } from "@/lib/normies";

export async function POST(request: Request) {
  const { address } = await request.json();

  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "Address required" }, { status: 400 });
  }

  try {
    const tokenIds = await getHolderTokenIds(address);
    const agents = await getAwakenedAgents(tokenIds);
    return NextResponse.json({ agents });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch holders" },
      { status: 500 }
    );
  }
}
