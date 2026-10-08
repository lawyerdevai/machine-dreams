import { NextResponse } from "next/server";
import { getLive } from "@/lib/datagrams/live";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public. This week's numbers so far, the latest fills, and a market summary. Cached 30 s on the server. */
export async function GET() {
  try {
    return NextResponse.json(await getLive(), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
