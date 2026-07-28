"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const GRID = 12;
const DURATION_MS = 2000;
const FLICKER_MS = 520;

type Cell = {
  id: number;
  delay: number;
  tone: string;
};

function buildCells(durationMs: number, flickerMs: number): Cell[] {
  const tones = ["#0a0a0a", "#2a2a2a", "#666666", "#c8c8c8", "#e8e8e8", "#f5f5f5"];
  const cells: Cell[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    cells.push({
      id: i,
      delay: Math.random() * Math.max(0, durationMs - flickerMs - 200),
      tone: tones[Math.floor(Math.random() * tones.length)]!,
    });
  }
  return cells;
}

function preloadImage(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/**
 * Full-bleed artwork materialize (scattered blocks → clean image).
 * Longer/more dramatic than the PFP badge version — for test-create unveil.
 */
export function MaterializingArtwork({
  src,
  alt,
  active = true,
  durationMs = DURATION_MS,
  onComplete,
}: {
  src: string;
  alt: string;
  active?: boolean;
  durationMs?: number;
  onComplete?: () => void;
}) {
  const flickerMs = Math.min(FLICKER_MS, Math.floor(durationMs * 0.28));
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<"waiting" | "scramble" | "resolve" | "done">(
    "waiting"
  );
  const [flickerTick, setFlickerTick] = useState(0);
  const cells = useMemo(
    () => buildCells(durationMs, flickerMs),
    [durationMs, flickerMs]
  );
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completed = useRef(false);

  // Wait for the real asset, then run scramble → resolve → done.
  // Do not depend on `phase` here — that cleared timers and stalled the reveal.
  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let resolveTimer: number | undefined;
    let doneTimer: number | undefined;

    const finish = () => {
      if (cancelled || completed.current) return;
      completed.current = true;
      setPhase("done");
      onCompleteRef.current?.();
    };

    const startAnimation = () => {
      if (cancelled) return;

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        finish();
        return;
      }

      setPhase("scramble");
      resolveTimer = window.setTimeout(() => {
        if (!cancelled) setPhase("resolve");
      }, flickerMs);
      doneTimer = window.setTimeout(finish, durationMs);
    };

    setPhase("waiting");
    completed.current = false;

    preloadImage(src).then((ok) => {
      if (cancelled) return;
      if (!ok) setFailed(true);
      startAnimation();
    });

    return () => {
      cancelled = true;
      if (resolveTimer) window.clearTimeout(resolveTimer);
      if (doneTimer) window.clearTimeout(doneTimer);
    };
  }, [active, src, durationMs, flickerMs]);

  useEffect(() => {
    if (phase !== "scramble") return;
    const id = window.setInterval(() => setFlickerTick((t) => t + 1), 45);
    return () => window.clearInterval(id);
  }, [phase]);

  if (failed && phase === "done") {
    return (
      <div className="flex aspect-square w-full items-center justify-center bg-[#0a0a0a] text-[#666]">
        <span className="font-serif text-sm">image unavailable</span>
      </div>
    );
  }

  const tones = ["#0a0a0a", "#2a2a2a", "#666666", "#c8c8c8", "#e8e8e8", "#f5f5f5"];
  const showOverlay = phase === "scramble" || phase === "resolve";

  return (
    <div className="relative aspect-square w-full overflow-hidden bg-[#0a0a0a]">
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${
          phase === "waiting" ? "opacity-0" : "opacity-100"
        }`}
        onError={() => setFailed(true)}
      />
      {showOverlay ? (
        <div
          className="pointer-events-none absolute inset-0 grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${GRID}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${GRID}, minmax(0, 1fr))`,
          }}
          aria-hidden
        >
          {cells.map((cell) => {
            const flickerTone =
              phase === "scramble"
                ? tones[(cell.id + flickerTick) % tones.length]!
                : cell.tone;
            return (
              <span
                key={cell.id}
                className="min-h-0 min-w-0"
                style={{
                  backgroundColor: flickerTone,
                  opacity: phase === "resolve" ? 0 : 1,
                  transition:
                    phase === "resolve"
                      ? `opacity 280ms ease-out ${cell.delay}ms`
                      : undefined,
                }}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
