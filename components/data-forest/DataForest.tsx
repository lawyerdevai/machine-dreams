"use client";
import { useEffect, useRef } from "react";
import { startForest } from "./forest";

/* A forest and a stream made entirely of glyphs. Self-contained: no data, no network. */
export default function DataForest({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const f = startForest(el, {});
    return () => f.stop();
  }, []);
  return <canvas ref={ref} className={className} role="img" aria-label="A forest and a stream made of data" style={{ display: "block", width: "100%", height: "100%" }} />;
}
