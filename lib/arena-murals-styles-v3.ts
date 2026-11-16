export type StyleEntryV3 = {
  name: string;
  category: string;
  marks?: string;
};

export type MixLevelV3 = "pure" | "light" | "mixed" | "lots" | "invent";

export type StyleMixV3 = {
  mixLevel: MixLevelV3;
  styles: string[];
  palette: string | null;
  composition: string | null;
  texture: string | null;
  startingDirection: string;
  styleMarks: string | null;
};


export const PAINTING: readonly string[] = [
  "clean watercolor",
  "wet-on-wet watercolor",
  "gouache",
  "oil impasto",
  "alla prima oil",
  "palette-knife oil",
  "glazed oil",
  "tempera",
  "egg tempera",
  "encaustic",
  "casein",
  "flat acrylic",
  "ink wash",
  "sumi-e",
  "fauvist",
  "expressionist",
  "impressionist",
  "post-impressionist",
  "pointillist",
  "cubist",
  "futurist",
  "suprematist",
  "constructivist",
  "bauhaus",
  "de stijl",
  "surrealist",
  "symbolist",
  "art nouveau",
  "art deco",
  "vorticist",
  "tonalist",
  "color field with figures",
  "hard-edge painting",
  "naive art",
  "folk painting",
  "outsider art",
  "social realist mural style",
  "regionalist",
  "precisionist",
  "metaphysical painting",
  "orphism",
  "rayonism",
  "nabis",
  "synthetism",
  "cloisonnism",
] as const;

export const DRAWING: readonly string[] = [
  "charcoal",
  "conte crayon",
  "graphite",
  "silverpoint",
  "pen and ink crosshatch",
  "stipple",
  "ballpoint pen",
  "brush pen",
  "soft pastel",
  "oil pastel",
  "wax crayon",
  "colored pencil",
  "marker",
  "scratchboard",
  "chalk on black",
  "blind contour line",
  "single continuous line",
  "ink blot and line",
] as const;

export const PRINT: readonly string[] = [
  "woodcut",
  "wood engraving",
  "linocut",
  "reduction linocut",
  "ukiyo-e",
  "mokuhanga",
  "etching",
  "aquatint",
  "drypoint",
  "mezzotint",
  "lithograph",
  "risograph",
  "misregistered risograph",
  "screenprint",
  "monotype",
  "collagraph",
  "cyanotype",
  "photogram silhouette",
  "pochoir stencil",
  "mimeograph",
  "halftone newsprint",
  "potato print",
  "rubber stamp print",
  "chine-colle",
  "relief print with wood grain",
] as const;

export const CRAFT_AS_STYLE: readonly string[] = [
  "cross-stitch",
  "embroidery",
  "quilt patchwork",
  "tapestry weave",
  "kilim pattern",
  "batik",
  "shibori",
  "ikat",
  "applique",
  "felt",
  "beadwork",
  "mosaic",
  "stained glass",
  "cloisonne enamel",
  "marquetry",
  "paper cut",
  "papel picado",
  "cut-paper collage",
  "torn-paper collage",
  "quilling",
  "sand painting",
  "lacquer painting",
  "azulejo tile",
  "sgraffito",
  "pyrography",
  "rug hooking",
  "macrame knot pattern",
  "woven basket pattern",
] as const;

export const ILLUSTRATION_AND_GRAPHIC: readonly string[] = [
  "picture-book illustration",
  "golden-age book illustration",
  "ligne claire comics",
  "manga screentone",
  "mid-century modern illustration",
  "WPA poster style",
  "Polish poster school",
  "Swiss graphic style",
  "vintage travel poster style",
  "botanical plate",
  "scientific diagram",
  "cartographic map style",
  "blueprint",
  "heraldic",
  "isotype pictogram",
  "flat vector",
  "cutout animation",
  "cel animation",
  "rotoscope",
  "storyboard sketch",
  "children's crayon drawing",
  "chalkboard drawing",
  "matchbox label art",
  "playing-card court style",
  "fashion illustration",
  "architectural rendering in ink",
  "courtroom sketch",
  "field-notebook sketch",
] as const;

