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

export async function persistSketchToBlob(
  sketchCode: string,
  tokenId: string
): Promise<string> {
  const { url } = await put(`artworks/${tokenId}.sketch.js`, sketchCode, {
    access: "public",
    contentType: "application/javascript",
    addRandomSuffix: true,
  });

  return url;
}

export async function fetchSketchCode(sketchUrl: string): Promise<string> {
  const res = await fetch(sketchUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch sketch code: ${res.status}`);
  }
  return res.text();
}

export async function persistThumbnailToBlob(
  buffer: Buffer,
  tokenId: string
): Promise<string> {
  const { url } = await put(`artworks/${tokenId}.thumb.png`, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: true,
  });

  return url;
}
