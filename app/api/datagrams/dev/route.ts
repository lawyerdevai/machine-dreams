// TEMPORARY dev preview. DELETE BEFORE LAUNCH: delete app/datagrams/dev and app/api/datagrams/dev.
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { addDays, weekNumber } from "@/lib/datagrams/week";
import { userPrompt } from "@/lib/datagrams/prompt";
import { writeScene } from "@/lib/datagrams/claude";
import type { WeekStats } from "@/lib/datagrams/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const CURVE = [0.08, 0.2, 0.38, 0.55, 0.72, 0.88, 1];

function inventBasis(): WeekStats {
  const r = Math.random;
  const fills = Math.round(10 ** (1.3 + r() * 2.4));
  return {
    fills,
    volumeEth: +(fills * (0.05 + r() * 0.15)).toFixed(4),
    churn: Math.round(fills * (0.4 + r() * 1.5)),
    wallets: Math.round(fills * (0.4 + r() * 0.5)),
    volatility: +(r() * 0.9).toFixed(3),
  };
}

/** 7 cumulative days; non-decreasing. Volatility rises ~50%→100% of final. */
function inventDays(basis: WeekStats | null): WeekStats[] {
  const r = Math.random;
  const scale = 0.5 + r() * 1.3;
  const ref = basis ?? inventBasis();
  const final: WeekStats = {
    fills: Math.max(1, Math.round(ref.fills * scale)),
    volumeEth: +(Math.max(0.001, ref.volumeEth * scale)).toFixed(4),
    churn: Math.max(1, Math.round(ref.churn * scale)),
    wallets: Math.max(1, Math.round(ref.wallets * scale)),
    volatility: +(Math.min(1, Math.max(0.01, ref.volatility * (0.7 + r() * 0.6)))).toFixed(3),
  };

  const days: WeekStats[] = [];
  for (let i = 0; i < 7; i++) {
    const t = CURVE[i]!;
    const jitter = () => 1 + (r() - 0.5) * 0.06;
    const volFrac = 0.5 + 0.5 * t; // ~50% → 100% of final volatility
    let fills = Math.max(0, Math.round(final.fills * t * jitter()));
    let volumeEth = +Math.max(0, final.volumeEth * t * jitter()).toFixed(4);
    let churn = Math.max(0, Math.round(final.churn * t * jitter()));
    let wallets = Math.max(0, Math.round(final.wallets * t * jitter()));
    let volatility = +Math.min(1, Math.max(0, final.volatility * volFrac * jitter())).toFixed(3);

    if (i > 0) {
      const prev = days[i - 1]!;
      fills = Math.max(fills, prev.fills);
      volumeEth = Math.max(volumeEth, prev.volumeEth);
      churn = Math.max(churn, prev.churn);
      wallets = Math.max(wallets, prev.wallets);
      volatility = Math.max(volatility, prev.volatility);
    }
    if (i === 6) {
      fills = Math.max(fills, final.fills);
      volumeEth = Math.max(volumeEth, final.volumeEth);
      churn = Math.max(churn, final.churn);
      wallets = Math.max(wallets, final.wallets);
      volatility = Math.max(volatility, final.volatility);
    }
    days.push({ fills, volumeEth, churn, wallets, volatility });
  }
  return days;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  let genesis = false;
  try {
    const body = await req.json().catch(() => ({}));
    genesis = !!body?.genesis;
  } catch {
    /* empty body ok */
  }

  try {
    const weekKey = addDays("2026-10-12", 7 * Math.floor(Math.random() * 41));
    const basis = genesis ? null : inventBasis();
    const days = inventDays(basis);
    // No store reads/writes — empty history so this never touches Redis.
    const w = await writeScene(userPrompt(weekKey, basis, []));
    const sha256 = createHash("sha256").update(w.scene).digest("hex");
    return NextResponse.json({
      week: {
        weekKey,
        title: w.title,
        scene: w.scene,
        sha256,
        genesis,
        basis,
      },
      days,
      weekNumber: weekNumber(weekKey),
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 502 });
  }
}
