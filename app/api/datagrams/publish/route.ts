import { NextResponse } from "next/server";
import { getWeek, putWeek } from "@/lib/datagrams/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/datagrams/publish?week=YYYY-MM-DD  (Authorization: Bearer CRON_SECRET). Called by the render script once the film rendered cleanly. */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret ? req.headers.get("authorization") !== `Bearer ${secret}` : process.env.NODE_ENV === "production")
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const week = new URL(req.url).searchParams.get("week") || "";
  const rec = await getWeek(week);
  if (!rec) return NextResponse.json({ error: "no such week" }, { status: 404 });
  await putWeek({ ...rec, published: true });
  return NextResponse.json({ ok: true, weekKey: week });
}
