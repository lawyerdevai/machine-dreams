import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import type { FrameKind } from "@/lib/murals/frame";
import { isMotionPathForMural } from "@/lib/murals/ns";
import { deleteMuralItem, updateMuralItem } from "@/lib/murals/store";
import type { MuralKind, MuralMotion, MuralStatus } from "@/lib/murals/types";
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

function isBlobHost(url: URL): boolean {
  return (
    url.hostname === "public.blob.vercel-storage.com" ||
    url.hostname.endsWith(".public.blob.vercel-storage.com")
  );
}

function parseMotionPatch(
  raw: unknown,
  muralId: string
): { ok: true; motion: MuralMotion | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, motion: null };
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid motion payload." };
  }
  const m = raw as Record<string, unknown>;
  if (typeof m.url !== "string" || !m.url.trim()) {
    return { ok: false, error: "motion.url is required." };
  }
  let parsed: URL;
  try {
    parsed = new URL(m.url.trim());
  } catch {
    return { ok: false, error: "motion.url is not a valid URL." };
  }
  if (parsed.protocol !== "https:" || !isBlobHost(parsed)) {
    return { ok: false, error: "motion.url must be a Vercel Blob https URL." };
  }
  // Accept legacy /{NS}/{id}.mp4 and unique /{NS}/{id}-motion-{suffix}.mp4
  if (!isMotionPathForMural(parsed.pathname, muralId)) {
    return {
      ok: false,
      error: `motion.url must be a Blob motion object for mural ${muralId}.`,
    };
  }
  const width = typeof m.width === "number" ? m.width : Number(m.width);
  const height = typeof m.height === "number" ? m.height : Number(m.height);
  const seconds = typeof m.seconds === "number" ? m.seconds : Number(m.seconds);
  if (!Number.isFinite(width) || width <= 0 || !Number.isInteger(width)) {
    return { ok: false, error: "motion.width must be a positive integer." };
  }
  if (!Number.isFinite(height) || height <= 0 || !Number.isInteger(height)) {
    return { ok: false, error: "motion.height must be a positive integer." };
  }
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 120) {
    return { ok: false, error: "motion.seconds must be a positive number ≤ 120." };
  }
  return {
    ok: true,
    motion: {
      url: parsed.toString(),
      width: Math.trunc(width),
      height: Math.trunc(height),
      seconds,
    },
  };
}

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
    motion?: MuralMotion | null;
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

  if ("motion" in (body ?? {})) {
    const parsed = parseMotionPatch(body.motion, id);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    patch.motion = parsed.motion;
  }

  const item = await updateMuralItem(id, patch);
  if (!item) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if ("motion" in (body ?? {})) {
    // Public gallery + viewing room ISR (revalidate=300) must pick up new motion.url.
    revalidatePath("/murals");
    revalidatePath(`/murals/${id}`);
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
