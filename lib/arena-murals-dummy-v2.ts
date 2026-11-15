export type DummySeasonV2 = {
  season: number;
  name: string;
  weather: string;
  champion: string;
  deaths: string;
  election: string;
  war: string;
  events: string;
  characters: string;
  clashes: string;
  /** Seasons tagged for forced combat picks. */
  tags: readonly string[];
};

/** v2 fake seasons. v1 keeps reading lib/arena-murals-dummy.ts. */
export const DUMMY_SEASONS_V2: readonly DummySeasonV2[] = [
  {
    season: 3,
    name: "The Long Winter",
    weather: "winter, nights fell early, fruit scarce by day 5",
    champion:
      "a level-2 Cat named Pesh, mostly fishing and trading, avoided every fight",
    deaths:
      "41 Normies. The deadliest: a Zombie warlord, Brakk, killed on day 6 by his own party after a betrayal over loot",
    election:
      "the town of Ashfall elected a Human mayor by 3 votes. Aliens and Agents boycotted",
    war: "Zombies declared war on Cats on day 4. It ended with no winner when the Maw woke on day 6",
    events: "blood moon (day 3), plague (day 5), the Maw (day 6)",
    characters:
      "Pesh the Cat; Brakk the Zombie; Human mayor-elect Mara of Ashfall; Alien lookout Quill; Agent quartermaster Nox",
    clashes:
      "Day 4: Zombie raiders under Brakk charged the Cat ice-shed and were driven back by stacked crates and fishing spears. Day 5: two Cat scouts grappled a Zombie runner on the frozen ditch until both fell through thin ice. Day 6: Brakk's own party turned on him beside the Maw-pit after a loot dispute, ending the warlord mid-shove.",
    tags: ["violence", "war"],
  },
  {
    season: 1,
    name: "Harbour of Quiet Hands",
    weather: "mild spring, long calm mornings, rain only twice",
    champion:
      "a Human named Sera, level 3, who ran the pier market and never raised a weapon",
    deaths:
      "4 Normies, all of age or accident. No killings recorded in the town square",
    election:
      "Cats and Humans jointly re-elected the same Alien clerk by a wide margin; Agents stayed home but sent gifts",
    war: "none declared. Two border scuffles settled with grain and rope",
    events:
      "trade fair (day 2), night market of blue lamps (day 5), ferry pact with the river towns (day 7)",
    characters:
      "Sera the Human; Alien clerk Ysol; Cat ferry-hand Mip; Agent gift-bearer Kade; Zombie dock-mender Orth",
    clashes:
      "Day 3: a brief shove at the grain scales between a Cat porter and a Human trader, settled with a shared rope and no blood. Day 6: river Agents blocked a cart, then stood down when Sera offered salt and tickets.",
    tags: ["trade"],
  },
  {
    season: 4,
    name: "The Iron Season",
    weather: "dry heat, ash on the wind from day 1, no soft ground left by day 4",
    champion:
      "an Agent named Vesk, level 5, who took every field and left none standing",
    deaths:
      "128 Normies. Whole parties gone in a day. The deadliest stretch was days 3 to 5",
    election: "no election held. The ballot box was melted for scrap on day 2",
    war: "open war from dawn of day 1 to the last hour of day 7. Every type against every type",
    events:
      "siege of the stone bridge (day 2), burning of the grain halls (day 4), last stand at the scrap yard (day 7)",
    characters:
      "Vesk the Agent; Human bridge-captain Rhee; Cat scout-pair Tallo and Nim; Alien fire-runner Zesh; Zombie scrap-chief Gord",
    clashes:
      "Day 2: Rhee's Humans locked shields against Vesk's Agents on the stone bridge until both sides jammed in a mid-span shove. Day 4: Cats and Aliens collided in the burning grain halls, swinging hooks and wet cloth. Day 7: Gord's Zombies and Vesk's Agents grappled among scrap piles in the final stand, no victor clear when the yard collapsed.",
    tags: ["violence", "war"],
  },
  {
    season: 2,
    name: "Fever of the Soft Ground",
    weather: "warm fog, wet soil, a smell of rot after rain from day 3 onward",
    champion:
      "an Alien named Olin, who kept a still-house and carried water to the sick",
    deaths:
      "67 Normies to the fever. Only 9 by fight. Graves marked with cloth, not stone",
    election:
      "delayed twice, then a Cat named Mim won as plague warden by a thin vote of the living",
    war: "none. Raids stopped when both sides fell ill in the same week",
    events:
      "first cough in the docks (day 2), quarantine of the lower street (day 4), empty market (day 6)",
    characters:
      "Olin the Alien; Mim the Cat; Human nurse Pell; Agent cart-driver Hex; Zombie water-bearer Lumm",
    clashes:
      "Day 3: a short scuffle at the quarantine rope when a Human tried to cross and a Cat warden held the line. Day 5: two fevered Agents shoved each other over a water jug, then both sat down coughing.",
    tags: ["plague"],
  },
  {
    season: 5,
    name: "Three Votes and a Rope",
    weather: "clear autumn, cold nights, posters on every wall by day 2",
    champion:
      "a Human orator named Kel, who never fought and still shaped every room",
    deaths:
      "19 Normies. Two after a speech, the rest in quiet alleys after the count",
    election:
      "three recounts. An Agent slate won by one vote, then lost it to a Human coalition on a rules challenge",
    war: "no open war. A cold split between Agents and the rest after the hall doors were locked",
    events:
      "first debate under the clock (day 1), torn ballots (day 4), hanging of the false charter (day 6)",
    characters:
      "Kel the Human; Agent slate-lead Vorr; Cat tally-hand Sip; Alien rules-clerk Ama; Zombie door-guard Breck",
    clashes:
      "Day 4: Agents and Humans shoved over the ballot table until the box tipped. Day 6: Breck the Zombie and two Agents locked arms at the hall doors while the false charter was pulled down. Day 6 night: a Human runner and an Agent courier collided in an alley after the count.",
    tags: ["violence", "politics"],
  },
];

