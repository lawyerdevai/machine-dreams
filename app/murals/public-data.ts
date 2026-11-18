import "server-only";

import { getMuralItem, listMuralItems } from "@/lib/murals/store";
import { muralKindOf, muralMotionOf } from "@/lib/murals/types";
import { sortSeasonMurals, type PublicMural } from "./public-types";

export type { PublicMural } from "./public-types";
export { sortSeasonMurals } from "./public-types";

function toPublic(item: {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  seasonNumber?: number;
  day?: number;
  kind?: string | null;
  createdAt: number;
  status: string;
  record?: { motion?: unknown };
}): PublicMural | null {
  if (item.status !== "approved") return null;
  const kind = muralKindOf(item);
  const publicItem: PublicMural = {
    id: item.id,
    title: item.title,
    caption: item.caption,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    kind,
  };
  if (
    kind === "season" &&
    typeof item.seasonNumber === "number" &&
    Number.isFinite(item.seasonNumber)
  ) {
    publicItem.seasonNumber = Math.trunc(item.seasonNumber);
  }
  if (
    kind === "moment" &&
    typeof item.day === "number" &&
    Number.isFinite(item.day) &&
    item.day > 0
  ) {
    publicItem.day = Math.trunc(item.day);
  }
  const motion = muralMotionOf(item);
  if (motion) publicItem.motion = motion;
  return publicItem;
}

/** Newest first by createdAt (home preview + default list order). */
export function sortPublicMurals(items: PublicMural[]): PublicMural[] {
  return [...items].sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Public mural list — same fields as GET /api/murals (approved only).
 * Server pages call this instead of HTTP self-fetch so build/ISR stay reliable.
 */
export async function fetchPublicMurals(): Promise<PublicMural[]> {
  const items = await listMuralItems();
  return sortPublicMurals(
    items
      .map(toPublic)
      .filter((item): item is PublicMural => item !== null)
  );
}

/** Same fields as GET /api/murals/[id]; null when missing or not approved. */
export async function fetchPublicMural(
  id: string
): Promise<PublicMural | null> {
  const item = await getMuralItem(id);
  if (!item) return null;
  return toPublic(item);
}
