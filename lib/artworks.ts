import type { Artwork } from "./types";
import { getAgentInfo } from "./normies";

export type SortOption = "newest" | "oldest";
export type TypeFilter = "ALL" | "HUMAN" | "CAT" | "ALIEN" | "AGENT";

export interface EnrichedArtwork extends Artwork {
  agentType: string;
  agentLevel: number;
}

export async function enrichArtwork(artwork: Artwork): Promise<EnrichedArtwork> {
  if (artwork.agentType) {
    return {
      ...artwork,
      agentType: artwork.agentType,
      agentLevel: artwork.agentLevel ?? 1,
    };
  }

  const info = await getAgentInfo(artwork.tokenId);
  const canvas = info?.canvas as { level?: number } | undefined;

  return {
    ...artwork,
    agentType: info?.type ?? "Unknown",
    agentLevel: canvas?.level ?? 1,
  };
}

export async function enrichArtworks(
  artworks: Artwork[]
): Promise<EnrichedArtwork[]> {
  return Promise.all(artworks.map(enrichArtwork));
}

export function filterArtworks(
  artworks: EnrichedArtwork[],
  { search }: { search: string }
): EnrichedArtwork[] {
  if (!search.trim()) return artworks;

  const q = search.trim().toLowerCase();
  const tokenQuery = q.replace(/^#/, "");
  return artworks.filter(
    (a) =>
      a.agentName.toLowerCase().includes(q) ||
      a.tokenId.toLowerCase().includes(tokenQuery)
  );
}

export function sortArtworks(
  artworks: EnrichedArtwork[],
  sort: SortOption
): EnrichedArtwork[] {
  return [...artworks].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "newest" ? bTime - aTime : aTime - bTime;
  });
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    currentPage,
    totalPages,
    total: items.length,
  };
}
