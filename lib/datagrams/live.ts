import { dailyStats, fetchWeekData, weekKeyFor, weekRange } from "./week";
import type { WeekStats } from "./types";

export type Live = {
  weekKey: string; weekStart: number; weekEnd: number; now: number;
  days: WeekStats[];            // cumulative at the end of each day so far; the last one is "right now"
  stats: WeekStats;             // = days[days.length - 1]
};

let cache: { at: number; data: Live } | null = null;
const TTL = 30_000; // the market API allows 60 requests/min per IP, so every visitor shares one fetch per 30 s

export async function getLive(): Promise<Live> {
  if (cache && Date.now() - cache.at < TTL) return { ...cache.data, now: Date.now() };
  const weekKey = weekKeyFor();
  const { from, to } = weekRange(weekKey);
  const raw = await fetchWeekData();
  const days = dailyStats(weekKey, raw.fills, raw.candles, raw.listings);
  const data: Live = {
    weekKey, weekStart: from.getTime(), weekEnd: to.getTime(), now: Date.now(),
    days, stats: days[days.length - 1],
  };
  cache = { at: Date.now(), data };
  return data;
}
