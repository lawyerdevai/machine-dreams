import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicMural, fetchPublicMurals } from "../public-data";
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
    if (!item) return { title: "Arena Murals" };
    return {
      title: `${item.title} | Arena Murals`,
      description: item.caption,
      openGraph: {
        title: `${item.title} | Arena Murals`,
        description: item.caption,
        images: item.imageUrl ? [{ url: item.imageUrl }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: `${item.title} | Arena Murals`,
        description: item.caption,
        images: item.imageUrl ? [item.imageUrl] : undefined,
      },
    };
  } catch {
    return { title: "Arena Murals" };
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

  const index = items.findIndex((m) => m.id === item.id);
  const newerId = index > 0 ? items[index - 1]!.id : null;
  const olderId =
    index >= 0 && index < items.length - 1 ? items[index + 1]!.id : null;

  return (
    <main className="murals-page">
      <ViewingRoomClient item={item} newerId={newerId} olderId={olderId} />
    </main>
  );
}
