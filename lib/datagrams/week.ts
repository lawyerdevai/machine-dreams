import type { WeekStats } from "./types";
import { fetchAllFills, fetchAllListings, fetchCandles, weiToEth, type MarketCandle, type MarketFill, type MarketListing } from "./market";

export const LAUNCH_WEEK = "2026-10-05"; // Pixel Market launched Monday 2026-10-05; no data exists before it
const DAY = 86400000;

/** Monday 00:00 UTC of the week containing `d`, as "YYYY-MM-DD". */
export function weekKeyFor(d: Date = new Date()): string {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}
export function addDays(key: string, n: number): string {
  return new Date(new Date(key + "T00:00:00Z").getTime() + n * DAY).toISOString().slice(0, 10);
}
export function weekRange(weekKey: string): { from: Date; to: Date } {
  const from = new Date(weekKey + "T00:00:00Z");
  return { from, to: new Date(from.getTime() + 7 * DAY) };
}
/** The seed for a week is derived from its scene hash, so the page and the MP4 renderer always agree. */
export function seedFromHash(sha256: string): number {
  return parseInt(sha256.slice(0, 8), 16) >>> 0;
}

/** Plausible fake numbers for ?mock=1. Wallets can never exceed twice the fills, like the real thing. */
export function mockStats(): WeekStats {
  const r = Math.random;
  const scale = r() < 0.3 ? 8 : 1;
  const fills = Math.round((20 + r() * 220) * scale);
  return {
    fills,
    volumeEth: +((0.5 + r() * 9) * scale).toFixed(3),
    churn: Math.round((8 + r() * 80) * scale),
    wallets: Math.max(2, Math.round(fills * (0.12 + r() * 0.35))),
    volatility: +(0.05 + r() * 0.9).toFixed(3),
  };
}

/**
 * The five numbers for the week, CUMULATIVE from Monday 00:00 UTC up to `untilMs` (default: the end of the week).
 *   fills       number of fills            volumeEth  sum of grossWei (price x pixels, before the fee), in ETH
 *   wallets     unique buyers + sellers     churn      listings opened + listings cancelled
 *   volatility  (highest high - lowest low) / average close across the daily candles so far, clamped 0..1
 */
export function computeStats(weekKey: string, fills: MarketFill[], candles: MarketCandle[], listings: MarketListing[], untilMs?: number): WeekStats {
  const { from, to } = weekRange(weekKey);
  const a = from.getTime() / 1000, b = Math.min(to.getTime(), untilMs ?? to.getTime()) / 1000;
  const inRange = (t: number) => t >= a && t < b;

  const wf = fills.filter((f) => inRange(Number(f.timestamp)));
  const wallets = new Set<string>();
  let volume = 0;
  for (const f of wf) { volume += weiToEth(f.grossWei); wallets.add(f.buyer.toLowerCase()); wallets.add(f.seller.toLowerCase()); }

  const wc = candles.filter((c) => inRange(c.time));
  const highs = wc.map((c) => Number(c.high)), lows = wc.map((c) => Number(c.low));
  const avg = wc.length ? wc.reduce((s, c) => s + Number(c.close), 0) / wc.length : 0;
  const vol = wc.length && avg > 0 ? (Math.max(...highs) - Math.min(...lows)) / avg : 0;

  const churn = listings.filter((l) => inRange(Number(l.timestamp)) || (l.status === "cancelled" && inRange(Number(l.updatedTimestamp)))).length;
  return { fills: wf.length, volumeEth: +volume.toFixed(4), churn, wallets: wallets.size, volatility: +Math.min(1, Math.max(0, vol)).toFixed(3) };
}

/** Cumulative numbers at the end of each day so far (day 1..7). The last element of an unfinished week is "right now". */
export function dailyStats(weekKey: string, fills: MarketFill[], candles: MarketCandle[], listings: MarketListing[], nowMs: number = Date.now()): WeekStats[] {
  const start = weekRange(weekKey).from.getTime();
  const elapsed = Math.max(1, Math.min(7, Math.floor((nowMs - start) / DAY) + 1));
  const out: WeekStats[] = [];
  for (let d = 1; d <= elapsed; d++) out.push(computeStats(weekKey, fills, candles, listings, Math.min(start + d * DAY, nowMs)));
  return out;
}

export async function fetchWeekData() {
  const [fills, candles, listings] = await Promise.all([fetchAllFills(), fetchCandles(), fetchAllListings()]);
  return { fills, candles, listings };
}
/** A finished (or current) week's final numbers. */
export async function fetchWeekStats(weekKey: string): Promise<WeekStats> {
  const d = await fetchWeekData();
  return computeStats(weekKey, d.fills, d.candles, d.listings);
}
export async function fetchDaily(weekKey: string): Promise<WeekStats[]> {
  const d = await fetchWeekData();
  return dailyStats(weekKey, d.fills, d.candles, d.listings);
}
