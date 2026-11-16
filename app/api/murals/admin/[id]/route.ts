import { NextResponse } from "next/server";
import type { FrameKind } from "@/lib/murals/frame";
import { deleteMuralItem, updateMuralItem } from "@/lib/murals/store";
import type { MuralKind, MuralStatus } from "@/lib/murals/types";
import { requireMuralsAdmin } from "../guard";

const FRAME_KINDS: readonly FrameKind[] = [
  "print",
  "ink",
  "glitch",
  "painting",
  "schematic",
  "craft",
  "plain",
];

const STATUSES: readonly MuralStatus[] = ["pending", "approved", "rejected"];

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireMuralsAdmin(request);
  if (denied) return denied;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const patch: {
    title?: string;
    caption?: string;
    frameKind?: FrameKind;
    status?: MuralStatus;
    seasonNumber?: number;
    kind?: MuralKind;
    day?: number | null;
  } = {};

  if (typeof body?.title === "string") patch.title = body.title;
  if (typeof body?.caption === "string") patch.caption = body.caption;
  if (
    typeof body?.frameKind === "string" &&
    (FRAME_KINDS as readonly string[]).includes(body.frameKind)
  ) {
    patch.frameKind = body.frameKind as FrameKind;
  }
  if (
    typeof body?.status === "string" &&
    (STATUSES as readonly string[]).includes(body.status)
  ) {
    patch.status = body.status as MuralStatus;
  }
  if (body?.kind === "season" || body?.kind === "moment") {
    patch.kind = body.kind;
  }
  const rawSeasonNumber = body?.seasonNumber;
  if (
    typeof rawSeasonNumber === "number" &&
    Number.isInteger(rawSeasonNumber) &&
    rawSeasonNumber > 0
  ) {
    patch.seasonNumber = rawSeasonNumber;
  } else if (
    typeof rawSeasonNumber === "string" &&
    /^\d+$/.test(rawSeasonNumber.trim()) &&
    Number(rawSeasonNumber.trim()) > 0
  ) {
    patch.seasonNumber = Number(rawSeasonNumber.trim());
  }
  if (body?.day === null || body?.day === "") {
    patch.day = null;
  } else {
    const rawDay = body?.day;
    if (
      typeof rawDay === "number" &&
      Number.isInteger(rawDay) &&
      rawDay > 0
    ) {
      patch.day = rawDay;
    } else if (
      typeof rawDay === "string" &&
      /^\d+$/.test(rawDay.trim()) &&
      Number(rawDay.trim()) > 0
    ) {
      patch.day = Number(rawDay.trim());
    }
  }

  const item = await updateMuralItem(id, patch);
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const denied = await requireMuralsAdmin(_request);
  if (denied) return denied;

  const { id } = await context.params;
  const ok = await deleteMuralItem(id);
  if (!ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
