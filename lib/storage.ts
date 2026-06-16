import { put } from "@vercel/blob";

export async function persistImageToBlob(
  replicateUrl: string,
  tokenId: string
): Promise<string> {
  const res = await fetch(replicateUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image from Replicate: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const { url } = await put(`artworks/${tokenId}.webp`, buffer, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: true,
  });

  return url;
}
