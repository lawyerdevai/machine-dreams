"use client";
import { useEffect, useRef } from "react";

type Stats = { fills: number; volumeEth: number; churn: number; wallets: number; volatility: number };

const seedFromHash = (h: string) => parseInt(h.slice(0, 8), 16) >>> 0;

/** Small sandboxed player for index cards. pointer-events none; load once with final-week stats. */
export default function DatagramThumb({
  scene,
  sha256,
  stats,
  title,
}: {
  scene: string;
  sha256: string;
  stats: Stats;
  title: string;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const payload = { ...stats, day: 7, progress: 1 };

  useEffect(() => {
    const send = () => {
      frame.current?.contentWindow?.postMessage(
        { type: "load", scene, stats: payload, seed: seedFromHash(sha256), id: sha256 },
        "*"
      );
    };
    const onMsg = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === "hello") send();
    };
    window.addEventListener("message", onMsg);
    send();
    const t = window.setTimeout(send, 800);
    return () => {
      window.removeEventListener("message", onMsg);
      window.clearTimeout(t);
    };
  }, [scene, sha256]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dg-thumb-well" aria-hidden="true">
      <iframe
        ref={frame}
        src="/datagrams/player.html"
        sandbox="allow-scripts"
        title={`Preview: ${title}`}
        tabIndex={-1}
      />
    </div>
  );
}
