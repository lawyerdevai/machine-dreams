import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { blobMotionPath, NS } from "@/lib/murals/ns";
import { getMuralItem } from "@/lib/murals/store";
import { requireMuralsAdmin } from "../guard";

/** 6 MB client + token ceiling for motion clips. */
const MAX_BYTES = 6 * 1024 * 1024;

function parseMuralId(pathname: string, clientPayload: string | null): string | null {
  const expectedPrefix = `${NS}/`;
  const expectedSuffix = ".mp4";
  if (!pathname.startsWith(expectedPrefix) || !pathname.endsWith(expectedSuffix)) {
    return null;
  }
  const id = pathname.slice(expectedPrefix.length, -expectedSuffix.length);
  if (!id || /[^a-zA-Z0-9_-]/.test(id)) return null;
  if (pathname !== blobMotionPath(id)) return null;
  if (clientPayload && clientPayload !== id) return null;
  return id;
}

/**
 * Client upload token route for mural motion mp4s.
 * Auth: same x-admin-key guard as other admin routes (fail closed, rate limit).
 * Completion callback is a no-op — admin UI PATCHes motion onto the record after upload
 * (onUploadCompleted often does not fire on localhost).
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.type === "blob.generate-client-token") {
    const denied = await requireMuralsAdmin(request);
    if (denied) return denied;
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const id = parseMuralId(pathname, clientPayload);
        if (!id) {
          throw new Error("Invalid motion pathname.");
        }
        const item = await getMuralItem(id);
        if (!item) {
          throw new Error("Mural not found.");
        }
        return {
          allowedContentTypes: ["video/mp4"],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: false,
          allowOverwrite: true,
          tokenPayload: JSON.stringify({ id }),
        };
      },
      onUploadCompleted: async () => {
        // Record update happens via admin PATCH after the client reads video metadata.
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Motion upload token failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
