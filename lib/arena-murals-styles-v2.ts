export type MuralStyleLaneV2 = {
  id: string;
  name: string;
  kind: "traditional" | "digital";
  /** Visible signatures that make the medium unmistakable. */
  marks?: string;
};

/**
 * v2 style lanes. Same pool as v1, with craft marks on key media.
 * v1 keeps reading lib/arena-murals-styles.ts.
 */
export const MURAL_STYLE_LANES_V2: readonly MuralStyleLaneV2[] = [
  // Traditional
  { id: "woodcut", name: "woodcut", kind: "traditional" },
  { id: "linocut", name: "linocut", kind: "traditional" },
  { id: "risograph", name: "risograph", kind: "traditional" },
  { id: "screenprint", name: "screenprint", kind: "traditional" },
  { id: "ukiyo-e", name: "ukiyo-e", kind: "traditional" },
  { id: "gouache", name: "gouache", kind: "traditional" },
  { id: "oil-impasto", name: "oil impasto", kind: "traditional" },
  { id: "clean-watercolor", name: "clean watercolor", kind: "traditional" },
  { id: "ink-wash", name: "ink wash", kind: "traditional" },
  { id: "tempera", name: "tempera", kind: "traditional" },
  { id: "charcoal", name: "charcoal", kind: "traditional" },
  { id: "pastel", name: "pastel", kind: "traditional" },
  {
    id: "cut-paper-collage",
    name: "cut-paper collage",
    kind: "traditional",
    marks: "torn and cut flat shapes, visible overlaps",
  },
  {
    id: "mosaic-painting",
    name: "mosaic painting",
    kind: "traditional",
    marks: "visible small tiles with grout gaps",
  },
  {
    id: "stained-glass",
    name: "stained glass",
    kind: "traditional",
    marks: "thick dark lead lines, jewel-color flat panes",
  },
  {
    id: "tapestry-weave",
    name: "tapestry weave",
    kind: "traditional",
    marks: "visible woven thread grid, stepped edges, no smooth gradients",
  },
  {
    id: "batik",
    name: "batik",
    kind: "traditional",
    marks: "cracked wax lines, dye pooling, resist outlines",
  },
  { id: "cyanotype", name: "cyanotype", kind: "traditional" },
  { id: "etching", name: "etching", kind: "traditional" },
  { id: "lithograph", name: "lithograph", kind: "traditional" },
  { id: "folk-painting", name: "folk painting", kind: "traditional" },
  { id: "icon-painting", name: "icon painting", kind: "traditional" },
  { id: "art-nouveau-poster", name: "art nouveau poster", kind: "traditional" },
  {
    id: "constructivist-poster",
    name: "constructivist poster",
    kind: "traditional",
  },
  { id: "expressionist", name: "expressionist", kind: "traditional" },
  { id: "cubist", name: "cubist", kind: "traditional" },
  { id: "pointillist", name: "pointillist", kind: "traditional" },
  {
    id: "picture-book-illustration",
    name: "picture-book illustration",
    kind: "traditional",
  },
  { id: "comic-halftone", name: "comic book halftone", kind: "traditional" },
  { id: "xerox-photocopy", name: "xerox photocopy grain", kind: "traditional" },
  {
    id: "rubber-stamp",
    name: "rubber-stamp field",
    kind: "traditional",
    marks: "stamped ink edges, repeating impressions",
  },
  {
    id: "embroidery-sampler",
    name: "embroidery sampler",
    kind: "traditional",
    marks: "visible stitches, thread texture, flat thread colors",
  },
  {
    id: "shadow-puppet",
    name: "shadow-puppet silhouette",
    kind: "traditional",
    marks: "flat black cutout shapes, jointed limbs, backlit cloth color field",
  },
  {
    id: "sand-painting",
    name: "sand-painting pattern",
    kind: "traditional",
    marks: "granular texture, flat earth colors",
  },
  {
    id: "paper-cut-silhouette",
    name: "paper-cut silhouette",
    kind: "traditional",
    marks: "hard cut edges, flat layered paper",
  },
  { id: "newspaper-collage", name: "newspaper collage", kind: "traditional" },
  {
    id: "cross-stitch-chart",
    name: "cross-stitch chart",
    kind: "traditional",
    marks: "square X stitches on a visible grid",
  },
  {
    id: "tin-toy-print",
    name: "tin-toy print",
    kind: "traditional",
    marks:
      "flat litho colors, rivets or crimped edges only as marks in the picture",
  },

  // Digital / non-painterly
  { id: "pixel-art", name: "pixel art", kind: "digital" },
  { id: "1-bit-dither", name: "1-bit dither", kind: "digital" },
  { id: "glitch-datamosh", name: "glitch/datamosh", kind: "digital" },
  { id: "flat-vector", name: "flat vector", kind: "digital" },
  { id: "low-poly", name: "low-poly", kind: "digital" },
  { id: "voxel", name: "voxel", kind: "digital" },
  { id: "crt-scanline", name: "CRT scanline", kind: "digital" },
  { id: "isometric-game", name: "isometric game art", kind: "digital" },
  { id: "ps1-era-3d", name: "PS1-era 3D", kind: "digital" },
  { id: "data-corruption", name: "data-corruption", kind: "digital" },
  { id: "chalkboard-diagram", name: "chalkboard diagram", kind: "digital" },
  { id: "transit-map", name: "transit-map schematic", kind: "digital" },
  { id: "blueprint", name: "blueprint linework", kind: "digital" },
  {
    id: "topographic-contour",
    name: "topographic contour chart",
    kind: "digital",
  },
  { id: "circuit-board", name: "circuit-board silk", kind: "digital" },
  { id: "led-matrix", name: "LED matrix grid", kind: "digital" },
  { id: "wireframe", name: "wireframe schematic", kind: "digital" },
  { id: "punch-card", name: "punch-card pattern", kind: "digital" },
  { id: "barcode-field", name: "barcode stripe field", kind: "digital" },
  { id: "vinyl-sticker", name: "vinyl sticker flat", kind: "digital" },
  { id: "enamel-sign", name: "enamel-sign flat color", kind: "digital" },
  {
    id: "knit-chart",
    name: "knit-chart diagram",
    kind: "digital",
    marks: "square knit-stitch grid",
  },
] as const;

