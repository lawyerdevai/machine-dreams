import { NextResponse } from "next/server";
import { getLive } from "@/lib/datagrams/live";

export const runtime = "nodejs";
/** Allow CDN caching via Cache-Control on the response (force-dynamic would force no-store). */
export const revalidate = 30;

const CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
};

/** Public. This week's numbers so far. Shared across visitors via CDN + in-memory cache. */
export async function GET() {
  try {
    return NextResponse.json(await getLive(), { headers: CACHE_HEADERS });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
