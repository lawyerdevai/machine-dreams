"use client";

import { TYPE } from "@/lib/typography";

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
      <span className={TYPE.metadata}>
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
