export type FactionName =
  | "Human"
  | "Cat"
  | "Alien"
  | "Agent"
  | "Zombie";

export type FactionKit = {
  faction: FactionName;
  label: string;
  traits: Record<string, string>;
};

export type FactionKitsV3 = {
  Human: { A: FactionKit; B: FactionKit };
  Cat: { A: FactionKit; B: FactionKit };
  Alien: { A: FactionKit; B: FactionKit };
  Agent: { A: FactionKit; B: FactionKit };
  Zombie: { A: FactionKit; B: FactionKit };
  label: string;
};

type Weighted<T extends string> = { name: T; weight: number };

const ORIGIN_GUIDANCE =
  "Let the origin shape the body, skin, eyes, build, materials, and clothing.";

const WILDCARD_TEXT =
  "Invent a body form for this faction that is not on any list: a hybrid, a mixed-faction body, or something new.";

const SCALES_SHARED = [
  "tiny (a quarter human size)",
  "small (about half human size)",
  "human-sized",
  "tall (a head and a half over human)",
  "huge (twice human height or more)",
] as const;

const SCALES_HUMAN = [
  "short adult",
  "average adult",
  "tall adult",
  "very tall adult",
  "giant",
] as const;

const SCALES_CAT = [...SCALES_SHARED, "ordinary cat size"] as const;

const CAT_FORMS: readonly Weighted<string>[] = [
  { name: "ordinary cat on four legs", weight: 25 },
  { name: "upright on hind legs at cat size", weight: 10 },
  { name: "upright, human-sized, human-proportioned", weight: 25 },
  { name: "upright and oversized", weight: 10 },
  { name: "cat head on a human-shaped body", weight: 10 },
  { name: "panther-sized on four legs", weight: 10 },
  { name: "a large cat the size of a horse on four legs", weight: 10 },
  { name: "cat head on a human body", weight: 5 },
  { name: "human body with cat ears and tail", weight: 5 },
  { name: "cat body with human hands", weight: 5 },
  { name: "human torso on a four-legged cat body", weight: 5 },
  { name: "four-armed cat", weight: 5 },
  { name: "two-headed cat", weight: 5 },
  { name: "very long and low cat", weight: 5 },
  { name: "cat in plated armor", weight: 5 },
  { name: "cat inside a small machine", weight: 5 },
  { name: "patchwork cat of mismatched coats", weight: 5 },
  { name: "tiny cat the size of a cup", weight: 5 },
  { name: "huge cat the size of a house", weight: 5 },
  { name: "cat with a human's posture and a cat's face", weight: 5 },
  { name: "cat with a long scarf as part of the silhouette", weight: 5 },
];

const CAT_COATS = [
  "orange tabby",
  "grey tabby",
  "tuxedo",
  "calico",
  "tortoiseshell",
  "black",
  "white",
  "Siamese pointed",
  "hairless",
  "long-haired and fluffy",
  "Bengal spotted",
  "blue-grey",
  "cream",
  "violet",
  "teal",
  "gold",
  "ember red",
  "chalk-white with ink stripes",
  "silver",
] as const;

const CAT_FEATURES = [
  "long tail",
  "bobbed tail",
  "ringed tail",
  "kinked tail",
  "torn ear",
  "tufted ears",
  "folded ears",
  "mismatched eyes",
  "slit eyes",
  "scarred muzzle",
  "one eye missing",
  "very long whiskers",
  "collar of rope",
  "patched fur",
] as const;

const ALIENNESS = [
  "super alien with nothing human",
  "mostly alien with one human trait",
  "half human and half alien",
  "human-shaped with strange skin and eyes",
  "nearly human with one wrong detail",
] as const;

const ALIEN_ORIGINS = [
  "desert world with two suns",
  "deep-ocean world",
  "frozen moon",
  "gas-giant cloud city",
  "dense jungle world",
  "volcanic world",
  "underground cave world",
  "born on an orbital station",
  "binary-star twilight world",
  "crystal planet",
  "swamp world",
  "high-gravity world (stocky, dense)",
  "low-gravity world (tall, thin)",
  "tidally locked dark side",
  "storm world",
  "fungal forest world",
] as const;

