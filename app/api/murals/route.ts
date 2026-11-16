import { NextResponse } from "next/server";
import { listMuralItems } from "@/lib/murals/store";
import { muralKindOf, type MuralPublicItem } from "@/lib/murals/types";

function toPublic(item: {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  seasonName: string;
  seasonNumber?: number;
  day?: number;
  kind?: string | null;
  createdAt: number;
  status: string;
}): MuralPublicItem | null {
  if (item.status !== "approved") return null;
  const kind = muralKindOf(item);
  const publicItem: MuralPublicItem = {
    id: item.id,
    title: item.title,
    caption: item.caption,
    imageUrl: item.imageUrl,
    seasonName: item.seasonName,
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
  return publicItem;
}

/** Public: approved murals only, newest first. */
export async function GET() {
  const items = await listMuralItems();
  const publicItems = items
    .map(toPublic)
    .filter((item): item is MuralPublicItem => item !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ items: publicItems });
}
