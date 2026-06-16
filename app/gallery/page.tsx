import { getValidArtworks } from "@/lib/redis";
import { enrichArtworks } from "@/lib/artworks";
import { GalleryClient } from "@/app/components/gallery-client";

export default async function GalleryPage() {
  const artworks = await enrichArtworks(await getValidArtworks());
  return <GalleryClient artworks={artworks} />;
}
