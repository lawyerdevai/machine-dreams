"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import "./datagrams.css";

type Stats = { fills: number; volumeEth: number; churn: number; wallets: number; volatility: number };
type Week = { weekKey: string; title: string; scene: string; sha256: string; genesis: boolean; basis: Stats | null };
type Fallback = Week & { final: Stats; day: number };
type Meta = { title: string; mood: string; note: string; notes: { k: string; v: string }[] };
type Live = { weekKey: string; weekStart: number; weekEnd: number; now: number; days: Stats[]; stats: Stats };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const seedFromHash = (h: string) => parseInt(h.slice(0, 8), 16) >>> 0;
const eth = (n: number) => (n === 0 ? "0" : n < 0.01 ? n.toFixed(4) : n < 10 ? n.toFixed(2) : n.toFixed(1));
const cap = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);
const fmtDay = (key: string) => new Date(key + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

/* The same eight rows every week. `test` finds Claude's sentence for the row; `fallback` is used if Claude left it out. */
const ROWS: { key: string; name: string; what: string; test: RegExp; fallback: string }[] = [
  { key: "fills", name: "Fills", what: "trades completed", test: /fill|trade|sale/i, fallback: "Sets how much is happening in the picture." },
  { key: "volume", name: "Volume", what: "ETH traded", test: /volume|eth/i, fallback: "Sets how saturated the colours are." },
  { key: "churn", name: "Churn", what: "listings opened or cancelled", test: /churn|listing/i, fallback: "Sets how restless the picture is." },
  { key: "wallets", name: "Wallets", what: "distinct buyers and sellers", test: /wallet|trader|buyer/i, fallback: "Sets how many separate things share the picture." },
  { key: "volatility", name: "Volatility", what: "how widely the price swung", test: /volatil|swing/i, fallback: "Sets how far the colours spread." },
  { key: "day", name: "Day", what: "how far through the week", test: /schedule|^day/i, fallback: "Reveals more of the picture as the week goes on." },
  { key: "colour", name: "Colour", what: "", test: /^colou?r$/i, fallback: "" },
  { key: "glitch", name: "Glitch", what: "", test: /^glitch$/i, fallback: "" },
];

export default function DatagramsView({ week, days: initialDays, isLive, initialLive, fallback, earlier }: { week: Week | null; days: Stats[]; isLive: boolean; initialLive: Live | null; fallback: Fallback | null; earlier: { weekKey: string; title: string }[] }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const [shown, setShown] = useState<Week | null>(week);        // switches to the fallback if a scene fails to play
  const [live, setLive] = useState<Live | null>(initialLive);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [liveMode, setLiveMode] = useState(isLive);             // true = follow "today"; false = a past day was clicked
  const [picked, setPicked] = useState(Math.max(0, initialDays.length - 1));

  const days: Stats[] = isLive && live ? live.days : initialDays;
  const sel = liveMode ? days.length - 1 : Math.min(picked, days.length - 1);
  const atLive = isLive && sel === days.length - 1;
  const usingFallback = shown !== week;
  const stats: Stats = usingFallback && fallback ? fallback.final : days[sel] ?? { fills: 0, volumeEth: 0, churn: 0, wallets: 0, volatility: 0 };
  const dayNo = usingFallback && fallback ? fallback.day : sel + 1;
  const progress = atLive && live ? Math.min(1, Math.max(0, (Date.now() - live.weekStart) / (live.weekEnd - live.weekStart))) : dayNo / 7;
  const payload = useMemo(() => ({ ...stats, day: dayNo, progress: +progress.toFixed(3) }), [stats.fills, stats.volumeEth, stats.churn, stats.wallets, stats.volatility, dayNo, Math.round(progress * 200)]); // eslint-disable-line react-hooks/exhaustive-deps
  const latest = useRef(payload); latest.current = payload;

  /* the art: a sandboxed player we talk to by message. First a full load, then only new numbers. */
  useEffect(() => {
    if (!shown) return;
    ready.current = false;
    const send = () => { frame.current?.contentWindow?.postMessage({ type: "load", scene: shown.scene, stats: latest.current, seed: seedFromHash(shown.sha256), id: shown.sha256 }, "*"); };
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      const d = e.data;
      if (d?.type === "hello") { send(); ready.current = true; }
      else if (d?.type === "meta") setMeta(d as Meta);
      else if (d?.type === "error" && fallback && shown === week) { setShown(fallback); }
    };
    window.addEventListener("message", onMsg);
    send(); ready.current = true;
    const t = window.setTimeout(send, 800);
    return () => { window.removeEventListener("message", onMsg); window.clearTimeout(t); };
  }, [shown]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shown || !ready.current) return;
    frame.current?.contentWindow?.postMessage({ type: "stats", stats: payload, seed: seedFromHash(shown.sha256), id: shown.sha256 }, "*");
  }, [payload, shown]);

  /* the market: ask our own server every 30 s */
  useEffect(() => {
    if (!isLive) return;
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/datagrams/live", { cache: "no-store" });
        if (!r.ok) return;
        const d: Live = await r.json();
        if (alive) setLive(d);
      } catch {}
    };
    const a = window.setInterval(pull, 30000);
    pull();
    return () => { alive = false; window.clearInterval(a); };
  }, [isLive]);

  const title = usingFallback && fallback ? fallback.title : shown?.title ?? "";
  const notes = (meta?.notes ?? []).map((n) => { const [name, ...rest] = n.k.split(" · "); return { name: name.trim(), val: rest.join(" · ").trim(), v: n.v }; });
  const theme = notes.find((n) => /theme|world/i.test(n.name));
  const themeText = theme ? [theme.val && !/^none$/i.test(theme.val) ? theme.val : "", theme.v].filter(Boolean).join(" — ") : "";
  const values: Record<string, string> = {
    fills: String(stats.fills), volume: eth(stats.volumeEth), churn: String(stats.churn), wallets: String(stats.wallets),
    volatility: stats.volatility.toFixed(2), day: `${dayNo} of 7`, colour: "", glitch: "",
  };
  const rows = ROWS.map((r) => {
    const n = notes.find((x) => x.name !== theme?.name && r.test.test(x.name));
    return { ...r, value: values[r.key], text: cap(n?.v || r.fallback) };
  });

  return (
    <div className="dg">
      <div className="dg-art">
        <div className="dg-mat">
          <div className="dg-well">
            {shown ? (
              /* sandbox without allow-same-origin: scene code runs isolated and can reach nothing on this site */
              <iframe ref={frame} src="/datagrams/player.html" sandbox="allow-scripts" title={`Datagram ${title}`} />
            ) : (
              <div className="dg-empty">No scene yet.</div>
            )}
          </div>
        </div>
        {shown && (
          <nav className="dg-days" aria-label="Days of the week">
            {DAYS.map((d, i) => {
              const exists = i < days.length;
              const on = exists && i === sel && !usingFallback;
              return (
                <button key={d} type="button" disabled={!exists} aria-pressed={on} className={"dg-day" + (on ? " is-on" : "")}
                  onClick={() => { if (isLive && i === days.length - 1) setLiveMode(true); else { setLiveMode(false); setPicked(i); } }}>
                  {d}{isLive && i === days.length - 1 && <i className="dg-livedot" title="Today, live" />}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className="dg-side">
        {shown ? (
          <>
            <header className="dg-plate">
              <div className="dg-eyebrow">Week of {fmtDay(shown.weekKey)}</div>
              <h1 className="dg-title">{title}</h1>
              {meta?.note && <p className="dg-body">{meta.note}</p>}
              {themeText && (
                <p className="dg-body dg-theme">
                  <span className="dg-eyebrow">{shown.genesis ? "Why this world" : "Why this world · from last week"}</span>
                  {themeText}
                </p>
              )}
            </header>

            <section className="dg-data" aria-label="What each number does">
              <div className="dg-eyebrow dg-status">Day {dayNo} of 7{atLive ? " · live" : ""}</div>
              <div className="dg-rows">
                {rows.map((r) => (
                  <div className="dg-row" key={r.key}>
                    <div className="dg-rk">
                      <span className="dg-name">{r.name}</span>
                      {r.value ? <b>{r.value}</b> : null}
                    </div>
                    <div className="dg-rt">
                      {r.what ? <span className="dg-what">{r.what}</span> : null}
                      {r.text ? <p>{r.text}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {earlier.length > 0 && (
              <footer className="dg-foot">
                Earlier weeks: {earlier.map((w, i) => (<span key={w.weekKey}>{i ? ", " : ""}<a href={`/datagrams?week=${w.weekKey}`}>{fmtDay(w.weekKey)}</a></span>))}
              </footer>
            )}
          </>
        ) : (
          <header className="dg-plate">
            <div className="dg-eyebrow">Datagrams</div>
            <h1 className="dg-title">Not started</h1>
            <p className="dg-body">The first scene is written at the start of the first week and fills in as the market moves.</p>
          </header>
        )}
      </div>
    </div>
  );
}
