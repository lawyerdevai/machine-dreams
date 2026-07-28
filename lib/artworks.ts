import type { Artwork } from "./types";
import type { GalleryCategory } from "./gallery";
import { getAgentInfo } from "./normies";

export type SortOption = "newest" | "oldest";
export type TypeFilter = "ALL" | "HUMAN" | "CAT" | "ALIEN" | "AGENT";

export interface EnrichedArtwork extends Artwork {
  agentType: string;
  agentLevel: number;
}

/** Read-time defaults for legacy Redis records (no data migration). */
export function withArtworkDefaults(artwork: Artwork): Artwork {
  return {
    ...artwork,
    category: artwork.category ?? "normie",
  };
}

export function matchesArtworkCategory(
  artwork: Artwork,
  category: GalleryCategory
): boolean {
  if (category === "all") return true;
  return (artwork.category ?? "normie") === category;
}

export async function enrichArtwork(artwork: Artwork): Promise<EnrichedArtwork> {
  const base = withArtworkDefaults(artwork);

  if (base.agentType) {
    return {
      ...base,
      agentType: base.agentType,
      agentLevel: base.agentLevel ?? 1,
    };
  }

  const info = await getAgentInfo(base.tokenId);
  const canvas = info?.canvas as { level?: number } | undefined;

  return {
    ...base,
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
  {
    search,
    category = "all",
  }: { search: string; category?: GalleryCategory }
): EnrichedArtwork[] {
  let result = artworks;

  if (category !== "all") {
    result = result.filter((a) => matchesArtworkCategory(a, category));
  }

  if (!search.trim()) return result;

  const q = search.trim().toLowerCase();
  const tokenQuery = q.replace(/^#/, "");
  return result.filter(
    (a) =>
      (a.agentName ?? "").toLowerCase().includes(q) ||
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
