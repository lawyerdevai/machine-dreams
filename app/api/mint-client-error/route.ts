import { NextResponse } from "next/server";

/**
 * Temporary debug sink — client mint errors → server terminal.
 * Remove once mint flow is stable.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  console.error("[mint-client-error]", JSON.stringify(body, null, 2));
  return NextResponse.json({ ok: true });
}
