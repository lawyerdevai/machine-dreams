import { promises as fs } from "fs";
import path from "path";
import type { WeekRecord } from "./types";

/**
 * Storage for weekly records. The default implementation writes JSON files under ./data/datagrams, which works
 * locally and on any server with a disk, but NOT on Vercel (read-only, ephemeral filesystem).
 *
 * TODO(cursor): before deploying, re-implement these four functions with whatever persistence this repo already
 * uses for artwork records (Postgres/Prisma/Supabase/KV/Blob). Keep the signatures exactly as they are.
 */
const DIR = path.join(process.cwd(), "data", "datagrams");

async function ensure() { await fs.mkdir(DIR, { recursive: true }); }

export async function putWeek(rec: WeekRecord): Promise<void> {
  await ensure();
  await fs.writeFile(path.join(DIR, rec.weekKey + ".json"), JSON.stringify(rec, null, 2));
}
export async function getWeek(weekKey: string): Promise<WeekRecord | null> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) return null;
  try { return JSON.parse(await fs.readFile(path.join(DIR, weekKey + ".json"), "utf8")); } catch { return null; }
}
/** Newest first. */
export async function listWeeks(): Promise<WeekRecord[]> {
  await ensure();
  const names = (await fs.readdir(DIR)).filter((n) => n.endsWith(".json")).sort().reverse();
  const out: WeekRecord[] = [];
  for (const n of names) { try { out.push(JSON.parse(await fs.readFile(path.join(DIR, n), "utf8"))); } catch {} }
  return out;
}
export async function latestPublished(): Promise<WeekRecord | null> {
  return (await listWeeks()).find((w) => w.published) ?? null;
}