const ALIEN_BODY_PLANS = [
  "tall thin grey",
  "short and round",
  "insectoid",
  "tentacled",
  "many-armed",
  "single huge eye",
  "blob-like",
  "crystalline",
  "plant-like",
  "lizard-like",
  "floating with no legs",
  "wiry long-armed",
  "armored shell",
  "jellyfish-like",
  "four-armed",
  "two-headed",
  "serpentine",
] as const;

const ALIEN_SKINS = [
  "green",
  "blue",
  "violet",
  "orange",
  "white",
  "black",
  "translucent",
  "mottled",
  "striped",
  "gold",
  "copper",
  "chalk",
  "pink",
  "rust",
  "iridescent",
] as const;

const ALIEN_FEATURES = [
  "large dark eyes",
  "many small eyes",
  "no mouth",
  "antennae",
  "spines",
  "a crest",
  "a long neck",
  "webbed hands",
  "thin fingers",
  "glowing marks (flat color only, no glow effects)",
  "a sac",
  "scales",
  "fur",
  "ridged brow plates",
] as const;

const ZOMBIE_DECAY = [
  "fresh and pallid",
  "mid decay",
  "skeletal",
  "mummified",
  "bloated",
  "moss-covered",
  "frozen and frosted",
  "charred",
  "stitched patchwork",
  "ash-grey",
  "peeling and dry",
  "salt-cured",
] as const;

const ZOMBIE_COLORS = [
  "green",
  "grey",
  "blue",
  "yellow",
  "purple",
  "brown",
  "bone-white",
  "greenish-black",
  "pink",
  "olive",
  "slate",
  "mud-brown",
] as const;

const ZOMBIE_BUILDS = [
  "gaunt",
  "hulking",
  "small",
  "tall and thin",
  "broken-backed",
  "many-limbed by stitching",
  "lopsided",
  "barrel-chested",
  "shrunken",
  "broad and shambling",
  "twisted at the hip",
  "long-armed",
  "half skeletal and half intact",
  "a group fused into one body",
  "hollow figure that is just clothes and bones",
  "zombie of a non-human body",
  "tall and stretched",
  "short and wide",
  "crawling on all fours",
  "hunched under a heavy load",
  "split down the middle and resewn",
  "one arm too long for the torso",
] as const;

const ZOMBIE_CLOTHING = [
  "torn work shirt",
  "ragged coat hanging open",
  "half a uniform jacket",
  "rotted apron",
  "boots with no soles",
  "a single glove",
  "belt of rope",
  "mud-caked trousers",
  "funeral suit in shreds",
  "hospital gown remnant",
  "armor scrap on one shoulder",
  "scarf knotted to a bone",
  "empty bandolier",
  "cloak of sacking",
] as const;

const ZOMBIE_POSTURES = [
  "shambling",
  "hunched",
  "upright and stiff",
  "crawling",
  "lunging",
  "leaning on a stick",
  "dragging a limb",
  "head cocked too far",
  "arms out for balance",
  "knees locked mid-step",
  "tilted as if falling",
  "braced on knuckles",
] as const;

const AGENT_MACHINE_TYPES = [
  "chunky industrial robot",
  "sleek android",
  "rusted scrapper",
  "mannequin-like",
  "glass-and-wire skeleton",
  "hovering drone body",
  "mech suit with the pilot hidden",
  "armored sentinel",
  "small toy-like robot",
  "wooden clockwork",
  "brass automaton",
  "nearly human android with visible seams",
  "cable-bundle humanoid",
  "screen-faced figure with a blank face (no text)",
  "tripod walker",
  "hollow suit of armor",
  "a small machine riding a larger one",
  "a figure made of many small drones",
  "a machine built from household objects",
  "a one-wheeled walker",
  "an armored suit with nobody visible inside",
  "a tall thin machine with long arms",
  "a round machine with no limbs",
  "a machine that is mostly a tool",
] as const;