export const DIGITAL: readonly string[] = [
  "8-bit pixel art",
  "16-bit pixel art",
  "1-bit dither",
  "four-tone handheld palette",
  "ANSI block art",
  "glitch",
  "datamosh",
  "pixel sorting",
  "CRT scanline",
  "VHS tracking",
  "vaporwave",
  "low-poly",
  "voxel",
  "isometric game art",
  "PS1-era 3D",
  "wireframe vector",
  "oscilloscope trace",
  "pen-plotter drawing",
  "generative line field",
  "cellular automata",
  "moire",
  "thermal-camera palette",
  "infrared",
  "x-ray",
  "heat map",
  "topographic contour",
  "point cloud",
  "cel-shaded",
  "early paint-program art",
  "LED matrix",
  "e-ink",
  "teletext blocks",
  "fax",
  "photocopy",
  "scanner drag",
  "bitmap fill patterns",
  "early computer plotter art",
  "vector arcade",
  "demoscene",
] as const;

export const HISTORIC_TRADITIONS: readonly string[] = [
  "cave pigment",
  "petroglyph",
  "Egyptian register painting",
  "Greek black-figure",
  "Greek red-figure",
  "Roman mosaic",
  "Byzantine icon",
  "Romanesque",
  "Gothic panel",
  "Celtic interlace",
  "Mesoamerican codex",
  "Ethiopian icon",
  "Persian miniature",
  "Mughal miniature",
  "Chinese gongbi",
  "Chinese ink landscape",
  "Japanese yamato-e",
  "Korean minhwa",
  "Madhubani",
  "Warli",
  "Pattachitra",
  "Kalamkari",
  "Balinese painting",
  "Haitian painting",
  "Russian lubok",
  "Mexican retablo",
  "Otomi pattern",
  "Scandinavian rosemaling",
  "Polish wycinanki",
  "Petrykivka",
  "Ndebele pattern",
  "Tibetan thangka",
] as const;

export const PALETTES: readonly string[] = [
  "two-color only",
  "monochrome with one accent",
  "earth pigments",
  "neon on black",
  "faded pastels",
  "primary colors only",
  "cold blues and greys",
  "hot reds and ochres",
  "black and white",
  "sepia",
  "acid greens and violets",
  "gold and indigo",
  "oxblood and cream",
  "teal and coral",
  "mustard and charcoal",
  "pink and forest green",
  "lead grey and signal orange",
  "ultramarine and bone",
  "bruised purples and lime",
  "rust and turquoise",
  "ink black on raw cream",
  "fluorescent yellow and navy",
  "olive and salmon",
  "copper and verdigris",
  "ice blues with one red",
  "sunset oranges and pinks in flat bands",
  "four-ink print palette",
  "misregistered cyan magenta yellow",
  "phosphor green on black",
  "amber on black",
  "white on blueprint blue",
  "Venetian reds and golds",
  "smoke greys with one yellow",
  "deep sea blues with one pale cyan",
  "autumn leaf palette",
  "candy pastels with black outlines",
  "desaturated military greens",
  "tarnished silver and rust",
  "cream tan and brick",
  "jewel tones on black",
  "sun-bleached washed-out colors",
] as const;

export const COMPOSITIONS: readonly string[] = [
  "figure very small in a large field",
  "extreme close-up",
  "bird's-eye view",
  "side-on like a frieze",
  "crowd with one figure singled out",
  "two figures facing each other",
  "a single object standing for the event",
  "view from behind the figure",
  "split into two halves",
  "diagonal action across the frame",
  "symmetrical and still",
  "cropped so the subject leaves the frame",
  "worm's-eye view looking up",
  "radiating lines from a central figure",
  "triangle with a figure at the apex",
  "figures stacked vertically",
  "a long horizontal procession",
  "a spiral of figures",
  "figures arranged in a circle",
  "one huge figure and many tiny ones",
  "only hands and an object",
  "a silhouette against flat color",
  "tilted horizon",
  "overlapping layered flat planes",
  "repeated figure in sequence like a motion study",
  "vast negative space with a small cluster at one edge",
  "a figure falling through the frame",
  "a figure and its shadow as separate shapes",
  "figures scattered across an open field",
  "a tall narrow slice of action",
  "an extra-wide strip with empty sky",
  "a figure seen through a gap between two large shapes",
  "a mirrored pair",
  "chaotic scatter with one still point",
  "concentric rings around an event",
  "a descending staircase of figures",
  "off-center with a vast empty half",
  "silhouetted foreground shapes with action behind",
  "overhead flat plane like a map",
  "two groups meeting at the center",
  "one figure facing away from many",
  "a figure reaching toward the edge of the frame",
] as const;

