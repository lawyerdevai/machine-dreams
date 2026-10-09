import { redirect } from "next/navigation";
import { listWeeks } from "@/lib/datagrams/store";
import { fetchDaily } from "@/lib/datagrams/week";
import type { WeekRecord, WeekStats } from "@/lib/datagrams/types";
import DatagramsIndex from "./DatagramsIndex";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Datagrams",
  description:
    "One generative artwork a week, made from Pixel Market activity.",
};

const ZERO: WeekStats = { fills: 0, volumeEth: 0, churn: 0, wallets: 0, volatility: 0 };

async function finalStats(rec: WeekRecord): Promise<WeekStats> {
  if (rec.daily?.length) return rec.daily[rec.daily.length - 1]!;
  const d = await fetchDaily(rec.weekKey).catch(() => [] as WeekStats[]);
  if (d.length) return d[d.length - 1]!;
  return rec.stats ?? ZERO;
}

export default async function DatagramsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week: q } = await searchParams;
  if (q && /^\d{4}-\d{2}-\d{2}$/.test(q)) redirect(`/datagrams/${q}`);

  const published = (await listWeeks()).filter((w) => w.published);
  const weeks = await Promise.all(
    published.map(async (w) => ({
      weekKey: w.weekKey,
      title: w.title,
      scene: w.scene,
      sha256: w.sha256,
      final: await finalStats(w),
    }))
  );

  return <DatagramsIndex weeks={weeks} />;
}
