"use client";

import { useState } from "react";
import { ArtworkGallery, NormieGrid, WalletSearch } from "./gallery";
import type { Artwork } from "@/lib/types";

interface HomeClientProps {
  artworks: Artwork[];
}

export function HomeClient({ artworks }: HomeClientProps) {
  const [holderTokens, setHolderTokens] = useState<string[]>([]);

  return (
    <div className="flex flex-col gap-12 w-full max-w-5xl">
      <WalletSearch onResults={setHolderTokens} />

      {holderTokens.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-xs text-[#666] uppercase tracking-widest">
            Your Normies
          </h2>
          <NormieGrid tokenIds={holderTokens} />
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xs text-[#666] uppercase tracking-widest">
          Gallery
        </h2>
        <ArtworkGallery artworks={artworks} />
      </section>
    </div>
  );
}
