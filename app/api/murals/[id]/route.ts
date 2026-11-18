import { NextResponse } from "next/server";
import { getMuralItem } from "@/lib/murals/store";
import { muralKindOf, muralMotionOf } from "@/lib/murals/types";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const item = await getMuralItem(id);
  if (!item || item.status !== "approved") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const kind = muralKindOf(item);
  const body: {
    id: string;
    title: string;
    caption: string;
    imageUrl: string;
    seasonName: string;
    createdAt: number;
    kind: typeof kind;
    seasonNumber?: number;
    day?: number;
    motion?: ReturnType<typeof muralMotionOf>;
  } = {
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
    body.seasonNumber = Math.trunc(item.seasonNumber);
  }
  if (
    kind === "moment" &&
    typeof item.day === "number" &&
    Number.isFinite(item.day) &&
    item.day > 0
  ) {
    body.day = Math.trunc(item.day);
  }
  const motion = muralMotionOf(item);
  if (motion) body.motion = motion;
  return NextResponse.json(body);
}
