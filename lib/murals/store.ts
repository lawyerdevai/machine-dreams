import { del, put } from "@vercel/blob";
import { redis } from "@/lib/redis";
import { blobPath, historyKey, indexKey, itemKey, NS } from "./ns";
import type { FrameKind } from "./frame";
import type {
  MuralHistory,
  MuralItem,
  MuralKind,
  MuralMotion,
  MuralStatus,
} from "./types";
import { muralKindOf, muralMotionOf } from "./types";

function normalizeItem(item: MuralItem): MuralItem {
  return { ...item, kind: muralKindOf(item) };
}

function assertNsKey(key: string) {
  if (!key.startsWith(`${NS}:`) && !key.startsWith(`${NS}/`)) {
    throw new Error(`murals_store_refused_key_outside_ns:${key}`);
  }
}

export async function uploadMuralPng(
  id: string,
  bytes: Buffer
): Promise<string> {
  const pathname = blobPath(id);
  assertNsKey(pathname);
  const { url } = await put(pathname, bytes, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return url;
}

export async function saveMuralItem(item: MuralItem): Promise<void> {
  const key = itemKey(item.id);
  assertNsKey(key);
  const index = indexKey();
  assertNsKey(index);
  await redis.set(key, item);
  await redis.zadd(index, { score: item.createdAt, member: item.id });
}

export async function getMuralItem(id: string): Promise<MuralItem | null> {
  if (!id || /[^a-zA-Z0-9_-]/.test(id)) return null;
  const key = itemKey(id);
  assertNsKey(key);
  try {
    const item = await redis.get<MuralItem>(key);
    return item ? normalizeItem(item) : null;
  } catch {
    return null;
  }
}

/** Newest first. */
export async function listMuralItems(): Promise<MuralItem[]> {
  const index = indexKey();
  assertNsKey(index);
  try {
    const ids = (await redis.zrange(index, 0, -1, { rev: true })) as string[];
    if (!ids.length) return [];
    const keys = ids.map((id) => itemKey(String(id)));
    for (const key of keys) assertNsKey(key);
    const rows = await redis.mget<(MuralItem | null)[]>(...keys);
    const out: MuralItem[] = [];
    for (const row of rows ?? []) {
      if (row && typeof row === "object" && "id" in row) {
        out.push(normalizeItem(row));
      }
    }
    return out;
  } catch {
    return [];
  }
}

/** Highest seasonNumber among season-kind records + 1, or 1 if none. */
export function nextSeasonNumber(items: MuralItem[]): number {
  let max = 0;
  for (const item of items) {
    if (muralKindOf(item) !== "season") continue;
    if (
      typeof item.seasonNumber === "number" &&
      Number.isFinite(item.seasonNumber)
    ) {
      max = Math.max(max, Math.trunc(item.seasonNumber));
    }
  }
  return max + 1;
}

export async function updateMuralItem(
  id: string,
  patch: {
    title?: string;
    caption?: string;
    frameKind?: FrameKind;
    status?: MuralStatus;
    seasonNumber?: number;
    kind?: MuralKind;
    day?: number | null;
    /** Set motion metadata, or null to clear. */
    motion?: MuralMotion | null;
  }
): Promise<MuralItem | null> {
  const item = await getMuralItem(id);
  if (!item) return null;
  const next: MuralItem = { ...item, record: { ...item.record } };
  if (typeof patch.title === "string") {
    next.title = patch.title.trim().replace(/\s+/g, " ").slice(0, 120);
  }
  if (typeof patch.caption === "string") {
    next.caption = patch.caption.trim().replace(/\s+/g, " ").slice(0, 220);
  }
  if (patch.frameKind) next.frameKind = patch.frameKind;
  if (patch.kind === "season" || patch.kind === "moment") {
    next.kind = patch.kind;
  }
  if (
    typeof patch.seasonNumber === "number" &&
    Number.isInteger(patch.seasonNumber) &&
    patch.seasonNumber > 0
  ) {
    next.seasonNumber = patch.seasonNumber;
  }
  if (patch.day === null) {
    delete next.day;
  } else if (
    typeof patch.day === "number" &&
    Number.isInteger(patch.day) &&
    patch.day > 0
  ) {
    next.day = patch.day;
  }
  if (patch.status) {
    next.status = patch.status;
    if (patch.status === "approved") {
      next.approvedAt = Date.now();
    } else if (patch.status === "pending") {
      next.approvedAt = null;
    }
  }
  const prevMotion = muralMotionOf(item);
  if (patch.motion === null) {
    delete next.record.motion;
  } else if (patch.motion) {
    next.record.motion = patch.motion;
  }
  await saveMuralItem(next);

  // Delete the previous motion blob only after the record is saved. Never fail
  // the update if Blob delete fails (CDN may still serve old URL briefly).
  if (
    "motion" in patch &&
    prevMotion?.url &&
    prevMotion.url !== patch.motion?.url
  ) {
    try {
      await del(prevMotion.url);
    } catch {
      // Blob may already be gone or unreachable.
    }
  }

  return normalizeItem(next);
}

export async function deleteMuralItem(id: string): Promise<boolean> {
  const item = await getMuralItem(id);
  if (!item) return false;
  const key = itemKey(id);
  const index = indexKey();
  assertNsKey(key);
  assertNsKey(index);
  await redis.del(key);
  await redis.zrem(index, id);
  if (item.imageUrl) {
    try {
      await del(item.imageUrl);
    } catch {
      // Blob may already be gone; Redis cleanup still counts as delete.
    }
  }
  const motion = muralMotionOf(item);
  if (motion?.url) {
    try {
      await del(motion.url);
    } catch {
      // Blob may already be gone.
    }
  }
  return true;
}

export async function loadHistory(): Promise<MuralHistory> {
  const key = historyKey();
  assertNsKey(key);
  try {
    const raw = await redis.get<MuralHistory>(key);
    if (!raw || typeof raw !== "object") {
      return {
        usedStyles: [],
        usedPalettes: [],
        usedCompositions: [],
        usedFigures: [],
        usedBeats: [],
      };
    }
    return {
      usedStyles: Array.isArray(raw.usedStyles) ? raw.usedStyles.slice(0, 20) : [],
      usedPalettes: Array.isArray(raw.usedPalettes)
        ? raw.usedPalettes.slice(0, 8)
        : [],
      usedCompositions: Array.isArray(raw.usedCompositions)
        ? raw.usedCompositions.slice(0, 8)
        : [],
      usedFigures: Array.isArray(raw.usedFigures)
        ? raw.usedFigures.slice(0, 10)
        : [],
      usedBeats: Array.isArray(raw.usedBeats) ? raw.usedBeats.slice(0, 10) : [],
      lastSeasonId:
        typeof raw.lastSeasonId === "string" ? raw.lastSeasonId : undefined,
    };
  } catch {
    return {
      usedStyles: [],
      usedPalettes: [],
      usedCompositions: [],
      usedFigures: [],
      usedBeats: [],
    };
  }
}

export async function saveHistory(history: MuralHistory): Promise<void> {
  const key = historyKey();
  assertNsKey(key);
  await redis.set(key, {
    usedStyles: history.usedStyles.slice(0, 20),
    usedPalettes: history.usedPalettes.slice(0, 8),
    usedCompositions: history.usedCompositions.slice(0, 8),
    usedFigures: history.usedFigures.slice(0, 10),
    usedBeats: history.usedBeats.slice(0, 10),
    lastSeasonId: history.lastSeasonId,
  });
}
