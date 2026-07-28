export type GalleryView = "grid" | "wall";
export type GallerySort = "newest" | "oldest";
export type GalleryCategory = "all" | "normie" | "data-medium" | "agentic";

export const GALLERY_PAGE_SIZE: Record<GalleryView, number> = {
  grid: 36,
  wall: Number.MAX_SAFE_INTEGER,
};

export function parseGalleryView(value: string | null | undefined): GalleryView {
  if (value === "wall") return "wall";
  // Default is grid; legacy small/medium/large query values map to grid
  return "grid";
}

export function parseGallerySort(value: string | null | undefined): GallerySort {
  return value === "oldest" ? "oldest" : "newest";
}

export function parseGalleryCategory(
  value: string | null | undefined
): GalleryCategory {
  if (
    value === "all" ||
    value === "normie" ||
    value === "data-medium" ||
    value === "agentic"
  ) {
    return value;
  }
  return "all";
}

export function parseGalleryPage(value: string | null | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function matchesGallerySearch(
  artwork: { agentName: string; tokenId: string },
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const tokenQuery = q.replace(/^#/, "");
  return (
    (artwork.agentName ?? "").toLowerCase().includes(q) ||
    artwork.tokenId.toLowerCase().includes(tokenQuery)
  );
}
