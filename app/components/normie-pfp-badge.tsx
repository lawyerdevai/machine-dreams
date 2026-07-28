"use client";

import { useState } from "react";

type NormiePfpBadgeProps = {
  src: string;
  /** overlay: corner badge on tiles; inline: square credit/ownership mark */
  variant?: "overlay" | "inline";
  className?: string;
};

export function NormiePfpBadge({
  src,
  variant = "overlay",
  className = "",
}: NormiePfpBadgeProps) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  const sizeClass =
    variant === "inline"
      ? "relative h-10 w-10 shrink-0"
      : "absolute bottom-1.5 left-1.5 z-10 h-8 w-8 rounded-full border-2 border-white shadow-sm max-md:bottom-1 max-md:left-1 max-md:h-5 max-md:w-5 max-md:border md:h-9 md:w-9";

  return (
    <span
      className={`block overflow-hidden ${sizeClass} ${className}`.trim()}
    >
      {/* Native img: Normies PFPs are SVG; next/image cannot optimize remote SVGs. */}
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover"
        onError={() => setFailed(true)}
      />
    </span>
  );
}
