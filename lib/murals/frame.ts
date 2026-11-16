export type FrameKind =
  | "print"
  | "ink"
  | "glitch"
  | "painting"
  | "schematic"
  | "craft"
  | "plain";

const PRINT =
  /\b(woodcut|linocut|etching|lithograph|screenprint|risograph)\b/i;
const INK = /\b(ink wash|sumi|charcoal|\bpen\b)\b/i;
const GLITCH = /\b(glitch|pixel|CRT|dither|datamosh)\b/i;
const PAINTING = /\b(oil|watercolor|gouache|tempera|impasto)\b/i;
const SCHEMATIC = /\b(blueprint|wireframe|schematic|chart|diagram)\b/i;
const CRAFT =
  /\b(stitch|weave|batik|mosaic|stained glass|quilt)\b/i;

/** Pick a display frame kind from style + medium keywords. */
export function frameKindFor(style: string, medium: string): FrameKind {
  const blob = `${style} ${medium}`;
  if (PRINT.test(blob)) return "print";
  if (INK.test(blob)) return "ink";
  if (GLITCH.test(blob)) return "glitch";
  if (PAINTING.test(blob)) return "painting";
  if (SCHEMATIC.test(blob)) return "schematic";
  if (CRAFT.test(blob)) return "craft";
  return "plain";
}
