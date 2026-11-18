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

export function blobMotionPath(id: string) {
  return `${NS}/${id}.mp4`;
}
