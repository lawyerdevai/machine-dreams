"use client";

import { useEffect, useMemo, useState } from "react";

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
      // Staggered resolve — random order, not a wipe
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
}: {
  src: string;
  sizeClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [phase, setPhase] = useState<"scramble" | "resolve" | "done">("scramble");
  const [flickerTick, setFlickerTick] = useState(0);
  const cells = useMemo(() => buildCells(), []);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setPhase("done");
      return;
    }

    const resolveTimer = window.setTimeout(() => setPhase("resolve"), FLICKER_MS);
    const doneTimer = window.setTimeout(() => setPhase("done"), DURATION_MS);
    return () => {
      window.clearTimeout(resolveTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "scramble") return;
    const id = window.setInterval(() => setFlickerTick((t) => t + 1), 40);
    return () => window.clearInterval(id);
  }, [phase]);

  if (failed) return null;

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
      {phase !== "done" ? (
        <span
          className="pointer-events-none absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${GRID}, 1fr)`,
            gridTemplateRows: `repeat(${GRID}, 1fr)`,
          }}
          aria-hidden
        >
          {cells.map((cell) => {
            const flickerTone =
              phase === "scramble"
                ? tones[(cell.id + flickerTick) % tones.length]!
                : cell.tone;
            const clear = phase === "resolve";
            return (
              <span
                key={cell.id}
                className="block"
                style={{
                  backgroundColor: flickerTone,
                  opacity: clear ? 0 : 1,
                  transition: clear
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
