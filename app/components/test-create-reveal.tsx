"use client";

import { ArtworkReveal, PreviewStatusSlot } from "@/app/components/artwork-reveal";
import type { Artwork } from "@/lib/types";

/**
 * /test-create sandbox unveil — same sequence as post-creation, disabled mint.
 */
export function TestCreateReveal({
  artwork,
  aboutBio,
}: {
  artwork: Artwork;
  aboutBio: string | null;
}) {
  return (
    <ArtworkReveal
      artwork={artwork}
      aboutBio={aboutBio}
      statusSlot={<PreviewStatusSlot />}
    />
  );
}
