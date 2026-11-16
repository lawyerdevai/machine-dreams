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
  return NextResponse.json({
    id: item.id,
    title: item.title,
    caption: item.caption,
    imageUrl: item.imageUrl,
    seasonName: item.seasonName,
    createdAt: item.createdAt,
    frameKind: item.frameKind,
  });
}
