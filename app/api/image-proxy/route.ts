import { NextRequest, NextResponse } from "next/server";

/** Same-origin proxy so canvas share cards can draw remote artworks / PFPs. */
const ALLOWED_HOST_SUFFIXES = [
  "public.blob.vercel-storage.com",
  "blob.vercel-storage.com",
  "api.normies.art",
] as const;

function isAllowedUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const host = url.hostname.toLowerCase();
  const ok = ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
  return ok ? url : null;
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "url required" }, { status: 400 });
  }

  const target = isAllowedUrl(raw);
  if (!target) {
    return NextResponse.json({ error: "url not allowed" }, { status: 400 });
  }

  const upstream = await fetch(target.toString(), {
    headers: { Accept: "image/*,*/*" },
    next: { revalidate: 3600 },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: "upstream fetch failed" },
      { status: 502 }
    );
  }

  const contentType = upstream.headers.get("content-type") ?? "image/png";
  const body = await upstream.arrayBuffer();

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
