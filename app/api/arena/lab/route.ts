/**
 * TEMPORARY. Delete app/arena/lab and app/api/arena/lab before launch.
 */
import { NextResponse } from "next/server";
import { isArenaTokenId } from "@/lib/arena";
import { previewCampaignPortrait } from "@/lib/arena-campaign";
import {
  ARENA_DRAW_USER_MESSAGE,
  ARENA_NOT_AWAKENED_MESSAGE,
  ARENA_SAFETY_MESSAGE,
  previewArenaPortrait,
} from "@/lib/create-arena";

export const maxDuration = 120;

const HOUR_MS = 60 * 60 * 1000;
const HOUR_CAP = 40;
const RUN_CAP = 12;
const madeAt: number[] = [];

function imagesThisHour(now: number) {
  while (madeAt.length > 0 && now - madeAt[0]! >= HOUR_MS) {
    madeAt.shift();
  }
  return madeAt.length;
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const tokenId = typeof body?.tokenId === "string" ? body.tokenId.trim() : "";
  const runSize = Number(body?.runSize);

  if (!Number.isFinite(runSize) || runSize < 1 || runSize > RUN_CAP) {
    return NextResponse.json(
      {
        error: "run_cap",
        message: "12 images is the most in one run.",
      },
      { status: 400 }
    );
  }

  if (!isArenaTokenId(tokenId)) {
    return NextResponse.json(
      {
        error: "invalid_token_id",
        message: "Enter Normie numbers between 0 and 9999.",
      },
      { status: 400 }
    );
  }

  const now = Date.now();
  if (imagesThisHour(now) >= HOUR_CAP) {
    return NextResponse.json(
      {
        error: "hour_cap",
        message:
          "This lab has made 40 images in the last hour. Wait and try again.",
      },
      { status: 429 }
    );
  }
  madeAt.push(now);

  const variation = Number(body?.variation);
  const seed =
    Number.isInteger(variation) && variation >= 0 && variation <= 99
      ? variation
      : 0;

  try {
    if (body?.pack === "campaign") {
      const preview = await previewCampaignPortrait(tokenId, seed);
      return NextResponse.json({
        ok: true,
        pack: "campaign",
        tokenId: preview.tokenId,
        variation: preview.variation,
        name: preview.name,
        type: preview.type,
        title: preview.title,
        role: preview.role,
        setting: preview.setting,
        weather: preview.weather,
        foreground: preview.foreground,
        props: preview.props,
        framing: preview.framing,
        poseLevel: preview.poseLevel,
        palette: preview.palette,
        twist: preview.twist,
        corner: preview.corner,
        signatureTraits: preview.signatureTraits,
        imagePrompt: preview.imagePrompt,
        imageBase64: preview.image.toString("base64"),
      });
    }

    const preview = await previewArenaPortrait(tokenId, seed);
    return NextResponse.json({
      ok: true,
      tokenId: preview.tokenId,
      variation: preview.variation,
      name: preview.name,
      type: preview.type,
      title: preview.title,
      hand: preview.hand,
      primary: preview.primary,
      accents: preview.accents,
      fx: preview.fx,
      style: preview.style,
      framing: preview.framing,
      direction: preview.direction,
      marks: preview.marks,
      action: preview.action,
      patch: preview.patch,
      seal: preview.seal,
      dissolution: preview.dissolution,
      palette: preview.palette,
      interference: preview.interference,
      disruption: preview.disruption,
      pixelMode: preview.pixelMode,
      imagePrompt: preview.imagePrompt,
      imageBase64: preview.image.toString("base64"),
    });
  } catch (err) {
    const message =
      err instanceof Error &&
      (err.message === ARENA_NOT_AWAKENED_MESSAGE ||
        err.message === ARENA_SAFETY_MESSAGE)
        ? err.message
        : ARENA_DRAW_USER_MESSAGE;
    return NextResponse.json(
      { ok: false, tokenId, variation: seed, message },
      { status: 200 }
    );
  }
}
