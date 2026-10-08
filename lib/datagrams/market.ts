/** Thin client for the public Normies Pixel Market API (no key needed; 60 requests/min per IP, so callers cache). */
const BASE = process.env.NORMIES_API_BASE || "https://api.normies.art";

export type MarketFill = { id: string; listingId: string; buyer: string; seller: string; amount: number; pricePerPixel: string; grossWei: string; feeWei: string; timestamp: string; txHash: string };
export type MarketCandle = { time: number; open: string; high: string; low: string; close: string; volumeWei: string; pixels: number; fills: number };
export type MarketListing = { listingId: string; seller: string; pricePerPixel: string; amount: number; remaining: number; status: string; timestamp: string; updatedTimestamp: string };
export type MarketStats = { bestAskWei: string; lastPriceWei: string; volume24hWei: string; pixels24h: number; activeListings: number; pixelsListed: number; fills: number; volumeWei: string };

export async function get(path: string, params: Record<string, string | number> = {}): Promise<any> {
  const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
  const res = await fetch(`${BASE}${path}${qs ? "?" + qs : ""}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Normies API ${path} -> ${res.status}`);
  return res.json();
}

/** Page through an endpoint that returns { <array>, hasMore }. Works whatever the array's key is called. */
async function pageAll<T>(path: string, params: Record<string, string | number> = {}, cap = 60): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  for (let i = 0; i < cap; i++) {
    const r = await get(path, { ...params, limit: 100, offset });
    const items: T[] = (Object.values(r).find(Array.isArray) as T[]) || [];
    out.push(...items);
    offset += items.length;
    if (!r.hasMore || !items.length) break;
  }
  return out;
}

export const weiToEth = (w: string | number | null | undefined): number => {
  try { return Number(BigInt(w ?? 0)) / 1e18; } catch { return Number(w) / 1e18 || 0; }
};

export const fetchAllFills = () => pageAll<MarketFill>("/market/fills");
export const fetchAllListings = () => pageAll<MarketListing>("/market/listings", { status: "all", sort: "newest" });
export async function fetchCandles(): Promise<MarketCandle[]> {
  const r = await get("/market/candles", { interval: "1d", limit: 60 });
  return r.candles || [];
}
export async function fetchStats(): Promise<MarketStats> { return get("/market/stats"); }
export async function fetchRecentFills(n = 30): Promise<MarketFill[]> {
  const r = await get("/market/fills", { limit: n });
  const items: MarketFill[] = r.fills || [];
  return items.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
}