export const TEXTURES: readonly string[] = [
  "clean flat edges",
  "rough ragged edges",
  "visible brush strokes",
  "dry-brush scumble",
  "hatching and crosshatching",
  "stippled dots",
  "halftone dot screen",
  "grainy noise",
  "scratchy line",
  "thick outlines",
  "no outlines with shapes only",
  "pixel grid",
  "scanlines",
  "paper-fibre grain",
  "woodgrain print",
  "cracked paint",
  "misregistered layers",
  "ink bleed",
  "splatter and spray",
  "dripping",
  "smudged charcoal",
  "stencil edges",
  "torn shapes",
  "layered translucent washes",
  "hard geometric facets",
  "repeating pattern fills",
  "patterned clothing and ground",
  "thick impasto ridges",
  "fine engraved lines",
  "rubbed-through crayon texture",
  "blotchy sponge texture",
  "dense tiny marks",
  "large simple flat shapes",
] as const;

export const STYLE_CATEGORIES = {
  PAINTING,
  DRAWING,
  PRINT,
  "CRAFT-AS-STYLE": CRAFT_AS_STYLE,
  "ILLUSTRATION AND GRAPHIC": ILLUSTRATION_AND_GRAPHIC,
  DIGITAL,
  "HISTORIC TRADITIONS": HISTORIC_TRADITIONS,
} as const;

