export function agentOrArtworkPath(tokenId: string, hasArtwork: boolean) {
  return hasArtwork ? `/artwork/${tokenId}` : `/agent/${tokenId}`;
}

export function arenaPiecePath(tokenId: string) {
  return `/arena/${tokenId}`;
}

/** Signed by the connected wallet before a portrait is drawn. */
export function buildArenaCreateMessage(tokenId: string, issuedAt: number) {
  return `Arena Portraits: create for Normie #${tokenId}\nIssued at: ${issuedAt}`;
}

const ARENA_CREATE_MESSAGE =
  /^Arena Portraits: create for Normie #(\d+)\nIssued at: (\d+)$/;

export function readArenaCreateMessage(
  message: string
): { tokenId: string; issuedAt: number } | null {
  const match = ARENA_CREATE_MESSAGE.exec(message);
  if (!match?.[1] || !match[2]) return null;
  const issuedAt = Number(match[2]);
  if (!Number.isFinite(issuedAt)) return null;
  return { tokenId: match[1], issuedAt };
}
