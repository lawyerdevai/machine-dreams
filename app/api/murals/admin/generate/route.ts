import { NextResponse } from "next/server";
import { generateMural } from "@/lib/murals/generate";
import type { MuralKind } from "@/lib/murals/types";
import { requireMuralsAdmin } from "../guard";

/** Matches app/api/datagrams/generate and app/api/datagrams/dev (highest in repo). */
export const maxDuration = 300;

const SOURCE_MAX = 12000;
const FOCUS_MAX = 200;
const SCENE_MAX = 1000;
const CAST_MAX = 4000;

export async function POST(request: Request) {
  const denied = await requireMuralsAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    const seasonId =
      typeof body?.seasonId === "string" ? body.seasonId.trim() : undefined;
    const kind: MuralKind =
      body?.kind === "season" ? "season" : "moment";
    const rawNumber = body?.seasonNumber;
    const seasonNumber =
      typeof rawNumber === "number" &&
      Number.isInteger(rawNumber) &&
      rawNumber > 0
        ? rawNumber
        : typeof rawNumber === "string" &&
            /^\d+$/.test(rawNumber.trim()) &&
            Number(rawNumber.trim()) > 0
          ? Number(rawNumber.trim())
          : undefined;

    const rawDay = body?.day;
    const day =
      typeof rawDay === "number" &&
      Number.isInteger(rawDay) &&
      rawDay > 0
        ? rawDay
        : typeof rawDay === "string" &&
            /^\d+$/.test(rawDay.trim()) &&
            Number(rawDay.trim()) > 0
          ? Number(rawDay.trim())
          : undefined;

    let source: string | undefined;
    if (typeof body?.source === "string") {
      source = body.source.trim();
      if (!source) {
        return NextResponse.json(
          { error: "Source text is empty after trimming." },
          { status: 400 }
        );
      }
      if (source.length > SOURCE_MAX) {
        return NextResponse.json(
          {
            error: `Source text is too long (${source.length} characters). Maximum is ${SOURCE_MAX}.`,
          },
          { status: 400 }
        );
      }
    }

    let focus: string | undefined;
    if (typeof body?.focus === "string") {
      const trimmedFocus = body.focus.trim();
      if (trimmedFocus.length > FOCUS_MAX) {
        return NextResponse.json(
          {
            error: `Focus is too long (${trimmedFocus.length} characters). Maximum is ${FOCUS_MAX}.`,
          },
          { status: 400 }
        );
      }
      if (trimmedFocus) focus = trimmedFocus;
    }

    let directedScene: string | undefined;
    if (typeof body?.scene === "string") {
      const trimmedScene = body.scene.trim();
      if (trimmedScene.length > SCENE_MAX) {
        return NextResponse.json(
          {
            error: `Scene is too long (${trimmedScene.length} characters). Maximum is ${SCENE_MAX}.`,
          },
          { status: 400 }
        );
      }
      if (trimmedScene) directedScene = trimmedScene;
    }

    let directedCast: string | undefined;
    if (typeof body?.cast === "string") {
      const trimmedCast = body.cast.trim();
      if (trimmedCast.length > CAST_MAX) {
        return NextResponse.json(
          {
            error: `Cast is too long (${trimmedCast.length} characters). Maximum is ${CAST_MAX}.`,
          },
          { status: 400 }
        );
      }
      if (trimmedCast) directedCast = trimmedCast;
    }

    const direction =
      directedScene || directedCast
        ? {
            ...(directedScene ? { scene: directedScene } : {}),
            ...(directedCast ? { cast: directedCast } : {}),
          }
        : undefined;

    let engine: "v2" | "v3" | undefined;
    if (body?.engine !== undefined && body?.engine !== null) {
      if (body.engine === "random") {
        engine = undefined;
      } else if (body.engine === "v2" || body.engine === "v3") {
        engine = body.engine;
      } else {
        return NextResponse.json(
          { error: 'Invalid engine. Use "random", "v2", or "v3".' },
          { status: 400 }
        );
      }
    }

    const result = await generateMural({
      kind,
      ...(seasonId ? { seasonId } : {}),
      ...(kind === "season" && seasonNumber !== undefined
        ? { seasonNumber }
        : {}),
      ...(kind === "moment" && day !== undefined ? { day } : {}),
      ...(source ? { source } : {}),
      ...(focus ? { focus } : {}),
      ...(direction ? { direction } : {}),
      ...(engine ? { engine } : {}),
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, attempts: result.attempts },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, item: result.item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generate failed. Please try again.";
    console.error(`[murals] generate route failed: ${message}`);
    return NextResponse.json(
      {
        error: message,
        attempts: [{ attempt: 1, stage: "save", message }],
      },
      { status: 500 }
    );
  }
}