export const ALL_STYLES: readonly StyleEntryV3[] = [

  // PAINTING
  { name: "clean watercolor", category: "PAINTING" },
  { name: "wet-on-wet watercolor", category: "PAINTING" },
  { name: "gouache", category: "PAINTING" },
  { name: "oil impasto", category: "PAINTING" },
  { name: "alla prima oil", category: "PAINTING" },
  { name: "palette-knife oil", category: "PAINTING" },
  { name: "glazed oil", category: "PAINTING" },
  { name: "tempera", category: "PAINTING" },
  { name: "egg tempera", category: "PAINTING" },
  { name: "encaustic", category: "PAINTING" },
  { name: "casein", category: "PAINTING" },
  { name: "flat acrylic", category: "PAINTING" },
  { name: "ink wash", category: "PAINTING" },
  { name: "sumi-e", category: "PAINTING" },
  { name: "fauvist", category: "PAINTING" },
  { name: "expressionist", category: "PAINTING" },
  { name: "impressionist", category: "PAINTING" },
  { name: "post-impressionist", category: "PAINTING" },
  { name: "pointillist", category: "PAINTING" },
  { name: "cubist", category: "PAINTING" },
  { name: "futurist", category: "PAINTING" },
  { name: "suprematist", category: "PAINTING" },
  { name: "constructivist", category: "PAINTING" },
  { name: "bauhaus", category: "PAINTING" },
  { name: "de stijl", category: "PAINTING" },
  { name: "surrealist", category: "PAINTING" },
  { name: "symbolist", category: "PAINTING" },
  { name: "art nouveau", category: "PAINTING" },
  { name: "art deco", category: "PAINTING" },
  { name: "vorticist", category: "PAINTING" },
  { name: "tonalist", category: "PAINTING" },
  { name: "color field with figures", category: "PAINTING" },
  { name: "hard-edge painting", category: "PAINTING" },
  { name: "naive art", category: "PAINTING" },
  { name: "folk painting", category: "PAINTING" },
  { name: "outsider art", category: "PAINTING" },
  { name: "social realist mural style", category: "PAINTING" },
  { name: "regionalist", category: "PAINTING" },
  { name: "precisionist", category: "PAINTING" },
  { name: "metaphysical painting", category: "PAINTING" },
  { name: "orphism", category: "PAINTING" },
  { name: "rayonism", category: "PAINTING" },
  { name: "nabis", category: "PAINTING" },
  { name: "synthetism", category: "PAINTING" },
  { name: "cloisonnism", category: "PAINTING" },
  // DRAWING
  { name: "charcoal", category: "DRAWING" },
  { name: "conte crayon", category: "DRAWING" },
  { name: "graphite", category: "DRAWING" },
  { name: "silverpoint", category: "DRAWING" },
  { name: "pen and ink crosshatch", category: "DRAWING" },
  { name: "stipple", category: "DRAWING" },
  { name: "ballpoint pen", category: "DRAWING" },
  { name: "brush pen", category: "DRAWING" },
  { name: "soft pastel", category: "DRAWING" },
  { name: "oil pastel", category: "DRAWING" },
  { name: "wax crayon", category: "DRAWING" },
  { name: "colored pencil", category: "DRAWING" },
  { name: "marker", category: "DRAWING" },
  { name: "scratchboard", category: "DRAWING" },
  { name: "chalk on black", category: "DRAWING" },
  { name: "blind contour line", category: "DRAWING" },
  { name: "single continuous line", category: "DRAWING" },
  { name: "ink blot and line", category: "DRAWING" },
  // PRINT
  { name: "woodcut", category: "PRINT" },
  { name: "wood engraving", category: "PRINT" },
  { name: "linocut", category: "PRINT" },
  { name: "reduction linocut", category: "PRINT" },
  { name: "ukiyo-e", category: "PRINT" },
  { name: "mokuhanga", category: "PRINT" },
  { name: "etching", category: "PRINT" },
  { name: "aquatint", category: "PRINT" },
  { name: "drypoint", category: "PRINT" },
  { name: "mezzotint", category: "PRINT" },
  { name: "lithograph", category: "PRINT" },
  { name: "risograph", category: "PRINT" },
  { name: "misregistered risograph", category: "PRINT" },
  { name: "screenprint", category: "PRINT" },
  { name: "monotype", category: "PRINT" },
  { name: "collagraph", category: "PRINT" },
  { name: "cyanotype", category: "PRINT" },
  { name: "photogram silhouette", category: "PRINT" },
  { name: "pochoir stencil", category: "PRINT" },
  { name: "mimeograph", category: "PRINT" },
  { name: "halftone newsprint", category: "PRINT" },
  { name: "potato print", category: "PRINT" },
  { name: "rubber stamp print", category: "PRINT", marks: "stamped ink edges, repeating impressions" },
  { name: "chine-colle", category: "PRINT" },
  { name: "relief print with wood grain", category: "PRINT" },
  // CRAFT-AS-STYLE
  { name: "cross-stitch", category: "CRAFT-AS-STYLE", marks: "square X stitches on a visible grid" },
  { name: "embroidery", category: "CRAFT-AS-STYLE", marks: "visible stitches, thread texture, flat thread colors" },
  { name: "quilt patchwork", category: "CRAFT-AS-STYLE", marks: "pieced fabric blocks, visible seam lines, flat patch colors" },
  { name: "tapestry weave", category: "CRAFT-AS-STYLE", marks: "visible woven thread grid, stepped edges, no smooth gradients" },
  { name: "kilim pattern", category: "CRAFT-AS-STYLE", marks: "flat geometric weave bands, stepped diagonals, no pile depth" },
  { name: "batik", category: "CRAFT-AS-STYLE", marks: "cracked wax lines, dye pooling, resist outlines" },
  { name: "shibori", category: "CRAFT-AS-STYLE", marks: "tie-resist blotches, gathered dye edges, soft irregular repeats" },
  { name: "ikat", category: "CRAFT-AS-STYLE", marks: "blurred warp-dye edges, feathered color bands, woven grid" },
  { name: "applique", category: "CRAFT-AS-STYLE", marks: "cut fabric shapes stitched on, edge stitches, layered flat cloth" },
  { name: "felt", category: "CRAFT-AS-STYLE", marks: "dense matte fiber surface, soft cut edges, compressed wool texture" },
  { name: "beadwork", category: "CRAFT-AS-STYLE", marks: "tiny bead dots in rows, hard sparkle points, geometric fills" },
  { name: "mosaic", category: "CRAFT-AS-STYLE", marks: "visible small tiles with grout gaps" },
  { name: "stained glass", category: "CRAFT-AS-STYLE", marks: "thick dark lead lines, jewel-color flat panes" },
  { name: "cloisonne enamel", category: "CRAFT-AS-STYLE", marks: "thin metal cell walls, flat enamel fills, jewel color panes" },
  { name: "marquetry", category: "CRAFT-AS-STYLE", marks: "inlaid wood grain shapes, seam outlines, flat veneer patches" },
  { name: "paper cut", category: "CRAFT-AS-STYLE", marks: "hard cut edges, flat layered paper" },
  { name: "papel picado", category: "CRAFT-AS-STYLE", marks: "perforated cut patterns, paper lace holes, bright flat sheets" },
  { name: "cut-paper collage", category: "CRAFT-AS-STYLE", marks: "torn and cut flat shapes, visible overlaps" },
  { name: "torn-paper collage", category: "CRAFT-AS-STYLE", marks: "ragged torn edges, layered paper scraps, visible overlaps" },
  { name: "quilling", category: "CRAFT-AS-STYLE", marks: "coiled paper strips on edge, spiral rolls, raised line patterns" },
  { name: "sand painting", category: "CRAFT-AS-STYLE", marks: "granular texture, flat earth colors" },
  { name: "lacquer painting", category: "CRAFT-AS-STYLE", marks: "hard glossy flat layers, crisp color bands, polished surface sheen as flat paint" },
  { name: "azulejo tile", category: "CRAFT-AS-STYLE", marks: "square tile grid, painted flat motifs, thin grout lines" },
  { name: "sgraffito", category: "CRAFT-AS-STYLE", marks: "scratched-through color layers, incised outlines, revealed undercolor" },
  { name: "pyrography", category: "CRAFT-AS-STYLE", marks: "burned brown line work, scorched shading, wood-surface marks" },
  { name: "rug hooking", category: "CRAFT-AS-STYLE", marks: "looped yarn texture, chunky pile dots, flat hooked fills" },
  { name: "macrame knot pattern", category: "CRAFT-AS-STYLE", marks: "visible knot diamond lattice, rope loops, openwork gaps" },
  { name: "woven basket pattern", category: "CRAFT-AS-STYLE", marks: "over-under weave grid, reed strips, staggered crossings" },
  // ILLUSTRATION AND GRAPHIC
  { name: "picture-book illustration", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "golden-age book illustration", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "ligne claire comics", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "manga screentone", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "mid-century modern illustration", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "WPA poster style", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "Polish poster school", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "Swiss graphic style", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "vintage travel poster style", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "botanical plate", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "scientific diagram", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "cartographic map style", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "blueprint", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "heraldic", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "isotype pictogram", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "flat vector", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "cutout animation", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "cel animation", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "rotoscope", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "storyboard sketch", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "children's crayon drawing", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "chalkboard drawing", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "matchbox label art", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "playing-card court style", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "fashion illustration", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "architectural rendering in ink", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "courtroom sketch", category: "ILLUSTRATION AND GRAPHIC" },
  { name: "field-notebook sketch", category: "ILLUSTRATION AND GRAPHIC" },
  // DIGITAL
  { name: "8-bit pixel art", category: "DIGITAL" },
  { name: "16-bit pixel art", category: "DIGITAL" },
  { name: "1-bit dither", category: "DIGITAL" },
  { name: "four-tone handheld palette", category: "DIGITAL" },
  { name: "ANSI block art", category: "DIGITAL" },
  { name: "glitch", category: "DIGITAL" },
  { name: "datamosh", category: "DIGITAL" },
  { name: "pixel sorting", category: "DIGITAL" },
  { name: "CRT scanline", category: "DIGITAL" },
  { name: "VHS tracking", category: "DIGITAL" },
  { name: "vaporwave", category: "DIGITAL" },
  { name: "low-poly", category: "DIGITAL" },
  { name: "voxel", category: "DIGITAL" },
  { name: "isometric game art", category: "DIGITAL" },
  { name: "PS1-era 3D", category: "DIGITAL" },
  { name: "wireframe vector", category: "DIGITAL" },
  { name: "oscilloscope trace", category: "DIGITAL" },
  { name: "pen-plotter drawing", category: "DIGITAL" },
  { name: "generative line field", category: "DIGITAL" },
  { name: "cellular automata", category: "DIGITAL" },
  { name: "moire", category: "DIGITAL" },
  { name: "thermal-camera palette", category: "DIGITAL" },
  { name: "infrared", category: "DIGITAL" },
  { name: "x-ray", category: "DIGITAL" },
  { name: "heat map", category: "DIGITAL" },
  { name: "topographic contour", category: "DIGITAL" },
  { name: "point cloud", category: "DIGITAL" },
  { name: "cel-shaded", category: "DIGITAL" },
  { name: "early paint-program art", category: "DIGITAL" },
  { name: "LED matrix", category: "DIGITAL" },
  { name: "e-ink", category: "DIGITAL" },
  { name: "teletext blocks", category: "DIGITAL" },
  { name: "fax", category: "DIGITAL" },
  { name: "photocopy", category: "DIGITAL" },
  { name: "scanner drag", category: "DIGITAL" },
  { name: "bitmap fill patterns", category: "DIGITAL" },
  { name: "early computer plotter art", category: "DIGITAL" },
  { name: "vector arcade", category: "DIGITAL" },
  { name: "demoscene", category: "DIGITAL" },
  // HISTORIC TRADITIONS
  { name: "cave pigment", category: "HISTORIC TRADITIONS" },
  { name: "petroglyph", category: "HISTORIC TRADITIONS" },
  { name: "Egyptian register painting", category: "HISTORIC TRADITIONS" },
  { name: "Greek black-figure", category: "HISTORIC TRADITIONS" },
  { name: "Greek red-figure", category: "HISTORIC TRADITIONS" },
  { name: "Roman mosaic", category: "HISTORIC TRADITIONS" },
  { name: "Byzantine icon", category: "HISTORIC TRADITIONS" },
  { name: "Romanesque", category: "HISTORIC TRADITIONS" },
  { name: "Gothic panel", category: "HISTORIC TRADITIONS" },
  { name: "Celtic interlace", category: "HISTORIC TRADITIONS" },
  { name: "Mesoamerican codex", category: "HISTORIC TRADITIONS" },
  { name: "Ethiopian icon", category: "HISTORIC TRADITIONS" },
  { name: "Persian miniature", category: "HISTORIC TRADITIONS" },
  { name: "Mughal miniature", category: "HISTORIC TRADITIONS" },
  { name: "Chinese gongbi", category: "HISTORIC TRADITIONS" },
  { name: "Chinese ink landscape", category: "HISTORIC TRADITIONS" },
  { name: "Japanese yamato-e", category: "HISTORIC TRADITIONS" },
  { name: "Korean minhwa", category: "HISTORIC TRADITIONS" },
  { name: "Madhubani", category: "HISTORIC TRADITIONS" },
  { name: "Warli", category: "HISTORIC TRADITIONS" },
  { name: "Pattachitra", category: "HISTORIC TRADITIONS" },
  { name: "Kalamkari", category: "HISTORIC TRADITIONS" },
  { name: "Balinese painting", category: "HISTORIC TRADITIONS" },
  { name: "Haitian painting", category: "HISTORIC TRADITIONS" },
  { name: "Russian lubok", category: "HISTORIC TRADITIONS" },
  { name: "Mexican retablo", category: "HISTORIC TRADITIONS" },
  { name: "Otomi pattern", category: "HISTORIC TRADITIONS" },
  { name: "Scandinavian rosemaling", category: "HISTORIC TRADITIONS" },
  { name: "Polish wycinanki", category: "HISTORIC TRADITIONS" },
  { name: "Petrykivka", category: "HISTORIC TRADITIONS" },
  { name: "Ndebele pattern", category: "HISTORIC TRADITIONS" },
  { name: "Tibetan thangka", category: "HISTORIC TRADITIONS" },
] as const;


