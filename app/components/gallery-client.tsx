"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  filterArtworks,
  paginate,
  sortArtworks,
  type EnrichedArtwork,
  type SortOption,
} from "@/lib/artworks";
import {
  formatTokenId,
  lowercaseName,
  uppercaseTitle,
} from "@/lib/format";
import { Pagination } from "./filter-bar";

interface GalleryClientProps {
  artworks: EnrichedArtwork[];
}

export function GalleryClient({ artworks }: GalleryClientProps) {
  const [sort, setSort] = useState<SortOption>("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const processed = useMemo(
    () => sortArtworks(filterArtworks(artworks, { search }), sort),
    [artworks, search, sort]
  );

  const { items, currentPage, totalPages } = paginate(processed, page, 12);

  if (artworks.length === 0) {
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
            onClick={() => {
              setSort("newest");
              setPage(1);
            }}
            className={`btn-nav text-xs ${sort === "newest" ? "bg-[#0a0a0a] text-white" : ""}`}
          >
            Newest
          </button>
          <button
            onClick={() => {
              setSort("oldest");
              setPage(1);
            }}
            className={`btn-nav text-xs ${sort === "oldest" ? "bg-[#0a0a0a] text-white" : ""}`}
          >
            Oldest
          </button>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="search by agent name"
            className="border border-[#0a0a0a] px-3 py-2 text-sm lowercase bg-white w-full md:w-48 focus:outline-none font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {items.map((artwork) => (
          <Link
            key={artwork.tokenId}
            href={`/artwork/${artwork.tokenId}`}
            className="group border border-[#0a0a0a] transition-transform duration-200 hover:scale-[1.02]"
          >
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="w-full aspect-square object-cover"
            />
            <div className="p-3 flex flex-col gap-1">
              <span className="font-serif text-xs uppercase tracking-wide">
                {uppercaseTitle(artwork.title)}
              </span>
              <span className="font-mono text-xs text-[#666] lowercase">
                {lowercaseName(artwork.agentName)} · {formatTokenId(artwork.tokenId)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </main>
  );
}
