"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

const COLS = 24;
const ROWS = 14;
const RADIUS = 3;
const SCRAMBLE_MS = 220;
const TICK_MS = 40;
const CHARSET =
  "01{}\\/*#$%<>[]|=+~ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

function randomChar() {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)]!;
}

function buildGrid() {
  return Array.from({ length: ROWS * COLS }, randomChar);
}

function placeholderGrid() {
  return Array.from({ length: ROWS * COLS }, () => "·");
}

export function DataCharGrid() {
  const [chars, setChars] = useState<string[]>(placeholderGrid);
  const activeRef = useRef<Map<number, number>>(new Map());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCellRef = useRef(-1);

  useEffect(() => {
    setChars(buildGrid());
  }, []);

  const stopTickIfIdle = useCallback(() => {
    if (activeRef.current.size === 0 && tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const ensureTick = useCallback(() => {
    if (tickRef.current) return;
    tickRef.current = setInterval(() => {
      const now = Date.now();
      const active = activeRef.current;
      if (active.size === 0) {
        stopTickIfIdle();
        return;
      }

      setChars((prev) => {
        const next = [...prev];
        for (const [index, until] of active) {
          if (now >= until) {
            next[index] = randomChar();
            active.delete(index);
          } else {
            next[index] = randomChar();
          }
        }
        return next;
      });

      stopTickIfIdle();
    }, TICK_MS);
  }, [stopTickIfIdle]);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  const scrambleNear = useCallback(
    (row: number, col: number) => {
      const until = Date.now() + SCRAMBLE_MS;
      const r2 = RADIUS * RADIUS;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const dr = r - row;
          const dc = c - col;
          if (dr * dr + dc * dc <= r2) {
            activeRef.current.set(r * COLS + c, until);
          }
        }
      }
      ensureTick();
    },
    [ensureTick]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      const col = Math.min(COLS - 1, Math.floor((x / rect.width) * COLS));
      const row = Math.min(ROWS - 1, Math.floor((y / rect.height) * ROWS));
      const center = row * COLS + col;
      if (center === lastCellRef.current) return;
      lastCellRef.current = center;
      scrambleNear(row, col);
    },
    [scrambleNear]
  );

  return (
    <div
      role="presentation"
      aria-hidden="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => {
        lastCellRef.current = -1;
      }}
      className="grid h-full w-full min-h-[220px] select-none font-mono text-[9px] leading-none text-[#b0b0b0] md:min-h-[320px] md:text-[10px]"
      style={{
        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
        aspectRatio: `${COLS} / ${ROWS}`,
      }}
    >
      {chars.map((char, i) => (
        <span key={i} className="flex items-center justify-center">
          {char}
        </span>
      ))}
    </div>
  );
}
