import { NextResponse } from "next/server";
import { requireMuralsAdmin } from "@/lib/murals/admin-auth";
import type { FrameKind } from "@/lib/murals/frame";
import { deleteMuralItem, updateMuralItem } from "@/lib/murals/store";
import type { MuralStatus } from "@/lib/murals/types";

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
  const denied = requireMuralsAdmin(request);
  if (denied) return denied;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const patch: {
    title?: string;
    caption?: string;
    frameKind?: FrameKind;
    status?: MuralStatus;
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
  const denied = requireMuralsAdmin(_request);
  if (denied) return denied;

  const { id } = await context.params;
  const ok = await deleteMuralItem(id);
  if (!ok) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