const AGENT_COLORS = [
  "brushed steel",
  "matte black",
  "rust red",
  "ochre paint",
  "copper",
  "verdigris brass",
  "white enamel",
  "olive drab",
  "chrome",
  "charcoal grey",
  "signal yellow",
  "blue-grey paneling",
  "burnt orange",
  "pewter",
] as const;

const AGENT_FEATURES = [
  "single lens eye",
  "visor",
  "exposed gears",
  "antenna",
  "tool hands",
  "extra arms",
  "patched plating",
  "cables",
  "dented panels",
  "missing limb replaced by a tool",
  "hinged jaw plate",
  "vent slits on the chest",
  "riveted seams",
  "a blank disk face",
] as const;

const HUMAN_AGES = [
  "young adult (18 to 30)",
  "middle-aged (31 to 50)",
  "older (51 to 80)",
] as const;

const HUMAN_ORIGINS = [
  "coastal fishing town",
  "mountain village",
  "desert caravan",
  "northern tundra settlement",
  "river delta",
  "island community",
  "big city",
  "farmland",
  "mining town",
  "nomadic herders",
  "monastery",
  "shipyard",
  "market quarter",
  "highland plateau",
] as const;

const HUMAN_BUILDS = [
  "slight",
  "stocky",
  "athletic",
  "heavyset",
  "gaunt",
  "tall and lean",
  "short and wide",
  "broad-shouldered",
  "wiry",
  "soft-bellied",
  "barrel-chested",
  "narrow-hipped",
] as const;

const HUMAN_HEIGHTS = ["short", "average", "tall"] as const;

const HUMAN_SKIN_TONES = [
  "pale ivory",
  "light peach",
  "warm beige",
  "olive",
  "golden brown",
  "deep brown",
  "rich ebony",
  "ruddy",
  "ashen fair",
  "copper",
  "tan",
  "cool grey-brown",
] as const;

const HUMAN_HAIR = [
  "short black crop",
  "long dark braid",
  "grey buzz cut",
  "white bun",
  "red curls",
  "blond undercut",
  "bald",
  "salt-and-pepper waves",
  "tight coils",
  "shaved sides with a top knot",
  "matted and windblown",
  "thinning and swept back",
  "braided with cloth strips",
  "wet and slicked",
] as const;

const HUMAN_DRESS = [
  "work clothes",
  "uniform",
  "rags",
  "robes",
  "long coat",
  "armor scraps",
  "formal wear",
  "apron",
  "scarf and goggles",
  "hooded cloak",
  "patched jacket",
  "sailor's gear",
  "market trader vest",
  "messenger satchel and boots",
  "quilted winter coat",
  "sleeveless tunic and sash",
] as const;

const HUMAN_POSTURES = [
  "standing firm",
  "leaning into a shove",
  "mid-stride",
  "crouched low",
  "reaching out",
  "braced on one knee",
  "twisting away",
  "arms locked",
  "pointing",
  "hauling someone",
  "shielding with a forearm",
  "caught mid-turn",
] as const;

function pickOne(list: readonly string[]): string {
  return list[Math.floor(Math.random() * list.length)] ?? list[0]!;
}

function pickWeighted(items: readonly Weighted<string>[]): string {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item.name;
  }
  return items[items.length - 1]!.name;
}

function pickTwo(list: readonly string[]): [string, string] {
  const first = pickOne(list);
  const rest = list.filter((item) => item !== first);
  const second = pickOne(rest.length > 0 ? rest : list);
  return [first, second];
}

function applyWildcard(
  traits: Record<string, string>,
  formKey: string
): Record<string, string> {
  if (Math.random() >= 0.2) return traits;
  return {
    ...traits,
    [formKey]: WILDCARD_TEXT,
    WILDCARD: WILDCARD_TEXT,
  };
}

function makeKit(
  faction: FactionName,
  traits: Record<string, string>
): FactionKit {
  const parts = Object.entries(traits).map(([key, value]) => `${key}: ${value}`);
  return {
    faction,
    traits,
    label: `${faction} — ${parts.join("; ")}`,
  };
}

