"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const GRID = 8;
const DURATION_MS = 750;
const FLICKER_MS = 280;

type Cell = {
  id: number;
  delay: number;
  tone: string;
};

function buildCells(): Cell[] {
  const tones = ["#0a0a0a", "#2a2a2a", "#666666", "#c8c8c8", "#e8e8e8", "#f5f5f5"];
  const cells: Cell[] = [];
  for (let i = 0; i < GRID * GRID; i++) {
    cells.push({
      id: i,
      delay: Math.random() * (DURATION_MS - FLICKER_MS),
      tone: tones[Math.floor(Math.random() * tones.length)]!,
    });
  }
  return cells;
}

/**
 * Square Normie PFP with a brief materialize-in (scattered pixel blocks → clean image).
 * Used on the artwork detail credit line; landing overlays keep NormiePfpBadge.
 */
export function MaterializingNormiePfp({
  src,
  sizeClass = "h-16 w-16 md:h-[4.5rem] md:w-[4.5rem]",
  active = true,
  instant = false,
  onComplete,
}: {
  src: string;
  sizeClass?: string;
  /** When false, stays blank until activated (for staged reveals). */
  active?: boolean;
  /** Skip animation — show the settled image immediately (post-reveal handoff). */
  instant?: boolean;
  onComplete?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<"idle" | "scramble" | "resolve" | "done">(
    instant ? "done" : "idle"
  );
  const [flickerTick, setFlickerTick] = useState(0);
  const cells = useMemo(() => buildCells(), []);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const completed = useRef(false);

  useEffect(() => {
    if (!active || instant) return;

    let cancelled = false;
    completed.current = false;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("done");
      if (!cancelled) onCompleteRef.current?.();
      return;
    }

    setPhase("scramble");
    const resolveTimer = window.setTimeout(() => {
      if (!cancelled) setPhase("resolve");
    }, FLICKER_MS);
    const doneTimer = window.setTimeout(() => {
      if (cancelled) return;
      setPhase("done");
      if (!completed.current) {
        completed.current = true;
        onCompleteRef.current?.();
      }
    }, DURATION_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(resolveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [active, instant]);

  useEffect(() => {
    if (phase !== "scramble") return;
    const id = window.setInterval(() => setFlickerTick((t) => t + 1), 40);
    return () => window.clearInterval(id);
  }, [phase]);

  if (failed) return null;
  if (!active && phase === "idle") {
    return <span className={`block shrink-0 ${sizeClass}`} aria-hidden />;
  }

  const tones = ["#0a0a0a", "#2a2a2a", "#666666", "#c8c8c8", "#e8e8e8", "#f5f5f5"];

  return (
    <span
      className={`relative block shrink-0 overflow-hidden ${sizeClass}`}
      aria-hidden={false}
    >
      <img
        src={src}
        alt=""
        className={`h-full w-full object-cover transition-opacity duration-200 ${
          phase === "done" ? "opacity-100" : "opacity-90"
        }`}
        onError={() => setFailed(true)}
      />
      {phase !== "done" && phase !== "idle" ? (
        <span
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
                      ? `opacity 160ms ease-out ${cell.delay}ms`
                      : undefined,
                }}
              />
            );
          })}
        </span>
      ) : null}
    </span>
  );
}
