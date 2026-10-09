import { dailyStats, fetchWeekData, weekKeyFor, weekRange } from "./week";
import type { WeekStats } from "./types";

export type Live = {
  weekKey: string; weekStart: number; weekEnd: number; now: number;
  days: WeekStats[];            // cumulative at the end of each day so far; the last one is "right now"
  stats: WeekStats;             // = days[days.length - 1]
};

let cache: { at: number; data: Live } | null = null;
let failUntil = 0;
const TTL = 30_000; // the market API allows 60 requests/min per IP, so every visitor shares one fetch per 30 s
const FAIL_COOLDOWN = 15_000;

const ZERO: WeekStats = { fills: 0, volumeEth: 0, churn: 0, wallets: 0, volatility: 0 };

/** Same shape the page uses when the market API is down (zeros for the current week). */
function unavailableLive(now = Date.now()): Live {
  const weekKey = weekKeyFor(new Date(now));
  const { from, to } = weekRange(weekKey);
  return {
    weekKey,
    weekStart: from.getTime(),
    weekEnd: to.getTime(),
    now,
    days: [ZERO],
    stats: ZERO,
  };
}

export async function getLive(): Promise<Live> {
  const now = Date.now();
  if (cache && now - cache.at < TTL) return { ...cache.data, now };
  if (now < failUntil) {
    return cache ? { ...cache.data, now } : unavailableLive(now);
  }

  try {
    const weekKey = weekKeyFor();
    const { from, to } = weekRange(weekKey);
    const raw = await fetchWeekData();
    const days = dailyStats(weekKey, raw.fills, raw.candles, raw.listings);
    const data: Live = {
      weekKey, weekStart: from.getTime(), weekEnd: to.getTime(), now,
      days, stats: days[days.length - 1] ?? ZERO,
    };
    cache = { at: now, data };
    return data;
  } catch {
    failUntil = now + FAIL_COOLDOWN;
    return cache ? { ...cache.data, now } : unavailableLive(now);
  }
}
