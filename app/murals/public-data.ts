import "server-only";

import { getMuralItem, listMuralItems } from "@/lib/murals/store";
import type { MuralPublicItem } from "@/lib/murals/types";

function toPublic(item: {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  seasonName: string;
  createdAt: number;
  frameKind: MuralPublicItem["frameKind"];
  status: string;
}): MuralPublicItem | null {
  if (item.status !== "approved") return null;
  return {
    id: item.id,
    title: item.title,
    caption: item.caption,
    imageUrl: item.imageUrl,
    seasonName: item.seasonName,
    createdAt: item.createdAt,
    frameKind: item.frameKind,
  };
}

/**
 * Public mural list — same fields as GET /api/murals (approved only, newest first).
 * Server pages call this instead of HTTP self-fetch so build/ISR stay reliable.
 */
export async function fetchPublicMurals(): Promise<MuralPublicItem[]> {
  const items = await listMuralItems();
  return items
    .map(toPublic)
    .filter((item): item is MuralPublicItem => item !== null);
}

/** Same fields as GET /api/murals/[id]; null when missing or not approved. */
export async function fetchPublicMural(
  id: string
): Promise<MuralPublicItem | null> {
  const item = await getMuralItem(id);
  if (!item) return null;
  return toPublic(item);
}
