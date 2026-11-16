export const FIGURE_BUILDS = [
  "stocky and short",
  "tall and lanky",
  "broad-shouldered",
  "wiry and quick",
  "heavy and solid",
  "slight and angular",
  "barrel-chested",
  "long-limbed",
  "compact and solid",
  "hunched",
  "upright and stiff",
  "soft-bellied",
  "knobby-jointed",
  "lean with long hands",
] as const;

export const FIGURE_COLORINGS = [
  "ash-grey coat",
  "rust-red markings",
  "pale chalk skin",
  "ink-black fur",
  "olive-mottled hide",
  "copper-patched plates",
  "bone-white face",
  "deep teal skin",
  "soot-streaked limbs",
  "mustard and cream patches",
  "violet-tinged edges",
  "sand-brown body",
  "slate-blue sheen",
  "greenish decay tint",
] as const;

export const FIGURE_MARKS = [
  "one cracked horn",
  "a missing ear tip",
  "a painted stripe across the eyes",
  "a crooked antenna",
  "a stitched jaw line",
  "three mismatched eyes",
  "a branded shoulder plate",
  "a notched cheek",
  "a glowing seam at the neck",
  "a long scar-like chalk mark",
  "an asymmetric crest",
  "a ring of bolts at the wrist",
  "a torn half-mask",
  "a single bright tooth",
] as const;

export const FIGURE_GEAR = [
  "a patched greatcoat",
  "a tool belt with hanging keys",
  "a hood of oilcloth",
  "riveted shoulder pads",
  "a scarf knotted twice",
  "fingerless gloves",
  "a satchel of stamped tickets",
  "a dented brass collar",
  "a rope coiled at the hip",
  "a cloak of quilted scraps",
  "goggles pushed up on the head",
  "a short apron of leather",
  "a banner half-wrapped as a sash",
  "boots with mismatched soles",
] as const;

export const FIGURE_POSTURES = [
  "mid-lunge",
  "braced on one knee",
  "twisting away from a blow",
  "leaning into a shove",
  "arms locked in a grapple",
  "springing off the back foot",
  "shielding with a raised forearm",
  "stooped and hauling",
  "crouched to spring",
  "reaching across another figure",
  "planted wide and stubborn",
  "caught mid-turn",
  "falling forward into contact",
  "pulling someone by the sleeve",
] as const;

export type FigureKit = {
  build: string;
  coloring: string;
  mark: string;
  gear: string;
  posture: string;
  label: string;
};

function pickOne(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? list[0]!;
}

/** One random trait from each list, for the mural figure. */
export function pickFigureKit(): FigureKit {
  const build = pickOne(FIGURE_BUILDS);
  const coloring = pickOne(FIGURE_COLORINGS);
  const mark = pickOne(FIGURE_MARKS);
  const gear = pickOne(FIGURE_GEAR);
  const posture = pickOne(FIGURE_POSTURES);
  return {
    build,
    coloring,
    mark,
    gear,
    posture,
    label: `${build}; ${coloring}; ${mark}; ${gear}; ${posture}`,
  };
}
