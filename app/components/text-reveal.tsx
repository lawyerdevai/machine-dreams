"use client";

import { useEffect, useRef, useState } from "react";

type TextRevealProps = {
  text: string;
  /** When true, progressive reveal starts (once per mount/activation). */
  active: boolean;
  /** ~ms per character. Default ~18 → readable, not sluggish. */
  msPerChar?: number;
  className?: string;
  onComplete?: () => void;
};

/**
 * Progressive character reveal for bio / artist statement unveilings.
 */
export function TextReveal({
  text,
  active,
  msPerChar = 16,
  className = "",
  onComplete,
}: TextRevealProps) {
  const [count, setCount] = useState(0);
  const completed = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!active) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCount(text.length);
      return;
    }

    if (text.length === 0) return;
    if (count >= text.length) return;
    const timer = window.setTimeout(() => {
      setCount((c) => Math.min(text.length, c + 1));
    }, msPerChar);
    return () => window.clearTimeout(timer);
  }, [active, count, text, msPerChar]);

  useEffect(() => {
    if (!active || completed.current) return;

    if (text.length === 0) {
      completed.current = true;
      onCompleteRef.current?.();
      return;
    }

    if (count < text.length) return;
    completed.current = true;
    onCompleteRef.current?.();
  }, [active, count, text.length]);

  if (!active && count === 0) return null;

  return (
    <p className={className}>
      {text.slice(0, count)}
      {active && count < text.length ? (
        <span className="cursor-blink" aria-hidden>
          |
        </span>
      ) : null}
    </p>
  );
}
