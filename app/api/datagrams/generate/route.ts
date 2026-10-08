import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { addDays, fetchDaily, fetchWeekStats, LAUNCH_WEEK, mockStats, weekKeyFor } from "@/lib/datagrams/week";
import { userPrompt } from "@/lib/datagrams/prompt";
import { writeScene } from "@/lib/datagrams/claude";
import { getWeek, listWeeks, putWeek } from "@/lib/datagrams/store";
import type { WeekRecord } from "@/lib/datagrams/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // open only in local dev
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Runs at the START of each week (cron: Monday 00:10 UTC). It does two things:
 *   1. closes the week that just ended: stores its final daily numbers
 *   2. writes THIS week's scene from the week that just ended (its totals are the theme).
 *      The launch week has no previous week, so it is written "dataless".
 *
 *   GET/POST /api/datagrams/generate               -> the current week
 *   ...?week=2026-10-05                            -> a specific week (Monday, UTC)
 *   ...?mock=1                                     -> fake last-week numbers instead of the market API
 *   ...?dry=1                                      -> return the scene, store nothing (use to try ~10 fake weeks)
 *   ...?force=1                                    -> overwrite a week that already has a scene
 */
async function handle(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const weekKey = url.searchParams.get("week") || weekKeyFor();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) return NextResponse.json({ error: "bad week" }, { status: 400 });
  const dry = url.searchParams.has("dry");
  const mock = url.searchParams.has("mock");
  const prevKey = addDays(weekKey, -7);
  const genesis = weekKey <= LAUNCH_WEEK;

  if (!dry && !url.searchParams.has("force") && (await getWeek(weekKey))) {
    return NextResponse.json({ ok: true, skipped: "this week already has a scene" });
  }
  try {
    // 1. close the previous week (real data only)
    let closed: string | null = null;
    const prev = !dry && !mock && !genesis ? await getWeek(prevKey) : null;
    if (prev && !prev.daily?.length) {
      await putWeek({ ...prev, daily: await fetchDaily(prevKey) });
      closed = prevKey;
    }
    // 2. last week's totals are this week's theme
    const basis = genesis ? null : mock ? mockStats() : await fetchWeekStats(prevKey);
    const history = await listWeeks();
    const w = await writeScene(userPrompt(weekKey, basis, history));
    const rec: WeekRecord = {
      weekKey, scene: w.scene, title: w.title, model: w.model, genesis, basis,
      sha256: createHash("sha256").update(w.scene).digest("hex"),
      createdAt: new Date().toISOString(),
      published: process.env.DATAGRAMS_AUTOPUBLISH === "1",
    };
    if (dry) return NextResponse.json({ ok: true, dry: true, ...rec });
    await putWeek(rec);
    return NextResponse.json({ ok: true, weekKey, title: rec.title, genesis, sha256: rec.sha256, published: rec.published, attempts: w.attempts, closedPreviousWeek: closed });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 502 });
  }
}
export const GET = handle;
export const POST = handle;
