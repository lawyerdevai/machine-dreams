// TEMPORARY dev preview. DELETE BEFORE LAUNCH: delete app/datagrams/dev and app/api/datagrams/dev.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DatagramsView from "../DatagramsView";
import "../datagrams.css";
import "./dev-preview.css";

type Stats = { fills: number; volumeEth: number; churn: number; wallets: number; volatility: number };
type Week = { weekKey: string; title: string; scene: string; sha256: string; genesis: boolean; basis: Stats | null };

export default function DevPreview() {
  const [week, setWeek] = useState<Week | null>(null);
  const [days, setDays] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [fillPct, setFillPct] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const tickRef = useRef<number | null>(null);
  const startedRef = useRef(0);
  const finishTimerRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current != null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (finishTimerRef.current != null) {
      window.clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const startProgress = useCallback(() => {
    clearTimers();
    startedRef.current = Date.now();
    setElapsed(0);
    setFillPct(0);
    setFinishing(false);
    tickRef.current = window.setInterval(() => {
      const secs = (Date.now() - startedRef.current) / 1000;
      setElapsed(Math.floor(secs));
      setFillPct(90 * (1 - Math.exp(-secs / 20)));
    }, 250);
  }, [clearTimers]);

  const finishProgress = useCallback(() => {
    clearTimers();
    setFillPct(100);
    setFinishing(true);
    finishTimerRef.current = window.setTimeout(() => {
      setFinishing(false);
      setFillPct(0);
      setElapsed(0);
      finishTimerRef.current = null;
    }, 300);
  }, [clearTimers]);

  const generate = useCallback(async (genesis: boolean) => {
    setLoading(true);
    setError(null);
    startProgress();
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
      finishProgress();
    } catch (e: any) {
      clearTimers();
      setFillPct(0);
      setFinishing(false);
      setElapsed(0);
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [startProgress, finishProgress, clearTimers]);

  const showBar = loading || finishing;
  const statusText =
    elapsed >= 90
      ? "Still working, this one is taking longer than usual (retries happen automatically)"
      : `Generating… ${elapsed}s elapsed (usually 20 to 60 seconds)`;

  return (
    <div>
      <div className="dg-dev-bar">
        <span className="dg-dev-label">Dummy data, not saved</span>
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
      </div>

      {showBar && (
        <div className="dg-dev-progress">
          <div className="dg-dev-progress-track">
            <div className="dg-dev-progress-fill" style={{ width: `${fillPct}%` }} />
          </div>
          <p className="dg-dev-progress-text">{statusText}</p>
        </div>
      )}

      {error && !loading && (
        <p className="dg-dev-error">{error}</p>
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
