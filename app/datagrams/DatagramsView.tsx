"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import "./datagrams.css";

type Stats = { fills: number; volumeEth: number; churn: number; wallets: number; volatility: number };
type Week = { weekKey: string; title: string; scene: string; sha256: string; genesis: boolean; basis: Stats | null };
type Fallback = Week & { final: Stats; day: number };
type Meta = { title: string; mood: string; note: string; notes: { k: string; v: string }[] };
type LiveFill = { id: string; buyer: string; seller: string; pixels: number; priceEth: number; totalEth: number; ts: number; tx: string };
type Live = { weekKey: string; weekStart: number; weekEnd: number; now: number; days: Stats[]; stats: Stats; fills: LiveFill[] };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const seedFromHash = (h: string) => parseInt(h.slice(0, 8), 16) >>> 0;
const eth = (n: number) => (n === 0 ? "0" : n < 0.01 ? n.toFixed(4) : n < 10 ? n.toFixed(3) : n.toFixed(2));
const ago = (ms: number, now: number) => {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return s + "s ago";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
};
const fmtDay = (key: string) => new Date(key + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
/* order the "how it's made" rows: the world first, then the schedule, then the numbers, then the engine's texture rows */
const rank = (name: string) => (/theme|world/i.test(name) ? 0 : /schedule/i.test(name) ? 1 : /^(colour|color|glitch)$/i.test(name) ? 3 : 2);

export default function DatagramsView({ week, days: initialDays, isLive, initialLive, fallback, earlier }: { week: Week | null; days: Stats[]; isLive: boolean; initialLive: Live | null; fallback: Fallback | null; earlier: { weekKey: string; title: string }[] }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const ready = useRef(false);
  const [shown, setShown] = useState<Week | null>(week);        // switches to the fallback if a scene fails to play
  const [live, setLive] = useState<Live | null>(initialLive);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [liveMode, setLiveMode] = useState(isLive);             // true = follow "today"; false = a past day was clicked
  const [picked, setPicked] = useState(Math.max(0, initialDays.length - 1));
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [now, setNow] = useState<number>(initialLive?.now ?? 0); // time-dependent text waits for the browser so server and client markup match
  const prev = useRef<Live | null>(initialLive);

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

  /* the market: ask our own server every 30 s; tick the "x ago" labels every 15 s */
  useEffect(() => {
    if (!isLive) return;
    let alive = true;
    const pull = async () => {
      try {
        const r = await fetch("/api/datagrams/live", { cache: "no-store" });
        if (!r.ok) return;
        const d: Live = await r.json();
        if (!alive) return;
        const p = prev.current;
        if (p) {
          const known = new Set(p.fills.map((x) => x.id));
          setFresh(new Set(d.fills.filter((x) => !known.has(x.id)).map((x) => x.id)));
          window.setTimeout(() => setFresh(new Set()), 2000);
        }
        prev.current = d; setLive(d);
      } catch {}
    };
    const a = window.setInterval(pull, 30000), b = window.setInterval(() => setNow(Date.now()), 15000);
    setNow(Date.now()); pull();
    return () => { alive = false; window.clearInterval(a); window.clearInterval(b); };
  }, [isLive]);

  const title = usingFallback && fallback ? fallback.title : shown?.title ?? "";
  const eyebrow = !shown ? "" : shown.genesis ? "Week one · written from no data" : `Week of ${fmtDay(shown.weekKey)} · theme from the week before`;
  const rows = (meta?.notes ?? []).map((n, i) => { const [name, val] = n.k.split(" · "); return { i, name, val, v: n.v }; }).sort((a, b) => rank(a.name) - rank(b.name) || a.i - b.i);
  const lede = shown?.genesis
    ? "The world starts empty. Each line below is one number and what it does to the picture. They update as the week happens."
    : "Last week chose the world. Each line below is one of this week's numbers and what it does to the picture. They update as the week happens."

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
        <header className="dg-plate">
          {shown ? (
            <>
              <div className="dg-eyebrow">Claude · {eyebrow}</div>
              <h1 className="dg-title">{title}</h1>
              {meta?.note && <p className="dg-body">{meta.note}</p>}
              <div className="dg-eyebrow dg-status">Day {dayNo} of 7{atLive ? " · live" : ""}</div>
            </>
          ) : (
            <>
              <div className="dg-eyebrow">Claude · Datagrams</div>
              <h1 className="dg-title">Not started</h1>
              <p className="dg-body">The first scene is written at the start of the first week and fills in as the market moves.</p>
            </>
          )}
        </header>

        {isLive && live && (
          <section className="dg-fillbox" aria-label="Pixel Market fills">
            <div className="dg-fillhead">
              <span className="dg-eyebrow">Fills this week</span>
              <span className="dg-eyebrow">latest {Math.min(live.fills.length, live.stats.fills)} of {live.stats.fills}</span>
            </div>
            <ul className="dg-fills" tabIndex={0}>
              {live.fills.map((f) => (
                <li key={f.id} className={fresh.has(f.id) ? "is-new" : ""}>
                  <a href={`https://etherscan.io/tx/${f.tx}`} target="_blank" rel="noreferrer">
                    <span className="dg-fpx"><b>{f.pixels}</b> px</span>
                    <span className="dg-feth">{eth(f.totalEth)} ETH</span>
                    <span className="dg-fago">{ago(f.ts, now)}</span>
                  </a>
                </li>
              ))}
              {!live.fills.length && <li className="dg-none">No fills yet.</li>}
            </ul>
          </section>
        )}

        {shown && (
          <footer className="dg-foot">
            Scene file · sha-256 {shown.sha256.slice(0, 12)}… <a href={`/api/datagrams/week/${shown.weekKey}`}>open</a>
            {earlier.length > 0 && <> · Earlier weeks: {earlier.map((w, i) => (<span key={w.weekKey}>{i ? ", " : ""}<a href={`/datagrams?week=${w.weekKey}`}>{fmtDay(w.weekKey)}</a></span>))}</>}
          </footer>
        )}
      </div>

      {shown && rows.length > 0 && (
        <section className="dg-how" aria-label="How it is made">
          <div className="dg-eyebrow">How it's made</div>
          <p className="dg-lede">{lede}</p>
          <div className="dg-rows">
            {rows.map((r) => (
              <div className={"dg-row" + (rank(r.name) === 3 ? " is-quiet" : "")} key={r.i}>
                <div className="dg-rk">
                  {r.val ? <b>{r.val}</b> : null}
                  <span>{r.name}</span>
                </div>
                <p className="dg-rv">{r.v}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