function normalize(value: string) {
  return value.trim().toLowerCase();
}

function availableFrom(
  list: readonly string[],
  used: string[],
  limit: number
): string[] {
  const blocked = new Set(used.slice(0, limit).map(normalize).filter(Boolean));
  const pool = list.filter((item) => {
    const n = normalize(item);
    for (const usedItem of blocked) {
      if (!usedItem) continue;
      if (usedItem === n) return false;
      if (usedItem.includes(n) || n.includes(usedItem)) return false;
    }
    return true;
  });
  return pool.length > 0 ? pool : [...list];
}

function pickOne(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? list[0]!;
}

function pickMany(list: readonly string[], count: number): string[] {
  const pool = [...list];
  const out: string[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const index = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(index, 1)[0]!);
  }
  return out;
}

function marksForStyles(styles: string[]): string | null {
  const byName = new Map(
    ALL_STYLES.map((entry) => [normalize(entry.name), entry.marks?.trim()])
  );
  const parts: string[] = [];
  for (const style of styles) {
    const marks = byName.get(normalize(style));
    if (marks) parts.push(`${style}: ${marks}`);
  }
  return parts.length > 0 ? parts.join("; ") : null;
}

/** Collect marks for dealt style names (hybrids include every lane that has them). */
export function styleMarksOf(styles: string[]): string | null {
  return marksForStyles(styles);
}

