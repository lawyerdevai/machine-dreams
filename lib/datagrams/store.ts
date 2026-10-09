import { Redis } from "@upstash/redis";
import type { WeekRecord } from "./types";

/**
 * Weekly Datagram records in Upstash Redis (same env vars as lib/redis.ts).
 * Keys: datagrams:week:<weekKey> for each record; datagrams:weeks sorted set (score = UTC ms of Monday).
 */
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const WEEK_PREFIX = "datagrams:week:";
const WEEK_INDEX = "datagrams:weeks";

function weekKeyOk(weekKey: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(weekKey);
}

function weekScore(weekKey: string): number {
  return Date.parse(`${weekKey}T00:00:00.000Z`);
}

function weekRedisKey(weekKey: string): string {
  return WEEK_PREFIX + weekKey;
}

export async function putWeek(rec: WeekRecord): Promise<void> {
  if (!weekKeyOk(rec.weekKey)) throw new Error("bad weekKey");
  await redis.set(weekRedisKey(rec.weekKey), rec);
  await redis.zadd(WEEK_INDEX, { score: weekScore(rec.weekKey), member: rec.weekKey });
}

export async function getWeek(weekKey: string): Promise<WeekRecord | null> {
  if (!weekKeyOk(weekKey)) return null;
  try {
    const rec = await redis.get<WeekRecord>(weekRedisKey(weekKey));
    return rec ?? null;
  } catch {
    return null;
  }
}

/** Newest first. */
export async function listWeeks(): Promise<WeekRecord[]> {
  try {
    const keys = (await redis.zrange(WEEK_INDEX, 0, -1, { rev: true })) as string[];
    if (!keys.length) return [];
    const rows = await redis.mget<(WeekRecord | null)[]>(
      ...keys.map((k) => weekRedisKey(String(k)))
    );
    const out: WeekRecord[] = [];
    for (const row of rows ?? []) {
      if (row && typeof row === "object" && "weekKey" in row) out.push(row);
    }
    return out;
  } catch {
    return [];
  }
}

export async function latestPublished(): Promise<WeekRecord | null> {
  return (await listWeeks()).find((w) => w.published) ?? null;
}
