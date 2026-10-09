// TEMPORARY dev preview. DELETE BEFORE LAUNCH: delete app/datagrams/dev and app/api/datagrams/dev.
"use client";

import { useCallback, useState } from "react";
import DatagramsView from "../DatagramsView";
import "../datagrams.css";

type Stats = { fills: number; volumeEth: number; churn: number; wallets: number; volatility: number };
type Week = { weekKey: string; title: string; scene: string; sha256: string; genesis: boolean; basis: Stats | null };

export default function DevPreview() {
  const [week, setWeek] = useState<Week | null>(null);
  const [days, setDays] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (genesis: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/datagrams/dev", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ genesis }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
      setWeek(data.week);
      setDays(data.days);
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          padding: "12px 24px",
          borderBottom: "1px solid #e5e5e5",
          fontSize: "0.8125rem",
          background: "#fff",
        }}
      >
        <span style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: "#999" }}>
          Dummy data, not saved
        </span>
        <button
          type="button"
          className="btn-nav"
          disabled={loading}
          onClick={() => generate(false)}
        >
          New dummy week
        </button>
        <button
          type="button"
          className="btn-nav"
          disabled={loading}
          onClick={() => generate(true)}
        >
          Week one (no data)
        </button>
        {loading && (
          <span style={{ color: "#666" }}>Generating, about 20 to 60 seconds</span>
        )}
      </div>

      {error && (
        <p style={{ padding: "16px 24px", color: "#a00", whiteSpace: "pre-wrap" }}>{error}</p>
      )}

      {week && (
        <DatagramsView
          key={week.sha256}
          week={week}
          days={days}
          isLive={false}
          initialLive={null}
          fallback={null}
          earlier={[]}
        />
      )}
    </div>
  );
}