function rollMixLevel(): MixLevelV3 {
  const roll = Math.random();
  if (roll < 0.2) return "pure";
  if (roll < 0.45) return "light";
  if (roll < 0.7) return "mixed";
  if (roll < 0.82) return "lots";
  return "invent";
}

function buildStartingDirection(input: {
  mixLevel: MixLevelV3;
  styles: string[];
  palette: string | null;
  composition: string | null;
  texture: string | null;
}): string {
  const parts: string[] = [`mix ${input.mixLevel}`];
  if (input.mixLevel === "invent") {
    parts.push(
      "Invent a medium that does not exist yet; name it and commit to it fully."
    );
  } else if (input.styles.length === 1) {
    parts.push(`style: ${input.styles[0]}`);
  } else if (input.styles.length > 1) {
    parts.push(`styles: ${input.styles.join(" + ")}`);
  }
  if (input.palette) parts.push(`palette: ${input.palette}`);
  if (input.composition) parts.push(`composition: ${input.composition}`);
  if (input.texture) parts.push(`texture: ${input.texture}`);
  return parts.join("; ");
}

/**
 * Mix levels: PURE 20%, LIGHT 25%, MIXED 25%, LOTS 12%, INVENT 18%.
 * Excludes last 20 styles, last 8 palettes, last 8 compositions.
 */
