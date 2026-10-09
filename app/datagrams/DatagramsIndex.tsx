import Link from "next/link";
import type { WeekStats } from "@/lib/datagrams/types";
import { weekNumber } from "@/lib/datagrams/week";
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

const THUMB_LIMIT = 12;

export default function DatagramsIndex({ weeks }: { weeks: IndexCard[] }) {
  return (
    <div className="dg dg-index">
      <h1 className="dg-sr-only">Datagrams</h1>

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
                  <div className="dg-eyebrow">
                    Week {weekNumber(w.weekKey)} · {fmtDay(w.weekKey)}
                  </div>
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
