import { NextResponse } from "next/server";
import { getWeek } from "@/lib/datagrams/store";
import { fetchDaily } from "@/lib/datagrams/week";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public: a published week's scene file, hash, theme numbers and daily numbers. Drafts need the bearer secret (the renderer uses it). */
export async function GET(req: Request, { params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const rec = await getWeek(week);
  const secret = process.env.CRON_SECRET;
  const isOwner = !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
  if (!rec || (!rec.published && !isOwner && process.env.NODE_ENV === "production")) return NextResponse.json({ error: "not found" }, { status: 404 });
  const daily = rec.daily?.length ? rec.daily : await fetchDaily(week).catch(() => (rec.stats ? [rec.stats] : []));
  const { weekKey, title, scene, sha256, createdAt, genesis, basis } = rec;
  return NextResponse.json({ weekKey, title, scene, sha256, createdAt, genesis: !!genesis, basis: basis ?? null, daily });
}
