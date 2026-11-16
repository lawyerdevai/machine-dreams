import { NextResponse } from "next/server";
import { listMuralItems } from "@/lib/murals/store";
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

/** Public: approved murals only, newest first. */
export async function GET() {
  const items = await listMuralItems();
  const publicItems = items
    .map(toPublic)
    .filter((item): item is MuralPublicItem => item !== null);
  return NextResponse.json({ items: publicItems });
}
