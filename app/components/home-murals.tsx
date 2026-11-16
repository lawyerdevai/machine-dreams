"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export type HomeMuralSlide = {
  id: string;
  imageUrl: string;
  title: string;
  caption: string;
};

function muralAlt(title: string, caption: string): string {
  const t = title.trim();
  const c = caption.trim();
  if (t && c) return `${t}. ${c}`;
  return t || c || "Mural";
}

function shuffleInPlace<T>(list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Home Murals preview: newest first, then shuffled rotation with crossfade.
 */
export function HomeMurals({ murals }: { murals: HomeMuralSlide[] }) {
  const [order, setOrder] = useState<number[]>(() =>
    murals.map((_, i) => i)
  );
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [rotate, setRotate] = useState(false);

  useEffect(() => {
    if (murals.length <= 1 || prefersReducedMotion()) {
      setOrder(murals.map((_, i) => i));
      setIndex(0);
      setRotate(false);
      return;
    }
    const rest = murals.slice(1).map((_, i) => i + 1);
    shuffleInPlace(rest);
    setOrder([0, ...rest]);
    setIndex(0);
    setRotate(true);
  }, [murals]);

  useEffect(() => {
    if (!rotate || paused || order.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % order.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [rotate, paused, order.length]);

  useEffect(() => {
    if (!rotate || order.length <= 1) return;
    const nextOrderIndex = (index + 1) % order.length;
    const nextMural = murals[order[nextOrderIndex]!];
    if (!nextMural) return;
    const img = new window.Image();
    img.src = nextMural.imageUrl;
  }, [rotate, index, order, murals]);

  if (murals.length === 0) return null;

  return (
    <Link
      href="/murals"
      className="relative block w-full max-w-[28rem] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0a0a0a]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        className="relative aspect-[3/2] w-full overflow-hidden bg-[#f5f5f5]"
        style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)" }}
      >
        {order.map((muralIndex, slot) => {
          const mural = murals[muralIndex];
          if (!mural) return null;
          const shown = slot === index;
          return (
            <Image
              key={`${mural.id}-${muralIndex}`}
              src={mural.imageUrl}
              alt={shown ? muralAlt(mural.title, mural.caption) : ""}
              fill
              sizes="(max-width: 800px) 100vw, 28rem"
              priority={muralIndex === 0}
              className="object-cover transition-opacity ease-in-out"
              style={{
                opacity: shown ? 1 : 0,
                transitionDuration: rotate ? "1200ms" : "0ms",
              }}
              aria-hidden={!shown}
            />
          );
        })}
      </div>
    </Link>
  );
}
