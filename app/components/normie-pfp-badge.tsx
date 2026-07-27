"use client";

import { useState } from "react";

export function NormiePfpBadge({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return null;

  return (
    <span className="absolute bottom-1.5 left-1.5 z-10 block h-8 w-8 overflow-hidden rounded-full border-2 border-white shadow-sm max-md:bottom-1 max-md:left-1 max-md:h-5 max-md:w-5 max-md:border md:h-9 md:w-9">
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
