/**
 * TEMPORARY. Dev-only mural generation v3 (Flux only). Do not expose in production.
 */
import { NextResponse } from "next/server";
import { runV3 } from "@/lib/murals/engine-v3";

export const maxDuration = 120;

function stringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const body = await request.json().catch(() => null);
    const result = await runV3({
      lastSeasonId:
        typeof body?.lastSeasonId === "string" ? body.lastSeasonId : undefined,
      forceTone:
        typeof body?.forceTone === "string" ? body.forceTone : undefined,
      usedMedia: stringList(body?.usedMedia, 10),
      usedStyles: stringList(body?.usedStyles, 20),
      usedPalettes: stringList(body?.usedPalettes, 8),
      usedCompositions: stringList(body?.usedCompositions, 8),
      usedFigures: stringList(body?.usedFigures, 10),
      usedBeats: stringList(body?.usedBeats, 10),
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, message: result.message },
        { status: 200 }
      );
    }
    const { imageBytes: _bytes, engine: _engine, ...rest } = result;
    return NextResponse.json(rest);
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "This mural couldn't be drawn right now. Please try again.",
      },
      { status: 200 }
    );
  }
}
