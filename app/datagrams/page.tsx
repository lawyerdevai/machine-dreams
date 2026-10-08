import { listWeeks } from "@/lib/datagrams/store";
import { getLive } from "@/lib/datagrams/live";
import { fetchDaily, weekKeyFor } from "@/lib/datagrams/week";
import type { WeekRecord, WeekStats } from "@/lib/datagrams/types";
import DatagramsView from "./DatagramsView";

export const dynamic = "force-dynamic";
export const metadata = { title: "Datagrams", description: "One piece of generative art a week, made from Pixel Market activity and written by Claude." };

const ZERO: WeekStats = { fills: 0, volumeEth: 0, churn: 0, wallets: 0, volatility: 0 };

async function daysFor(rec: WeekRecord): Promise<WeekStats[]> {
  if (rec.daily?.length) return rec.daily;
  const d = await fetchDaily(rec.weekKey).catch(() => [] as WeekStats[]);
  if (d.length) return d;
  return rec.stats ? [rec.stats] : [ZERO];
}
const pick = (w: WeekRecord) => ({ weekKey: w.weekKey, title: w.title, scene: w.scene, sha256: w.sha256, genesis: !!w.genesis, basis: w.basis ?? null });

export default async function DatagramsPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { week: q } = await searchParams;
  const published = (await listWeeks()).filter((w) => w.published);
  const nowKey = weekKeyFor();
  const rec = (q && published.find((w) => w.weekKey === q)) || published.find((w) => w.weekKey === nowKey) || published[0] || null;
  const live = await getLive().catch(() => null); // the page still renders if the market API is down
  const isLive = !!rec && !!live && rec.weekKey === live.weekKey;
  const days = rec ? (isLive ? live!.days : await daysFor(rec)) : [];
  const fb = rec ? published.find((w) => w.weekKey < rec.weekKey) : null;
  const fbDays = fb ? await daysFor(fb) : [];
  return (
    <DatagramsView
      week={rec ? pick(rec) : null}
      days={days}
      isLive={isLive}
      initialLive={live}
      fallback={fb ? { ...pick(fb), final: fbDays[fbDays.length - 1] ?? ZERO, day: fbDays.length || 7 } : null}
      earlier={published.filter((w) => rec && w.weekKey !== rec.weekKey).map((w) => ({ weekKey: w.weekKey, title: w.title }))}
    />
  );
}