function pickHumanKit(): FactionKit {
  const traits = applyWildcard(
    {
      scale: pickOne(SCALES_HUMAN),
      age: pickOne(HUMAN_AGES),
      origin: pickOne(HUMAN_ORIGINS),
      "origin guidance": ORIGIN_GUIDANCE,
      build: pickOne(HUMAN_BUILDS),
      height: pickOne(HUMAN_HEIGHTS),
      skin: `${pickOne(HUMAN_SKIN_TONES)}; reflect a wide range of the world's peoples, drawn respectfully and without caricature`,
      hair: pickOne(HUMAN_HAIR),
      dress: pickOne(HUMAN_DRESS),
      posture: pickOne(HUMAN_POSTURES),
    },
    "form"
  );
  return makeKit("Human", traits);
}

function pickCatKit(): FactionKit {
  const [featureA, featureB] = pickTwo(CAT_FEATURES);
  const traits = applyWildcard(
    {
      scale: pickOne(SCALES_CAT),
      form: pickWeighted(CAT_FORMS),
      coat: pickOne(CAT_COATS),
      features: `${featureA}; ${featureB}`,
    },
    "form"
  );
  return makeKit("Cat", traits);
}

function pickAlienKit(): FactionKit {
  const [featureA, featureB] = pickTwo(ALIEN_FEATURES);
  const traits = applyWildcard(
    {
      scale: pickOne(SCALES_SHARED),
      origin: pickOne(ALIEN_ORIGINS),
      "origin guidance": ORIGIN_GUIDANCE,
      alienness: pickOne(ALIENNESS),
      form: pickOne(ALIEN_BODY_PLANS),
      skin: pickOne(ALIEN_SKINS),
      features: `${featureA}; ${featureB}`,
    },
    "form"
  );
  return makeKit("Alien", traits);
}

function pickAgentKit(): FactionKit {
  const [featureA, featureB] = pickTwo(AGENT_FEATURES);
  const traits = applyWildcard(
    {
      scale: pickOne(SCALES_SHARED),
      form: pickOne(AGENT_MACHINE_TYPES),
      color: pickOne(AGENT_COLORS),
      features: `${featureA}; ${featureB}`,
    },
    "form"
  );
  return makeKit("Agent", traits);
}

function pickZombieKit(): FactionKit {
  const traits = applyWildcard(
    {
      scale: pickOne(SCALES_SHARED),
      decay: pickOne(ZOMBIE_DECAY),
      color: pickOne(ZOMBIE_COLORS),
      form: pickOne(ZOMBIE_BUILDS),
      clothing: pickOne(ZOMBIE_CLOTHING),
      posture: pickOne(ZOMBIE_POSTURES),
    },
    "form"
  );
  return makeKit("Zombie", traits);
}

function pair(faction: FactionName, roll: () => FactionKit): {
  A: FactionKit;
  B: FactionKit;
} {
  return { A: roll(), B: roll() };
}

/** Two independent kits (A and B) for each faction. */
export function pickFactionKits(): FactionKitsV3 {
  const Human = pair("Human", pickHumanKit);
  const Cat = pair("Cat", pickCatKit);
  const Alien = pair("Alien", pickAlienKit);
  const Agent = pair("Agent", pickAgentKit);
  const Zombie = pair("Zombie", pickZombieKit);
  const label = [
    `Human A: ${Human.A.label}`,
    `Human B: ${Human.B.label}`,
    `Cat A: ${Cat.A.label}`,
    `Cat B: ${Cat.B.label}`,
    `Alien A: ${Alien.A.label}`,
    `Alien B: ${Alien.B.label}`,
    `Agent A: ${Agent.A.label}`,
    `Agent B: ${Agent.B.label}`,
    `Zombie A: ${Zombie.A.label}`,
    `Zombie B: ${Zombie.B.label}`,
  ].join("\n");
  return { Human, Cat, Alien, Agent, Zombie, label };
}
