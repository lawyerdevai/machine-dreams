import type { MuralKind, MuralMotion } from "@/lib/murals/types";

/** Public gallery fields only — never seasonName or other internal data. */
export type PublicMural = {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  createdAt: number;
  kind: MuralKind;
  /** Only present for kind "season". */
  seasonNumber?: number;
  /** Optional world day for kind "moment". */
  day?: number;
  /** Optional looping clip; omit when the piece has no motion. */
  motion?: MuralMotion;
};

/** Season tab: seasonNumber desc, then newest createdAt. */
export function sortSeasonMurals(items: PublicMural[]): PublicMural[] {
  return [...items].sort((a, b) => {
    const aN = typeof a.seasonNumber === "number" ? a.seasonNumber : -Infinity;
    const bN = typeof b.seasonNumber === "number" ? b.seasonNumber : -Infinity;
    if (bN !== aN) return bN - aN;
    return b.createdAt - a.createdAt;
  });
}
