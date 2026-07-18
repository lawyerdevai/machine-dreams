"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AgentTokenLine, TileTitle } from "@/app/components/typography";
import { type GallerySort, type GalleryView } from "@/lib/gallery";
import { lowercaseName, uppercaseTitle } from "@/lib/format";
import { TYPE } from "@/lib/typography";
import type { Artwork } from "@/lib/types";
import { Pagination } from "./filter-bar";

const GALLERY_VIEW_GRID: Record<
  Exclude<GalleryView, "wall">,
  string
> = {
  large: "grid-cols-2 md:grid-cols-4 gap-6",
  medium: "grid-cols-3 md:grid-cols-5 gap-5",
  small: "grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4",
};

const GALLERY_IMAGE_SIZES: Record<Exclude<GalleryView, "wall">, string> = {
  large: "(max-width: 768px) 50vw, 25vw",
  medium: "(max-width: 768px) 33vw, 20vw",
  small: "(max-width: 768px) 25vw, 12vw",
};

const VIEW_OPTIONS = ["small", "medium", "large", "wall"] as const;

function PlaceholderTile({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] p-2">
      <span className="truncate text-center font-serif text-[10px] uppercase leading-tight tracking-wide text-white/50">
        {uppercaseTitle(title)}
      </span>
    </div>
  );
}

interface GalleryClientProps {
  artworks: Artwork[];
  total: number;
  currentPage: number;
  totalPages: number;
  view: GalleryView;
  sort: GallerySort;
  search: string;
}

export function GalleryClient({
  artworks,
  total,
  currentPage,
  totalPages,
  view,
  sort,
  search,
}: GalleryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  function replaceParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput === search) return;
      replaceParams({ q: searchInput.trim() || null, page: null });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, search, pathname, router, searchParams]);

  function setView(next: GalleryView) {
    if (next === view) return;
    replaceParams({
      view: next === "large" ? null : next,
      page: null,
    });
  }

  function setSort(next: GallerySort) {
    if (next === sort) return;
    replaceParams({ sort: next === "newest" ? null : next, page: null });
  }

  function setPage(next: number) {
    replaceParams({ page: next <= 1 ? null : String(next) });
  }

  if (total === 0 && !search) {
    return (
      <main className="flex-1 px-6 pt-20 pb-12">
        <h1 className="page-title uppercase text-2xl mb-10">Gallery</h1>
        <p className={TYPE.status}>no artworks yet.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 pt-20 pb-12">
      <div className="flex flex-col gap-4 mb-10 md:flex-row md:items-center md:justify-between">
        <h1 className="page-title uppercase text-2xl shrink-0">Gallery</h1>
        <div className="flex flex-wrap items-center gap-3 md:gap-6">
          <button
            onClick={() => setSort("newest")}
            className={`btn-nav text-xs ${sort === "newest" ? "bg-[#0a0a0a] text-white" : ""}`}
          >
            Newest
          </button>
          <button
            onClick={() => setSort("oldest")}
            className={`btn-nav text-xs ${sort === "oldest" ? "bg-[#0a0a0a] text-white" : ""}`}
          >
            Oldest
          </button>
          <div className="flex items-center gap-2">
            {VIEW_OPTIONS.map((size) => (
              <button
                key={size}
                onClick={() => setView(size)}
                className={`btn-nav text-xs ${view === size ? "bg-[#0a0a0a] text-white" : ""}`}
              >
                {size}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="search"
            className={`${TYPE.input} w-full md:w-32`}
          />
        </div>
      </div>

      {artworks.length === 0 ? (
        <p className={TYPE.status}>no matching artworks.</p>
      ) : view === "wall" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1">
          {artworks.map((artwork) => (
            <Link
              key={artwork.tokenId}
              href={`/artwork/${artwork.tokenId}`}
              className="group relative aspect-square overflow-hidden bg-[#0a0a0a]"
            >
              {artwork.imageUrl ? (
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  sizes="90px"
                  loading="lazy"
                  className="object-cover"
                />
              ) : (
                <PlaceholderTile title={artwork.title} />
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-black/70 p-1.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <span className="truncate font-serif text-[10px] uppercase leading-tight tracking-wide text-white">
                  {uppercaseTitle(artwork.title)}
                </span>
                <span className="truncate font-serif text-[10px] leading-tight text-white/80">
                  {lowercaseName(artwork.agentName)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={`grid ${GALLERY_VIEW_GRID[view]}`}>
          {artworks.map((artwork) => (
            <Link
              key={artwork.tokenId}
              href={`/artwork/${artwork.tokenId}`}
              className="group border border-[#0a0a0a] transition-transform duration-200 hover:scale-[1.02]"
            >
              <div className="relative aspect-square w-full overflow-hidden">
                {artwork.imageUrl ? (
                  <Image
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    fill
                    sizes={GALLERY_IMAGE_SIZES[view]}
                    className="object-cover"
                  />
                ) : (
                  <PlaceholderTile title={artwork.title} />
                )}
              </div>
              <div className="p-3 flex flex-col gap-1">
                <TileTitle title={artwork.title} />
                <AgentTokenLine
                  name={artwork.agentName}
                  tokenId={artwork.tokenId}
                />
              </div>
            </Link>
          ))}
        </div>
      )}

      {view !== "wall" && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </main>
  );
}
