import "server-only";

import sharp from "sharp";
import { agentImageUrl } from "@/lib/normies";

/**
 * The Normie's own picture. The public image is an SVG whose viewBox is
 * the original 40 by 40 bitmap, so that grid is preferred.
 * Returns null when the picture cannot be fetched. Callers skip it.
 */
export async function fetchNormieBitmap(tokenId: string): Promise<Buffer | null> {
  try {
    const response = await fetch(agentImageUrl(tokenId));
    if (!response.ok) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    const head = bytes.subarray(0, 180).toString("utf8");
    const isSvg =
      (response.headers.get("content-type") ?? "").includes("svg") ||
      head.includes("<svg");
    if (isSvg) {
      return sharp(bytes)
        .resize(40, 40, { kernel: sharp.kernel.nearest, fit: "fill" })
        .png()
        .toBuffer();
    }
    const meta = await sharp(bytes).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width > 0 && width <= 64 && height > 0 && height <= 64) {
      return sharp(bytes).png().toBuffer();
    }
    return sharp(bytes)
      .resize(40, 40, { kernel: sharp.kernel.nearest, fit: "fill" })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}
