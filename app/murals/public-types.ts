import type { FrameKind } from "@/lib/murals/frame";

/** Public gallery fields only — never seasonName or other internal data. */
export type PublicMural = {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  createdAt: number;
  frameKind: FrameKind;
  seasonNumber?: number;
};
