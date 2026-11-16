import "server-only";

import { getMuralItem, listMuralItems } from "@/lib/murals/store";
import type { PublicMural } from "./public-types";

export type { PublicMural } from "./public-types";

function toPublic(item: {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  seasonNumber?: number;
  createdAt: number;
  frameKind: PublicMural["frameKind"];
  status: string;
}): PublicMural | null {
  if (item.status !== "approved") return null;
  const publicItem: PublicMural = {
    id: item.id,
    title: item.title,
    caption: item.caption,
    imageUrl: item.imageUrl,
    createdAt: item.createdAt,
    frameKind: item.frameKind,
  };
  if (
    typeof item.seasonNumber === "number" &&
    Number.isFinite(item.seasonNumber)
  ) {
    publicItem.seasonNumber = Math.trunc(item.seasonNumber);
  }
  return publicItem;
}

/** Newest season first (seasonNumber desc), then newest createdAt. */
export function sortPublicMurals(items: PublicMural[]): PublicMural[] {
  return [...items].sort((a, b) => {
    const aN = typeof a.seasonNumber === "number" ? a.seasonNumber : -Infinity;
    const bN = typeof b.seasonNumber === "number" ? b.seasonNumber : -Infinity;
    if (bN !== aN) return bN - aN;
    return b.createdAt - a.createdAt;
  });
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
