import { lowercaseName, sentenceCase, uppercaseTitle } from "@/lib/format";

/** Landscape share card — art left, credit/copy right */
const CARD_WIDTH = 1280;
const CARD_HEIGHT = 630;
const OUTER = 36;
const COL_GAP = 40;
const PFP_SIZE = 52;
const CARD_BG = "#fefefe";

export type ShareCardInput = {
  artworkImageUrl: string;
  pfpUrl: string;
  agentName: string;
  title: string;
  artistStatement: string;
  tokenId: string;
};

function proxied(url: string) {
  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

/**
 * Cut at the end of a complete sentence within `max` chars.
 * Never mid-word / mid-clause; appends … when content remains.
 */
export function truncateAtSentence(text: string, max: number): string {
  const cleaned = sentenceCase(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;

  const ends: number[] = [];
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (
      (ch === "." || ch === "!" || ch === "?") &&
      (i === cleaned.length - 1 || /\s/.test(cleaned[i + 1]!))
    ) {
      ends.push(i);
    }
  }

  const inRange = ends.filter((i) => i < max);
  if (inRange.length > 0) {
    const last = inRange[inRange.length - 1]!;
    const complete = cleaned.slice(0, last + 1).trimEnd();
    return complete.length < cleaned.length ? `${complete}…` : complete;
  }

  if (ends.length > 0 && ends[0]! <= Math.floor(max * 1.35)) {
    const complete = cleaned.slice(0, ends[0]! + 1).trimEnd();
    return complete.length < cleaned.length ? `${complete}…` : complete;
  }

  const window = cleaned.slice(0, max);
  const lastSpace = window.lastIndexOf(" ");
  const base = (lastSpace > 0 ? window.slice(0, lastSpace) : window).trimEnd();
  return `${base}…`;
}

function ellipsizeToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let line = text;
  while (line.length > 1 && ctx.measureText(`${line}…`).width > maxWidth) {
    line = line.slice(0, -1);
  }
  return `${line.trimEnd()}…`;
}

/** Wrap with no line cap — used to measure full text. */
function wrapTextFull(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      // Extremely long single word
      if (ctx.measureText(word).width > maxWidth) {
        lines.push(ellipsizeToWidth(ctx, word, maxWidth));
        current = "";
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapTextCapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const full = wrapTextFull(ctx, text, maxWidth);
  if (full.length <= maxLines) return full;
  const kept = full.slice(0, maxLines);
  kept[maxLines - 1] = ellipsizeToWidth(ctx, kept[maxLines - 1]!, maxWidth);
  return kept;
}

/**
 * Prefer full statement; only sentence-truncate if it won't fit the line budget.
 */
function fitStatement(
  ctx: CanvasRenderingContext2D,
  raw: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const full = sentenceCase(raw).replace(/\s+/g, " ").trim();
  if (!full) return [];

  ctx.font = '400 22px "Cormorant Garamond", Georgia, serif';
  let lines = wrapTextFull(ctx, full, maxWidth);
  if (lines.length <= maxLines) return lines;

  // Shrink character budget until wrapped lines fit
  let limit = Math.max(
    60,
    Math.ceil(full.length * (maxLines / lines.length))
  );
  for (let i = 0; i < 12; i++) {
    const truncated = truncateAtSentence(full, limit);
    lines = wrapTextFull(ctx, truncated, maxWidth);
    if (lines.length <= maxLines) return lines;
    limit = Math.max(40, Math.floor(limit * 0.82));
  }

  return wrapTextCapped(ctx, truncateAtSentence(full, limit), maxWidth, maxLines);
}

/**
 * Fit title on up to 2 lines by easing font size — avoid clipping when possible.
 */
function fitTitle(
  ctx: CanvasRenderingContext2D,
  raw: string,
  maxWidth: number
): { lines: string[]; fontSize: number; lineHeight: number } {
  const title = uppercaseTitle(raw);
  for (let size = 30; size >= 20; size -= 2) {
    ctx.font = `500 ${size}px "Cormorant Garamond", Georgia, serif`;
    const lines = wrapTextFull(ctx, title, maxWidth);
    if (lines.length <= 2) {
      return { lines, fontSize: size, lineHeight: size + 8 };
    }
  }
  ctx.font = '500 20px "Cormorant Garamond", Georgia, serif';
  return {
    lines: wrapTextCapped(ctx, title, maxWidth, 2),
    fontSize: 20,
    lineHeight: 28,
  };
}

async function waitForFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('500 30px "Cormorant Garamond"'),
      document.fonts.load('500 28px "Cormorant Garamond"'),
      document.fonts.load('400 22px "Cormorant Garamond"'),
      document.fonts.load('400 18px "Cormorant Garamond"'),
    ]);
  } catch {
    // Fall through to system serif stacks
  }
}

