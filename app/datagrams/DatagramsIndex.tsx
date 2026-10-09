import Link from "next/link";
import type { WeekStats } from "@/lib/datagrams/types";
import DatagramThumb from "./DatagramThumb";
import "./datagrams.css";

export type IndexCard = {
  weekKey: string;
  title: string;
  scene: string;
  sha256: string;
  final: WeekStats;
};

const fmtDay = (key: string) =>
  new Date(key + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

const INTRO =
  "Data as Medium. A growing series by Spoliticus, built on a simple belief: data isn't just information, it's material. Every dataset carries a shape worth seeing. Each week, Claude writes one artwork from the Pixel Market's activity, and it plays out day by day as the week unfolds.";

const THUMB_LIMIT = 12;

export default function DatagramsIndex({ weeks }: { weeks: IndexCard[] }) {
  return (
    <div className="dg dg-index">
      <header className="dg-index-head">
        <h1 className="dg-title">Datagrams</h1>
        <p className="dg-body dg-index-intro">{INTRO}</p>
      </header>

      {weeks.length === 0 ? (
        <p className="dg-body" style={{ color: "var(--quiet)" }}>
          No published weeks yet.
        </p>
      ) : (
        <ul className="dg-grid">
          {weeks.map((w, i) => (
            <li key={w.weekKey} className="dg-card">
              <Link href={`/datagrams/${w.weekKey}`} className="dg-card-link">
                <div className="dg-card-thumb">
                  {i < THUMB_LIMIT ? (
                    <DatagramThumb
                      scene={w.scene}
                      sha256={w.sha256}
                      stats={w.final}
                      title={w.title}
                    />
                  ) : (
                    <div className="dg-thumb-fallback" aria-hidden="true" />
                  )}
                </div>
                <div className="dg-card-meta">
                  <div className="dg-eyebrow">Week of {fmtDay(w.weekKey)}</div>
                  <h2 className="dg-card-title">{w.title}</h2>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
