export type GalleryView = "small" | "medium" | "large";
export type GallerySort = "newest" | "oldest";

export const GALLERY_PAGE_SIZE: Record<GalleryView, number> = {
  small: 48,
  medium: 24,
  large: 12,
};

export function parseGalleryView(value: string | null | undefined): GalleryView {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }
  return "large";
}

export function parseGallerySort(value: string | null | undefined): GallerySort {
  return value === "oldest" ? "oldest" : "newest";
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
    artwork.agentName.toLowerCase().includes(q) ||
    artwork.tokenId.toLowerCase().includes(tokenQuery)
  );
}
