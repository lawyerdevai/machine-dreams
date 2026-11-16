import { NextResponse } from "next/server";
import { requireMuralsAdmin } from "@/lib/murals/admin-auth";
import { generateMural } from "@/lib/murals/generate";

export const maxDuration = 120;

export async function POST(request: Request) {
  const denied = requireMuralsAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    const seasonId =
      typeof body?.seasonId === "string" ? body.seasonId.trim() : undefined;
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
    const result = await generateMural({
      ...(seasonId ? { seasonId } : {}),
      ...(seasonNumber !== undefined ? { seasonNumber } : {}),
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
