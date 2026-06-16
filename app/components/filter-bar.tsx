"use client";

import type { SortOption } from "@/lib/artworks";

interface FilterBarProps {
  sort: SortOption;
  search: string;
  onSortChange: (sort: SortOption) => void;
  onSearchChange: (search: string) => void;
}

export function FilterBar({
  sort,
  search,
  onSortChange,
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSortChange("newest")}
          className={`btn-nav text-xs ${sort === "newest" ? "bg-[#0a0a0a] text-white" : ""}`}
        >
          Newest
        </button>
        <button
          onClick={() => onSortChange("oldest")}
          className={`btn-nav text-xs ${sort === "oldest" ? "bg-[#0a0a0a] text-white" : ""}`}
        >
          Oldest
        </button>
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="search by agent name"
        className="border border-[#0a0a0a] px-3 py-2 text-sm lowercase bg-white w-full md:w-48 focus:outline-none"
      />
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-center gap-4 mt-10">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="btn-nav text-xs disabled:opacity-30"
      >
        Prev
      </button>
      <span className="text-xs lowercase text-[#666]">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="btn-nav text-xs disabled:opacity-30"
      >
        Next
      </button>
    </div>
  );
}
