import { NextResponse } from "next/server";
import { getMuralItem } from "@/lib/murals/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const item = await getMuralItem(id);
  if (!item || item.status !== "approved") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const body: {
    id: string;
    title: string;
    caption: string;
    imageUrl: string;
    seasonName: string;
    createdAt: number;
    frameKind: typeof item.frameKind;
    seasonNumber?: number;
  } = {
    id: item.id,
    title: item.title,
    caption: item.caption,
    imageUrl: item.imageUrl,
    seasonName: item.seasonName,
    createdAt: item.createdAt,
    frameKind: item.frameKind,
  };
  if (
    typeof item.seasonNumber === "number" &&
    Number.isFinite(item.seasonNumber)
  ) {
    body.seasonNumber = Math.trunc(item.seasonNumber);
  }
  return NextResponse.json(body);
}
