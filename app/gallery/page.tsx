import { GalleryClient } from "@/app/components/gallery-client";
import {
  GALLERY_PAGE_SIZE,
  parseGalleryPage,
  parseGallerySort,
  parseGalleryView,
} from "@/lib/gallery";
import { getGalleryArtworks } from "@/lib/redis";
import { Suspense } from "react";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    page?: string;
    sort?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const view = parseGalleryView(params.view);
  const sort = parseGallerySort(params.sort);
  const page = parseGalleryPage(params.page);
  const search = params.q ?? "";
  const perPage = GALLERY_PAGE_SIZE[view];

  const result = await getGalleryArtworks({
    page,
    perPage,
    sort,
    search,
  });

  return (
    <Suspense
      fallback={
        <main className="flex-1 px-6 pt-20 pb-12">
          <h1 className="page-title uppercase text-2xl mb-10">Gallery</h1>
        </main>
      }
    >
      <GalleryClient
        artworks={result.items}
        total={result.total}
        currentPage={result.page}
        totalPages={result.totalPages}
        view={view}
        sort={sort}
        search={search}
      />
    </Suspense>
  );
}