export function pickStyleMix(input?: {
  usedStyles?: string[];
  usedPalettes?: string[];
  usedCompositions?: string[];
}): StyleMixV3 {
  const usedStyles = input?.usedStyles ?? [];
  const usedPalettes = input?.usedPalettes ?? [];
  const usedCompositions = input?.usedCompositions ?? [];
  const stylePool = availableFrom(
    ALL_STYLES.map((entry) => entry.name),
    usedStyles,
    20
  );
  const palettePool = availableFrom(PALETTES, usedPalettes, 8);
  const compositionPool = availableFrom(COMPOSITIONS, usedCompositions, 8);
  const texturePool = [...TEXTURES];

  const mixLevel = rollMixLevel();
  let styles: string[] = [];
  let palette: string | null = null;
  let composition: string | null = null;
  let texture: string | null = null;

  if (mixLevel === "pure") {
    styles = pickMany(stylePool, 1);
  } else if (mixLevel === "light") {
    styles = pickMany(stylePool, 1);
    const dial = Math.floor(Math.random() * 3);
    if (dial === 0) palette = pickOne(palettePool);
    else if (dial === 1) composition = pickOne(compositionPool);
    else texture = pickOne(texturePool);
  } else if (mixLevel === "mixed") {
    styles = pickMany(stylePool, 2);
    const dialCount = Math.random() < 0.5 ? 2 : 3;
    const dials = pickMany(
      ["palette", "composition", "texture"],
      dialCount
    );
    for (const dial of dials) {
      if (dial === "palette") palette = pickOne(palettePool);
      else if (dial === "composition") composition = pickOne(compositionPool);
      else texture = pickOne(texturePool);
    }
  } else if (mixLevel === "lots") {
    const styleCount = 3 + Math.floor(Math.random() * 3); // 3-5
    styles = pickMany(stylePool, styleCount);
    palette = pickOne(palettePool);
    composition = pickOne(compositionPool);
    texture = pickOne(texturePool);
  } else {
    // invent
    styles = [];
    palette = pickOne(palettePool);
    composition = pickOne(compositionPool);
    texture = pickOne(texturePool);
  }

  const startingDirection = buildStartingDirection({
    mixLevel,
    styles,
    palette,
    composition,
    texture,
  });
  const styleMarks = styleMarksOf(styles);

  return {
    mixLevel,
    styles,
    palette,
    composition,
    texture,
    startingDirection,
    styleMarks,
  };
}
