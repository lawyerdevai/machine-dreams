import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import {
  describeCharacterFromImage,
  resolveNormieImageBytes,
} from "@/lib/murals/describe-cast";
import { requireMuralsAdmin } from "../guard";

/** Matches other murals admin routes that call Claude. */
export const maxDuration = 60;

const UPLOAD_MAX_BYTES = 1_500_000; // ~1.5 MB
const RATE_WINDOW_SECONDS = 15 * 60;
const RATE_LIMIT = 20;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return raw.replace(/[^a-zA-Z0-9:.]/g, "").slice(0, 64) || "unknown";
}

function describeRateKey(ip: string) {
  return `murals:admin:describe:${ip}`;
}

async function checkDescribeRateLimit(
  ip: string
): Promise<NextResponse | null> {
  try {
    const key = describeRateKey(ip);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_WINDOW_SECONDS);
    }
    if (count > RATE_LIMIT) {
      return NextResponse.json(
        {
          error: `Describe rate limit exceeded (${RATE_LIMIT} per ${RATE_WINDOW_SECONDS / 60} minutes). Try again later.`,
        },
        { status: 429 }
      );
    }
  } catch {
    // Fail open if Redis is down — admin guard already authenticated.
  }
  return null;
}

export async function POST(request: Request) {
  const denied = await requireMuralsAdmin(request);
  if (denied) return denied;

  const ip = clientIp(request);
  const limited = await checkDescribeRateLimit(ip);
  if (limited) return limited;

  try {
    const form = await request.formData();
    const file = form.get("image");
    const queryRaw = form.get("query");
    const query =
      typeof queryRaw === "string" ? queryRaw.trim().slice(0, 80) : "";

    let imageBytes: Buffer;

    if (file instanceof File && file.size > 0) {
      if (file.size > UPLOAD_MAX_BYTES) {
        return NextResponse.json(
          {
            error: `Image is too large (${file.size} bytes). Maximum is ${UPLOAD_MAX_BYTES} bytes.`,
          },
          { status: 400 }
        );
      }
      const type = (file.type || "").toLowerCase();
      if (
        type &&
        !type.startsWith("image/") &&
        type !== "application/octet-stream"
      ) {
        return NextResponse.json(
          { error: "Upload must be an image file." },
          { status: 400 }
        );
      }
      imageBytes = Buffer.from(await file.arrayBuffer());
    } else if (query) {
      const resolved = await resolveNormieImageBytes(query);
      imageBytes = resolved.bytes;
    } else {
      return NextResponse.json(
        {
          error:
            "Provide an image upload, or a Cast name / token ID that matches the Normies API.",
        },
        { status: 400 }
      );
    }

    const description = await describeCharacterFromImage(imageBytes);
    return NextResponse.json({ ok: true, description });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Describe failed. Please try again.";
    console.error(`[murals] describe-cast failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
