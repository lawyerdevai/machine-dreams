import "server-only";

import sharp from "sharp";
import { anthropic } from "@/lib/ai";
import { lookupNormie } from "./normies";

/** Raster image used for vision describe (1000×1000 PNG from Normies API). */
export function normieImagePngUrl(tokenId: number): string {
  return `https://api.normies.art/normie/${encodeURIComponent(String(tokenId))}/image.png`;
}

/** SVG compositing endpoint (also used app-wide via `agentImageUrl`). */
export function normieAgentImageSvgUrl(tokenId: number): string {
  return `https://api.normies.art/agents/image/${encodeURIComponent(String(tokenId))}`;
}

const DESCRIBE_PROMPT = `Describe only this character's visible features in plain words that work in any art style: hair, headwear, eyewear, facial hair, expression, clothing, and type if visible (Human, Cat, Alien, Agent, or Zombie). Do not mention pixels, resolution, the image medium, or art style. One or two short sentences only. Reply with the description text alone — no quotes, no JSON, no preamble.`;

const ENLARGE_PX = 512;

/**
 * Nearest-neighbor enlarge to ENLARGE_PX (contain) for Claude vision.
 * Does not persist the image.
 */
export async function enlargeForVision(bytes: Buffer): Promise<{
  png: Buffer;
  mediaType: "image/png";
}> {
  const png = await sharp(bytes)
    .ensureAlpha()
    .resize(ENLARGE_PX, ENLARGE_PX, {
      fit: "contain",
      kernel: sharp.kernel.nearest,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  return { png, mediaType: "image/png" };
}

export async function fetchNormieImageBytes(
  tokenId: number
): Promise<Buffer> {
  const pngUrl = normieImagePngUrl(tokenId);
  const pngRes = await fetch(pngUrl, { signal: AbortSignal.timeout(12000) });
  if (pngRes.ok) {
    return Buffer.from(await pngRes.arrayBuffer());
  }

  const svgUrl = normieAgentImageSvgUrl(tokenId);
  const svgRes = await fetch(svgUrl, { signal: AbortSignal.timeout(12000) });
  if (!svgRes.ok) {
    throw new Error(
      `Could not fetch Normie image for token ${tokenId} (png ${pngRes.status}, svg ${svgRes.status}).`
    );
  }
  return Buffer.from(await svgRes.arrayBuffer());
}

/**
 * Resolve a name or numeric token id to image bytes via the Normies API.
 */
export async function resolveNormieImageBytes(
  query: string
): Promise<{ tokenId: number; bytes: Buffer }> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error("Provide a name or token ID, or upload an image.");
  }

  let tokenId: number | null = null;
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (Number.isInteger(n) && n >= 0 && n <= 9999) tokenId = n;
  }

  if (tokenId == null) {
    const looked = await lookupNormie(trimmed);
    if (looked.status !== "matched") {
      throw new Error(
        looked.status === "ambiguous"
          ? `Name "${trimmed}" matches more than one Normie.`
          : looked.status === "not_found"
            ? `No Normie matched "${trimmed}". Upload an image or use a token ID.`
            : `Lookup failed for "${trimmed}".`
      );
    }
    tokenId = looked.tokenId;
  }

  const bytes = await fetchNormieImageBytes(tokenId);
  return { tokenId, bytes };
}

export async function describeCharacterFromImage(
  imageBytes: Buffer
): Promise<string> {
  const { png, mediaType } = await enlargeForVision(imageBytes);
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: png.toString("base64"),
            },
          },
          { type: "text", text: DESCRIBE_PROMPT },
        ],
      },
    ],
  });
  const block = message.content.find((part) => part.type === "text");
  const text =
    block && block.type === "text" ? block.text.trim().replace(/\s+/g, " ") : "";
  if (!text) throw new Error("Claude returned an empty description.");
  return text.slice(0, 500);
}
