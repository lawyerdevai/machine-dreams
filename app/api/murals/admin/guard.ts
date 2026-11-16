import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

const FAIL_WINDOW_SECONDS = 15 * 60;
const FAIL_LIMIT = 10;

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";
  return raw.replace(/[^a-zA-Z0-9:.]/g, "").slice(0, 64) || "unknown";
}

function failKey(ip: string) {
  return `murals:admin:fail:${ip}`;
}

function keysMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function isLockedOut(ip: string): Promise<boolean> {
  try {
    const count = await redis.get<number>(failKey(ip));
    return typeof count === "number" && count >= FAIL_LIMIT;
  } catch {
    return false;
  }
}

async function recordFailedAttempt(ip: string): Promise<void> {
  try {
    const key = failKey(ip);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, FAIL_WINDOW_SECONDS);
    }
  } catch {
    // Fail open on Redis errors — never lock out admins because Redis is down.
  }
}

/**
 * Development: allow. Otherwise require x-admin-key === MURALS_ADMIN_KEY
 * (constant-time). Missing key in production fails closed. Failed attempts
 * are rate-limited per IP (10 / 15 min via Upstash Redis).
 */
export async function requireMuralsAdmin(
  request: Request
): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === "development") return null;

  const ip = clientIp(request);
  if (await isLockedOut(ip)) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429 }
    );
  }

  const expected = process.env.MURALS_ADMIN_KEY?.trim();
  if (!expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const provided = request.headers.get("x-admin-key")?.trim() ?? "";
  if (!keysMatch(provided, expected)) {
    await recordFailedAttempt(ip);
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}
