import "server-only";

import sharp from "sharp";

export type CampaignCorner =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/**
 * A small taped photograph of the Normie's own bitmap.
 * No text. Nearest-neighbour, so the 40 by 40 grid stays crisp.
 */
export async function applyIdentityCard(
  image: Buffer,
  bitmap: Buffer,
  corner: CampaignCorner,
  degrees: number
): Promise<Buffer> {
  const base = await sharp(image).metadata();
  const width = base.width ?? 1024;
  const height = base.height ?? 1024;
  const photo = await sharp(bitmap)
    .resize(160, 160, { kernel: sharp.kernel.nearest, fit: "fill" })
    .extend({
      top: 12,
      bottom: 16,
      left: 12,
      right: 12,
      background: { r: 246, g: 241, b: 230, alpha: 1 },
    })
    .png()
    .toBuffer();
  const sized = await sharp(photo).metadata();
  const photoW = sized.width ?? 184;
  const tapeW = Math.max(24, Math.round(photoW * 0.38));
  const tape = await sharp({
    create: {
      width: tapeW,
      height: 16,
      channels: 4,
      background: { r: 196, g: 168, b: 92, alpha: 180 },
    },
  })
    .png()
    .toBuffer();
  const taped = await sharp(photo)
    .composite([
      { input: tape, top: 0, left: Math.round((photoW - tapeW) / 2) },
    ])
    .rotate(degrees, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const raw = await sharp(taped)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cardW = raw.info.width;
  const cardH = raw.info.height;
  const shadowRaw = Buffer.alloc(raw.data.length);
  for (let i = 0; i < cardW * cardH; i++) {
    const offset = i * 4;
    const alpha = raw.data[offset + 3] ?? 0;
    shadowRaw[offset] = 24;
    shadowRaw[offset + 1] = 18;
    shadowRaw[offset + 2] = 12;
    shadowRaw[offset + 3] = Math.round(alpha * 0.42);
  }
  const shadow = await sharp(shadowRaw, {
    raw: { width: cardW, height: cardH, channels: 4 },
  })
    .blur(7)
    .png()
    .toBuffer();
  const margin = 36;
  let left = margin;
  let top = margin;
  if (corner.endsWith("right")) left = Math.max(0, width - cardW - margin);
  if (corner.startsWith("bottom")) top = Math.max(0, height - cardH - margin);
  return sharp(image)
    .composite([
      { input: shadow, left: left + 8, top: top + 10 },
      { input: taped, left, top },
    ])
    .webp({ quality: 90 })
    .toBuffer();
}
