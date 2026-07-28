"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AgentTokenLine, TileTitle } from "@/app/components/typography";
import {
  type GalleryCategory,
  type GallerySort,
  type GalleryView,
} from "@/lib/gallery";
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

const CATEGORY_OPTIONS: { value: GalleryCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "normie", label: "Normies" },
  { value: "data-medium", label: "Data as Medium" },
  { value: "agentic", label: "Agentic" },
];

interface GalleryClientProps {
  artworks: Artwork[];
  total: number;
  currentPage: number;
  totalPages: number;
  view: GalleryView;
  sort: GallerySort;
  category: GalleryCategory;
  search: string;
}

export function GalleryClient({
  artworks,
  total,
  currentPage,
  totalPages,
  view,
  sort,
  category,
  search,
}: GalleryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  // Lock gallery to WALL on mobile — density toggles aren't useful in one column
  useEffect(() => {
    if (!isMobile || view === "wall") return;
    replaceParams({ view: "wall", page: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to viewport/view
  }, [isMobile, view]);

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

  function setCategory(next: GalleryCategory) {
    if (next === category) return;
    replaceParams({
      category: next === "all" ? null : next,
      page: null,
    });
  }

  function setPage(next: number) {
    replaceParams({ page: next <= 1 ? null : String(next) });
  }

  const effectiveView: GalleryView = isMobile ? "wall" : view;
  const trulyEmpty = total === 0 && !search && category === "all";

  if (trulyEmpty) {
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
          <div className="flex max-w-full flex-wrap items-center gap-2">
            {CATEGORY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`btn-nav text-xs max-md:px-2.5 max-md:py-1.5 ${
                  category === value ? "bg-[#0a0a0a] text-white" : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSort("newest")}
            className={`btn-nav text-xs max-md:px-2.5 max-md:py-1.5 ${sort === "newest" ? "bg-[#0a0a0a] text-white" : ""}`}
          >
            Newest
          </button>
          <button
            onClick={() => setSort("oldest")}
            className={`btn-nav text-xs max-md:px-2.5 max-md:py-1.5 ${sort === "oldest" ? "bg-[#0a0a0a] text-white" : ""}`}
          >
            Oldest
          </button>
          <div className="hidden items-center gap-2 md:flex">
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
        <p className={TYPE.status}>
          {search ? "no matching artworks." : "no artworks yet."}
        </p>
      ) : effectiveView === "wall" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-1">
          {artworks.map((artwork) => (
            <Link
              key={artwork.tokenId}
              href={`/artwork/${artwork.tokenId}`}
              className="group relative aspect-square overflow-hidden bg-[#0a0a0a]"
            >
              <Image
                src={artwork.imageUrl}
                alt={artwork.title}
                fill
                sizes="90px"
                loading="lazy"
                className="object-cover"
              />
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
        <div className={`grid ${GALLERY_VIEW_GRID[effectiveView]}`}>
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
                  sizes={GALLERY_IMAGE_SIZES[effectiveView]}
                  className="object-cover"
                />
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

      {effectiveView !== "wall" && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </main>
  );
}
