export type ViolenceLevel = {
  id: string;
  name: string;
  weight: number;
};

export type CastSize = {
  id: string;
  name: string;
  weight: number;
};

export const VIOLENCE_LEVELS: readonly ViolenceLevel[] = [
  {
    id: "about-to-happen",
    name: "about to happen, nothing struck yet",
    weight: 15,
  },
  { id: "tense-standoff", name: "tense standoff", weight: 15 },
  { id: "scuffle", name: "scuffle", weight: 20 },
  { id: "brawl", name: "brawl", weight: 20 },
  { id: "all-out-clash", name: "all-out clash", weight: 20 },
  {
    id: "aftermath",
    name: "aftermath, survivors only, no bodies shown",
    weight: 10,
  },
] as const;

/** v3 cast weights. v2 keeps lib/arena-murals-scenes.ts. */
export const CAST_SIZES: readonly CastSize[] = [
  { id: "one", name: "one figure alone", weight: 15 },
  { id: "two", name: "two figures", weight: 25 },
  { id: "small-group", name: "small group of three to five", weight: 40 },
  { id: "crowd", name: "crowd", weight: 20 },
] as const;

export const CONFLICT_BEATS: readonly string[] = [
  "a charge toward the other side",
  "a leap from a height",
  "a tackle",
  "a throw",
  "a shove off a ledge",
  "a chase",
  "someone fleeing a pursuer",
  "a defender holding a line or doorway",
  "an ambush from behind",
  "a rallying shout before the charge",
  "a duel at a distance",
  "a pile-on",
  "a block or parry",
  "a stagger from a blow",
  "a fall",
  "a figure dodging",
  "a weapon being swung or raised",
  "a thrown object in mid-air",
  "a standoff the instant before contact",
  "one figure standing over a dropped weapon",
  "a retreat covering others",
  "a collision of two groups",
  "a tug over an object",
  "a figure shielding another",
  "a surprise from above",
  "a shoulder-check in a narrow gap",
  "a vault over a barrier into the other side",
  "a spinning kick that never quite lands clean",
  "a shield-wall buckling under pressure",
  "two figures locking wrists mid-swing",
  "a rope or banner pulled between sides",
  "a figure yanked back by allies mid-charge",
  "a non-violent confrontation across a table",
  "a refusal at a doorway",
  "a stare-down with neither side moving",
] as const;

export const CAMERAS: readonly string[] = [
  "wide",
  "low angle looking up",
  "overhead looking down",
  "close on faces",
  "from behind a figure",
  "side-on frieze",
  "tilted diagonal",
] as const;

export type SceneKit = {
  violenceLevel: string;
  castSize: string;
  beat: string;
  camera: string;
  label: string;
};

function pickWeighted<T extends { weight: number; name: string }>(
  items: readonly T[]
): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1]!;
}

function pickOne(list: readonly string[], exclude: string[] = []): string {
  const blocked = new Set(exclude.map((item) => item.trim().toLowerCase()));
  const pool = list.filter((item) => !blocked.has(item.toLowerCase()));
  const use = pool.length > 0 ? pool : list;
  return use[Math.floor(Math.random() * use.length)] ?? list[0]!;
}

/** One violence level, cast size, conflict beat, and camera per click. */
export function pickSceneKit(usedBeats: string[] = []): SceneKit {
  const violence = pickWeighted(VIOLENCE_LEVELS);
  const cast = pickWeighted(CAST_SIZES);
  const beat = pickOne(CONFLICT_BEATS, usedBeats.slice(0, 10));
  const camera = pickOne(CAMERAS);
  return {
    violenceLevel: violence.name,
    castSize: cast.name,
    beat,
    camera,
    label: `${violence.name}; ${cast.name}; ${beat}; camera ${camera}`,
  };
}
