import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { fetchPublicMural, fetchPublicMurals } from "../public-data";
import { sortSeasonMurals } from "../public-types";
import { ViewingRoomClient } from "../viewing-room-client";
import "../murals-gallery.css";

export const revalidate = 300;

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const item = await fetchPublicMural(id);
    if (!item) return { title: "Murals" };
    return {
      title: `${item.title} | Murals`,
      description: item.caption,
      openGraph: {
        title: `${item.title} | Murals`,
        description: item.caption,
        images: item.imageUrl ? [{ url: item.imageUrl }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: `${item.title} | Murals`,
        description: item.caption,
        images: item.imageUrl ? [item.imageUrl] : undefined,
      },
    };
  } catch {
    return { title: "Murals" };
  }
}

export default async function MuralViewingRoomPage({ params }: PageProps) {
  const { id } = await params;

  let item: Awaited<ReturnType<typeof fetchPublicMural>> = null;
  let items: Awaited<ReturnType<typeof fetchPublicMurals>> = [];
  try {
    const [one, list] = await Promise.all([
      fetchPublicMural(id),
      fetchPublicMurals(),
    ]);
    item = one;
    items = list;
  } catch {
    notFound();
  }

  if (!item) notFound();

  const sameKind = items.filter((m) => m.kind === item.kind);
  const ordered =
    item.kind === "season" ? sortSeasonMurals(sameKind) : sameKind;

  const index = ordered.findIndex((m) => m.id === item.id);
  const newerId = index > 0 ? ordered[index - 1]!.id : null;
  const olderId =
    index >= 0 && index < ordered.length - 1 ? ordered[index + 1]!.id : null;

  const galleryHref =
    item.kind === "season" ? "/murals?tab=seasons" : "/murals?tab=moments";

  return (
    <main className="murals-page">
      <Suspense fallback={null}>
        <ViewingRoomClient
          item={item}
          newerId={newerId}
          olderId={olderId}
          galleryHref={galleryHref}
        />
      </Suspense>
    </main>
  );
}