const COMBAT_KEYWORDS =
  /\b(war|battle|killed|siege|betrayal|raid|clash|grappled|shove|charge|fight|combat)\b/i;

export function seasonIdOfV2(season: DummySeasonV2) {
  return String(season.season);
}

export function isViolentSeason(season: DummySeasonV2) {
  if (season.tags.includes("violence") || season.tags.includes("war")) {
    return true;
  }
  const blob = `${season.war} ${season.deaths} ${season.events} ${season.clashes}`;
  return COMBAT_KEYWORDS.test(blob);
}

export function pickDummySeasonV2(input?: {
  lastSeasonId?: string;
  combatOnly?: boolean;
}): DummySeasonV2 {
  let pool: readonly DummySeasonV2[] = DUMMY_SEASONS_V2;
  if (input?.combatOnly) {
    const violent = DUMMY_SEASONS_V2.filter(isViolentSeason);
    pool = violent.length > 0 ? violent : DUMMY_SEASONS_V2;
  }
  if (input?.lastSeasonId && input.lastSeasonId.trim()) {
    const filtered = pool.filter(
      (item) => seasonIdOfV2(item) !== input.lastSeasonId!.trim()
    );
    if (filtered.length > 0) pool = filtered;
  }
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? DUMMY_SEASONS_V2[0]!;
}

export function formatSeasonRecordV2(season: DummySeasonV2): string {
  return [
    `SEASON ${season.season} — "${season.name}"`,
    `Weather: ${season.weather}`,
    `Season champion: ${season.champion}`,
    `Named figures: ${season.characters}`,
    `Deaths: ${season.deaths}`,
    `Election: ${season.election}`,
    `War: ${season.war}`,
    `Clashes: ${season.clashes}`,
    `Events: ${season.events}`,
  ].join("\n");
}