/**
 * Renders a landscape social share card (art left, info right).
 */
export async function renderShareCardPng(
  input: ShareCardInput
): Promise<Blob> {
  await waitForFonts();

  const [artImg, pfpImg] = await Promise.all([
    loadImage(proxied(input.artworkImageUrl)),
    loadImage(proxied(input.pfpUrl)),
  ]);

  const artSize = CARD_HEIGHT - OUTER * 2;
  const artX = OUTER;
  const artY = OUTER;
  const textLeft = artX + artSize + COL_GAP;
  const textWidth = CARD_WIDTH - textLeft - OUTER;

  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("Canvas unsupported");

  const titleFit = fitTitle(measure, input.title, textWidth);
  const titleBlockH = titleFit.lines.length * titleFit.lineHeight;

  // Statement gets whatever vertical room remains after credit + title, within the art band
  const creditGap = 22;
  const titleGap = 16;
  const statementLineH = 30;
  const reserved =
    PFP_SIZE + creditGap + titleBlockH + titleGap;
  const maxStatementLines = Math.max(
    3,
    Math.floor((artSize - reserved - 8) / statementLineH)
  );
  const statementLines = fitStatement(
    measure,
    input.artistStatement,
    textWidth,
    maxStatementLines
  );

  const stackH =
    PFP_SIZE +
    creditGap +
    titleBlockH +
    titleGap +
    statementLines.length * statementLineH;

  // Center the right stack within the same vertical band as the artwork
  const yStart = artY + Math.max(0, (artSize - stackH) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  ctx.fillStyle = CARD_BG;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Artwork — left, full card-band height
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(artX, artY, artSize, artSize);
  {
    const scale = Math.max(artSize / artImg.width, artSize / artImg.height);
    const w = artImg.width * scale;
    const h = artImg.height * scale;
    ctx.drawImage(
      artImg,
      artX + (artSize - w) / 2,
      artY + (artSize - h) / 2,
      w,
      h
    );
  }

  let y = yStart;

  // Attribution: PFP + name only
  ctx.drawImage(pfpImg, textLeft, y, PFP_SIZE, PFP_SIZE);
  ctx.fillStyle = "#0a0a0a";
  ctx.font = '500 28px "Cormorant Garamond", Georgia, serif';
  ctx.textBaseline = "middle";
  ctx.fillText(
    lowercaseName(input.agentName),
    textLeft + PFP_SIZE + 14,
    y + PFP_SIZE / 2
  );

  y += PFP_SIZE + creditGap;

  // Title — up to 2 lines, sized to fit
  ctx.fillStyle = "#0a0a0a";
  ctx.font = `500 ${titleFit.fontSize}px "Cormorant Garamond", Georgia, serif`;
  ctx.textBaseline = "top";
  for (const line of titleFit.lines) {
    ctx.fillText(line, textLeft, y);
    y += titleFit.lineHeight;
  }

  y += titleGap;

  // Artist statement — full text when it fits
  ctx.fillStyle = "#3d3d3d";
  ctx.font = '400 22px "Cormorant Garamond", Georgia, serif';
  for (const line of statementLines) {
    ctx.fillText(line, textLeft, y);
    y += statementLineH;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to encode PNG"));
      },
      "image/png",
      1
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function shareCardFilename(tokenId: string, title: string) {
  const slug = uppercaseTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `machine-dreams-${tokenId}${slug ? `-${slug}` : ""}.png`;
}
