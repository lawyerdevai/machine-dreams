import { notFound } from "next/navigation";
import { listWeeks, getWeek } from "@/lib/datagrams/store";
import { getLive } from "@/lib/datagrams/live";
import { fetchDaily } from "@/lib/datagrams/week";
import type { WeekRecord, WeekStats } from "@/lib/datagrams/types";
import DatagramsView from "../DatagramsView";

export const dynamic = "force-dynamic";

const ZERO: WeekStats = { fills: 0, volumeEth: 0, churn: 0, wallets: 0, volatility: 0 };

async function daysFor(rec: WeekRecord): Promise<WeekStats[]> {
  if (rec.daily?.length) return rec.daily;
  const d = await fetchDaily(rec.weekKey).catch(() => [] as WeekStats[]);
  if (d.length) return d;
  return rec.stats ? [rec.stats] : [ZERO];
}

const pick = (w: WeekRecord) => ({
  weekKey: w.weekKey,
  title: w.title,
  scene: w.scene,
  sha256: w.sha256,
  genesis: !!w.genesis,
  basis: w.basis ?? null,
});

export async function generateMetadata({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  const rec = await getWeek(week);
  if (!rec?.published) return { title: "Datagrams" };
  return {
    title: `${rec.title} · Datagrams`,
    description: `Week of ${week}: generative art from Pixel Market activity.`,
  };
}

export default async function DatagramWeekPage({ params }: { params: Promise<{ week: string }> }) {
  const { week } = await params;
  // Reject non-date keys (e.g. "about") — static routes like /datagrams/about take priority,
  // but this guard keeps getWeek from ever treating a slug as a weekKey.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) notFound();

  const rec = await getWeek(week);
  if (!rec?.published) notFound();

  const published = (await listWeeks()).filter((w) => w.published);
  const live = await getLive().catch(() => null);
  const isLive = !!live && rec.weekKey === live.weekKey;
  const days = isLive ? live!.days : await daysFor(rec);
  const fb = published.find((w) => w.weekKey < rec.weekKey) ?? null;
  const fbDays = fb ? await daysFor(fb) : [];

  return (
    <DatagramsView
      week={pick(rec)}
      days={days}
      isLive={isLive}
      initialLive={live}
      fallback={fb ? { ...pick(fb), final: fbDays[fbDays.length - 1] ?? ZERO, day: fbDays.length || 7 } : null}
      earlier={published.filter((w) => w.weekKey !== rec.weekKey).map((w) => ({ weekKey: w.weekKey, title: w.title }))}
    />
  );
}
