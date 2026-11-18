/** Environment namespace so localhost (dev) never touches production mural keys. */
export const NS =
  process.env.NODE_ENV === "production" ? "murals" : "murals-dev";

export function itemKey(id: string) {
  return `${NS}:item:${id}`;
}

export function indexKey() {
  return `${NS}:index`;
}

export function historyKey() {
  return `${NS}:history`;
}

export function blobPath(id: string) {
  return `${NS}/${id}.png`;
}

/**
 * Legacy fixed motion path (`{NS}/{id}.mp4`). Prefer {@link newMotionBlobPath}
 * for uploads so CDN/browser caches cannot serve stale bytes after a replace.
 */
export function blobMotionPath(id: string) {
  return `${NS}/${id}.mp4`;
}

/** Unique motion pathname: `{NS}/{id}-motion-{unique}.mp4`. */
export function newMotionBlobPath(id: string): string {
  const unique = `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 10)}`;
  return `${NS}/${id}-motion-${unique}.mp4`;
}

/**
 * Accepts relative paths or full Blob URL pathnames
 * (`/{NS}/{id}.mp4`, `/{NS}/{id}-motion-{suffix}.mp4`, optionally under a store prefix).
 * Returns the mural id, or null if not a motion blob for this NS.
 */
export function muralIdFromMotionPath(pathname: string): string | null {
  const normalized = pathname.replace(/^\//, "");
  const nsPrefix = `${NS}/`;
  const nsAt = normalized.lastIndexOf(nsPrefix);
  if (nsAt < 0) return null;
  const underNs = normalized.slice(nsAt + nsPrefix.length);
  if (!underNs.endsWith(".mp4")) return null;
  const rest = underNs.slice(0, -".mp4".length);
  if (rest.includes("/")) return null;

  const uniqueMarker = "-motion-";
  const markerAt = rest.lastIndexOf(uniqueMarker);
  if (markerAt > 0) {
    const id = rest.slice(0, markerAt);
    const unique = rest.slice(markerAt + uniqueMarker.length);
    if (!id || /[^a-zA-Z0-9_-]/.test(id)) return null;
    if (!unique || /[^a-zA-Z0-9]/.test(unique)) return null;
    return id;
  }
  // Legacy fixed path.
  if (!rest || /[^a-zA-Z0-9_-]/.test(rest)) return null;
  return rest;
}

/** True when pathname is a motion object for this mural id (legacy or unique). */
export function isMotionPathForMural(pathname: string, muralId: string): boolean {
  return muralIdFromMotionPath(pathname) === muralId;
}
