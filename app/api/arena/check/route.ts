import { NextResponse } from "next/server";
import { getArenaPortrait, isArenaEnabled, isArenaTokenId } from "@/lib/arena";
import { getAgentBinding, getAgentInfo } from "@/lib/normies";

export async function POST(request: Request) {
  if (!isArenaEnabled()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const tokenId = body?.tokenId;

  if (!tokenId || typeof tokenId !== "string" || !isArenaTokenId(tokenId.trim())) {
    return NextResponse.json(
      { error: "invalid_token_id", message: "Enter a Normie number between 0 and 9999." },
      { status: 400 }
    );
  }

  const trimmed = tokenId.trim();

  try {
    const [binding, info, portrait] = await Promise.all([
      getAgentBinding(trimmed),
      getAgentInfo(trimmed),
      getArenaPortrait(trimmed),
    ]);

    if (!binding || !info) {
      return NextResponse.json({
        awakened: false,
        tokenId: trimmed,
        hasPortrait: false,
      });
    }

    return NextResponse.json({
      awakened: true,
      tokenId: trimmed,
      name: info.name,
      type: info.type ?? "",
      hasPortrait: portrait !== null,
    });
  } catch {
    return NextResponse.json(
      { error: "check_failed", message: "Something went wrong checking that Normie. Please try again." },
      { status: 500 }
    );
  }
}