export type StyleDirectionV2 =
  | { mode: "one"; lanes: [MuralStyleLaneV2]; label: string }
  | { mode: "hybrid"; lanes: [MuralStyleLaneV2, MuralStyleLaneV2]; label: string }
  | { mode: "invent"; lanes: []; label: string };

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function availableLanes(usedStyles: string[]): MuralStyleLaneV2[] {
  const blocked = new Set(
    usedStyles.slice(0, 8).map(normalize).filter(Boolean)
  );
  const pool = MURAL_STYLE_LANES_V2.filter((lane) => {
    const name = normalize(lane.name);
    const id = normalize(lane.id);
    for (const used of blocked) {
      if (!used) continue;
      if (used === name || used === id) return false;
      if (used.includes(name) || name.includes(used)) return false;
    }
    return true;
  });
  return pool.length > 0 ? pool : [...MURAL_STYLE_LANES_V2];
}

function pickLane(pool: MuralStyleLaneV2[]): MuralStyleLaneV2 {
  return (
    pool[Math.floor(Math.random() * pool.length)] ?? MURAL_STYLE_LANES_V2[0]!
  );
}

/** Collect marks from whichever lanes in the direction have them. */
export function styleMarksOf(direction: StyleDirectionV2): string | null {
  const parts = direction.lanes
    .map((lane) => lane.marks?.trim())
    .filter((marks): marks is string => Boolean(marks));
  if (parts.length === 0) return null;
  return parts.join("; ");
}

/**
 * 60% one lane, 25% hybrid of two, 15% invent a new medium.
 * Excludes the last 8 used style strings when choosing lanes.
 */
export function pickStyleDirection(usedStyles: string[] = []): StyleDirectionV2 {
  const pool = availableLanes(usedStyles);
  const roll = Math.random();

  if (roll < 0.15) {
    return {
      mode: "invent",
      lanes: [],
      label:
        "Invent a medium that does not exist yet; name it and commit to it fully.",
    };
  }

  if (roll < 0.4 && pool.length >= 2) {
    const first = pickLane(pool);
    const rest = pool.filter((lane) => lane.id !== first.id);
    const second = pickLane(rest.length > 0 ? rest : pool);
    return {
      mode: "hybrid",
      lanes: [first, second],
      label: `${first.name} + ${second.name} hybrid`,
    };
  }

  const one = pickLane(pool);
  return {
    mode: "one",
    lanes: [one],
    label: one.name,
  };
}
