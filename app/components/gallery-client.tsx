"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type GallerySort,
  type GalleryView,
} from "@/lib/gallery";
import {
  formatTokenId,
  lowercaseName,
  uppercaseTitle,
} from "@/lib/format";
import type { Artwork } from "@/lib/types";
import { Pagination } from "./filter-bar";

const GALLERY_VIEW_GRID: Record<GalleryView, string> = {
  large: "grid-cols-2 md:grid-cols-4 gap-6",
  medium: "grid-cols-3 md:grid-cols-5 gap-5",
  small: "grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4",
};

const GALLERY_IMAGE_SIZES: Record<GalleryView, string> = {
  large: "(max-width: 768px) 50vw, 25vw",
  medium: "(max-width: 768px) 33vw, 20vw",
  small: "(max-width: 768px) 25vw, 12vw",
};

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
      <main className="flex-1 px-6 py-12">
        <h1 className="page-title uppercase text-2xl mb-10">Gallery</h1>
        <p className="font-mono text-[#666] text-sm lowercase">no artworks yet.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-12">
      <div className="flex flex-col gap-4 mb-10 md:flex-row md:items-center md:justify-between">
        <h1 className="page-title uppercase text-2xl shrink-0">Gallery</h1>
        <div className="flex flex-wrap items-center gap-3 md:gap-6 font-mono">
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
            {(["small", "medium", "large"] as const).map((size) => (
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
            placeholder="Search"
            className="border border-[#0a0a0a] px-3 py-2 text-sm lowercase bg-white w-full md:w-32 focus:outline-none font-mono"
          />
        </div>
      </div>

      {artworks.length === 0 ? (
        <p className="font-mono text-[#666] text-sm lowercase">
          no matching artworks.
        </p>
      ) : (
        <div className={`grid ${GALLERY_VIEW_GRID[view]}`}>
          {artworks.map((artwork) => (
            <Link
              key={artwork.tokenId}
              href={`/artwork/${artwork.tokenId}`}
              className="group border border-[#0a0a0a] transition-transform duration-200 hover:scale-[1.02]"
            >
              <div className="relative aspect-square w-full overflow-hidden">
                <Image
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  fill
                  sizes={GALLERY_IMAGE_SIZES[view]}
                  className="object-cover"
                />
              </div>
              <div className="p-3 flex flex-col gap-1">
                <span className="font-serif text-xs uppercase tracking-wide">
                  {uppercaseTitle(artwork.title)}
                </span>
                <span className="font-mono text-xs text-[#666] lowercase">
                  {lowercaseName(artwork.agentName)} ·{" "}
                  {formatTokenId(artwork.tokenId)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </main>
  );
}
