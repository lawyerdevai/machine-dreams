import { fetchRecentFills, fetchStats, weiToEth } from "./market";
import { dailyStats, fetchWeekData, weekKeyFor, weekRange } from "./week";
import type { WeekStats } from "./types";

export type LiveFill = { id: string; buyer: string; seller: string; pixels: number; priceEth: number; totalEth: number; ts: number; tx: string };
export type Live = {
  weekKey: string; weekStart: number; weekEnd: number; now: number;
  days: WeekStats[];            // cumulative at the end of each day so far; the last one is "right now"
  stats: WeekStats;             // = days[days.length - 1]
  fills: LiveFill[];            // newest first
};

let cache: { at: number; data: Live } | null = null;
const TTL = 30_000; // the market API allows 60 requests/min per IP, so every visitor shares one fetch per 30 s

export async function getLive(): Promise<Live> {
  if (cache && Date.now() - cache.at < TTL) return { ...cache.data, now: Date.now() };
  const weekKey = weekKeyFor();
  const { from, to } = weekRange(weekKey);
  const [raw, recent] = await Promise.all([fetchWeekData(), fetchRecentFills(100)]);
  const days = dailyStats(weekKey, raw.fills, raw.candles, raw.listings);
  const data: Live = {
    weekKey, weekStart: from.getTime(), weekEnd: to.getTime(), now: Date.now(),
    days, stats: days[days.length - 1],
    fills: recent.map((f) => ({
      id: f.id, buyer: f.buyer, seller: f.seller, pixels: f.amount,
      priceEth: weiToEth(f.pricePerPixel), totalEth: weiToEth(f.grossWei), ts: Number(f.timestamp) * 1000, tx: f.txHash,
    })),
  };
  cache = { at: Date.now(), data };
  return data;
}
void fetchStats; // kept exported from market.ts for later use
