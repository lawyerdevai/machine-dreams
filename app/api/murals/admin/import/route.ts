import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { frameKindFor } from "@/lib/murals/frame";
import {
  loadHistory,
  saveHistory,
  saveMuralItem,
} from "@/lib/murals/store";
import type {
  MuralGeneratorRecord,
  MuralItem,
  MuralKind,
} from "@/lib/murals/types";
import { requireMuralsAdmin } from "../guard";

const TITLE_MAX = 120;
const CAPTION_MAX = 500;
const DETAILS_MAX_BYTES = 100_000;

function isVercelBlobHost(hostname: string): boolean {
  return (
    hostname === "public.blob.vercel-storage.com" ||
    hostname.endsWith(".public.blob.vercel-storage.com")
  );
}

function parsePositiveInt(raw: unknown): number | undefined {
  if (typeof raw === "number" && Number.isInteger(raw) && raw > 0) return raw;
  if (typeof raw === "string" && /^\d+$/.test(raw.trim())) {
    const n = Number(raw.trim());
    if (n > 0) return n;
  }
  return undefined;
}

function importStubRecord(): MuralGeneratorRecord {
  return {
    version: "v3",
    engine: "v3",
    style: "import",
    medium: "import",
    tone: "other",
    moment: "Imported mural",
    scene: "import",
    level: "",
    cast: "",
    figures: [],
    statement: "",
    flags: ["import"],
  };
}

function recordFromDetails(
  details: Record<string, unknown>
): MuralGeneratorRecord {
  const stub = importStubRecord();
  const asRecord = details as Partial<MuralGeneratorRecord>;
  return {
    ...stub,
    ...asRecord,
    figures: Array.isArray(asRecord.figures)
      ? asRecord.figures.filter((f): f is string => typeof f === "string")
      : stub.figures,
    flags: Array.isArray(asRecord.flags)
      ? asRecord.flags.filter((f): f is string => typeof f === "string")
      : stub.flags,
    version: asRecord.version === "v2" || asRecord.version === "v3"
      ? asRecord.version
      : stub.version,
    engine: asRecord.engine === "v2" || asRecord.engine === "v3"
      ? asRecord.engine
      : stub.engine,
  };
}

export async function POST(request: Request) {
  const denied = await requireMuralsAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const imageUrlRaw =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    if (!imageUrlRaw) {
      return NextResponse.json(
        { error: "imageUrl is required." },
        { status: 400 }
      );
    }

    let imageUrl: URL;
    try {
      imageUrl = new URL(imageUrlRaw);
    } catch {
      return NextResponse.json(
        { error: "imageUrl must be a valid URL." },
        { status: 400 }
      );
    }
    if (imageUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "imageUrl must use https." },
        { status: 400 }
      );
    }
    if (!isVercelBlobHost(imageUrl.hostname)) {
      return NextResponse.json(
        {
          error:
            "imageUrl host must be this project's Vercel Blob public host.",
        },
        { status: 400 }
      );
    }

    const kind: MuralKind = body.type === "season" ? "season" : "moment";
    if (body.type !== "season" && body.type !== "moment") {
      return NextResponse.json(
        { error: 'type must be "moment" or "season".' },
        { status: 400 }
      );
    }

    const day = parsePositiveInt(body.day);
    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    const caption =
      typeof body.caption === "string" ? body.caption.trim() : "";

    if (!title) {
      return NextResponse.json(
        { error: "title is required." },
        { status: 400 }
      );
    }
    if (title.length > TITLE_MAX) {
      return NextResponse.json(
        {
          error: `title is too long (${title.length}). Maximum is ${TITLE_MAX}.`,
        },
        { status: 400 }
      );
    }
    if (!caption) {
      return NextResponse.json(
        { error: "caption is required." },
        { status: 400 }
      );
    }
    if (caption.length > CAPTION_MAX) {
      return NextResponse.json(
        {
          error: `caption is too long (${caption.length}). Maximum is ${CAPTION_MAX}.`,
        },
        { status: 400 }
      );
    }

    let details: Record<string, unknown> | undefined;
    if (body.details !== undefined && body.details !== null) {
      if (
        typeof body.details !== "object" ||
        Array.isArray(body.details)
      ) {
        return NextResponse.json(
          { error: "details must be a JSON object when provided." },
          { status: 400 }
        );
      }
      const encoded = JSON.stringify(body.details);
      if (encoded.length > DETAILS_MAX_BYTES) {
        return NextResponse.json(
          { error: "details JSON is too large." },
          { status: 400 }
        );
      }
      details = body.details as Record<string, unknown>;
    }

    const head = await fetch(imageUrl.toString(), { method: "HEAD" });
    let ok = head.status === 200;
    let contentType = head.headers.get("content-type") ?? "";
    if (!ok || !contentType.startsWith("image/")) {
      const get = await fetch(imageUrl.toString(), {
        method: "GET",
        headers: { Range: "bytes=0-0" },
      });
      ok = get.status === 200 || get.status === 206;
      contentType = get.headers.get("content-type") ?? contentType;
    }
    if (!ok) {
      return NextResponse.json(
        { error: "imageUrl did not respond with HTTP 200." },
        { status: 400 }
      );
    }
    if (!contentType.toLowerCase().startsWith("image/")) {
      return NextResponse.json(
        { error: "imageUrl must return an image content type." },
        { status: 400 }
      );
    }

    const record = details ? recordFromDetails(details) : importStubRecord();
    const id = randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
    const createdAt = Date.now();
    const frameKind = frameKindFor(
      typeof record.style === "string" ? record.style : "import",
      typeof record.medium === "string" ? record.medium : "import"
    );

    const item: MuralItem = {
      id,
      status: "pending",
      title,
      caption,
      imageUrl: imageUrl.toString(),
      seasonId:
        typeof details?.seasonId === "string" && details.seasonId.trim()
          ? details.seasonId.trim()
          : "import",
      seasonName:
        typeof details?.seasonName === "string" && details.seasonName.trim()
          ? details.seasonName.trim()
          : kind === "season"
            ? "Season"
            : "Moment",
      kind,
      ...(kind === "moment" && day !== undefined ? { day } : {}),
      ...(kind === "season" && day !== undefined
        ? { seasonNumber: day }
        : {}),
      createdAt,
      approvedAt: null,
      frameKind,
      record,
    };

    await saveMuralItem(item);

    const history = await loadHistory();
    const figures = Array.isArray(record.figures) ? record.figures : [];
    const nextStyles =
      Array.isArray(record.styles) && record.styles.length > 0
        ? [...record.styles, ...history.usedStyles]
        : record.style
          ? [record.style, ...history.usedStyles]
          : history.usedStyles;
    const nextPalettes = record.palette
      ? [record.palette, ...history.usedPalettes]
      : history.usedPalettes;
    const nextCompositions = record.composition
      ? [record.composition, ...history.usedCompositions]
      : history.usedCompositions;
    const nextFigures =
      figures.length > 0
        ? [...figures, ...history.usedFigures]
        : history.usedFigures;
    const nextBeats = record.beat
      ? [record.beat, ...history.usedBeats]
      : history.usedBeats;

    await saveHistory({
      usedStyles: nextStyles.slice(0, 20),
      usedPalettes: nextPalettes.slice(0, 8),
      usedCompositions: nextCompositions.slice(0, 8),
      usedFigures: nextFigures.slice(0, 10),
      usedBeats: nextBeats.slice(0, 10),
      lastSeasonId: item.seasonId,
    });

    return NextResponse.json({ ok: true, id: item.id, item });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Import failed. Please try again.";
    console.error(`[murals] import route failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
