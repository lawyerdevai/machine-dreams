export type ArenaIngredientId =
  | "ink"
  | "rust"
  | "neon"
  | "cel"
  | "pixel"
  | "glitch"
  | "photocopy"
  | "riso"
  | "static";

export type ArenaIngredient = {
  id: ArenaIngredientId;
  name: string;
  weight: number;
  descriptor: string;
  /** Applied in code after the image is drawn. */
  post: "pixel" | "glitch" | "photocopy" | "riso" | "static" | null;
};

export const ARENA_INGREDIENTS: readonly ArenaIngredient[] = [
  {
    id: "ink",
    name: "Ink",
    weight: 25,
    descriptor:
      "Monochromatic ink brush painting on textured cream rice paper, traditional Japanese sumi-e technique with modern aggressive energy, controlled violent brushwork against deliberate empty space, ink splatter and flicks, a thin brushed ground line.",
    post: null,
  },
  {
    id: "rust",
    name: "Rust",
    weight: 25,
    descriptor:
      "Abstract painterly science fiction: a lone fighter braced against a colossal rusted machine, built from a few big slabs and loose thick oil-paint strokes, a limited palette, hazy depth, very little fine detail, strong silhouette, large areas of empty sky or ground.",
    post: null,
  },
  {
    id: "neon",
    name: "Neon",
    weight: 18,
    descriptor:
      "Abstract cyberpunk night: the fighter is a dark silhouette cut out by streaks of glowing light and drifting haze, limited palette of near-black with one or two glowing colours, rain-streaked air, no street or building detail, large areas of darkness. Any signage is abstract glowing shapes only.",
    post: null,
  },
  {
    id: "cel",
    name: "Cel",
    weight: 17,
    descriptor:
      "Bold screenprint-style anime action illustration: thick graphic linework, flat colour shapes with no gradients, three flat colours plus paper white, halftone dots, dramatic speed lines and an impact burst, minimal background.",
    post: null,
  },
  {
    id: "pixel",
    name: "Pixel",
    weight: 10,
    descriptor:
      "Simple fighting-game character art: bold flat colour shapes, strong readable silhouette, a few colours only, no fine detail, no gradients.",
    post: "pixel",
  },
  {
    id: "glitch",
    name: "Glitch",
    weight: 5,
    descriptor:
      "A fighter as a silhouette of smeared, sliced digital data, very high contrast, large empty dark areas.",
    post: "glitch",
  },
  {
    id: "photocopy",
    name: "Photocopy",
    weight: 14,
    descriptor:
      "Photocopied and re-photocopied until the fighter breaks into harsh grain and toner streaks, black on dirty white paper, crushed contrast, uneven toner, smears and broken scan lines.",
    post: "photocopy",
  },
  {
    id: "riso",
    name: "Riso",
    weight: 12,
    descriptor:
      "A two-colour risograph print, badly misregistered, grainy overprinted ink, big flat blocks of colour, rough edges, visible paper texture.",
    post: "riso",
  },
  {
    id: "static",
    name: "Static",
    weight: 8,
    descriptor:
      "The fighter half-dissolved into television noise and horizontal tearing, signal-dropout bands, colour fringing, mostly noise with a fighter barely resolved.",
    post: "static",
  },
] as const;

const BIAS: Record<string, Partial<Record<ArenaIngredientId, number>>> = {
  zombie: { rust: 1.6, ink: 1.2, glitch: 1.5, static: 1.4, photocopy: 1.4 },
  agent: { neon: 1.6, pixel: 1.5, glitch: 1.5 },
  alien: { neon: 1.6, glitch: 1.8, pixel: 1.2, static: 1.3, photocopy: 1.3 },
  cat: { cel: 1.6, pixel: 1.6, ink: 1.2 },
};

export function isArenaIngredientId(
  value: string | null | undefined
): value is ArenaIngredientId {
  return ARENA_INGREDIENTS.some((item) => item.id === value);
}

export function arenaIngredient(id: ArenaIngredientId): ArenaIngredient {
  const found = ARENA_INGREDIENTS.find((item) => item.id === id);
  if (!found) throw new Error("unknown ingredient");
  return found;
}

export function ingredientWeight(id: ArenaIngredientId, type: string): number {
  const base = arenaIngredient(id).weight;
  const mult = BIAS[type.trim().toLowerCase()]?.[id] ?? 1;
  return base * mult;
}

/** "Ink + Glitch", or "Rust" when there is no accent. */
export function arenaRecipeLabel(
  primary: ArenaIngredientId | undefined,
  accents: readonly ArenaIngredientId[] | undefined
): string {
  if (!primary || !isArenaIngredientId(primary)) return "";
  const names = [arenaIngredient(primary).name];
  for (const accent of accents ?? []) {
    if (isArenaIngredientId(accent)) names.push(arenaIngredient(accent).name);
  }
  return names.join(" + ");
}
