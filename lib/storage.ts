import { put } from "@vercel/blob";

export async function persistImageToBlob(
  replicateUrl: string,
  tokenId: string,
  folder: "artworks" | "arena" = "artworks"
): Promise<string> {
  const res = await fetch(replicateUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch image from Replicate: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const { url } = await put(`${folder}/${tokenId}.webp`, buffer, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: true,
  });

  return url;
}

/** Arena finishes the bitmap in memory, then stores that buffer. */
export async function persistImageBuffer(
  buffer: Buffer,
  tokenId: string,
  folder: "arena"
): Promise<string> {
  const { url } = await put(`${folder}/${tokenId}.webp`, buffer, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: true,
  });
  return url;
}
