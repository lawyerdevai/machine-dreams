export function agentOrArtworkPath(tokenId: string, hasArtwork: boolean) {
  return hasArtwork ? `/artwork/${tokenId}` : `/agent/${tokenId}`;
}
