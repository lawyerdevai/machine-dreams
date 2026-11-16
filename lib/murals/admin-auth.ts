import { NextResponse } from "next/server";

/** Allow in development; otherwise require x-admin-key === MURALS_ADMIN_KEY. */
export function requireMuralsAdmin(request: Request): NextResponse | null {
  if (process.env.NODE_ENV === "development") return null;
  const expected = process.env.MURALS_ADMIN_KEY?.trim();
  if (!expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const provided = request.headers.get("x-admin-key")?.trim() ?? "";
  if (provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return null;
}
