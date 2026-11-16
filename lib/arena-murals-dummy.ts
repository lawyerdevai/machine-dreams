export type DummySeason = {
  season: number;
  name: string;
  weather: string;
  champion: string;
  deaths: string;
  election: string;
  war: string;
  events: string;
};

/** Fake season records for the murals lab. Not stored anywhere. */
export const DUMMY_SEASONS: readonly DummySeason[] = [
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
  },
];

export function pickDummySeason(): DummySeason {
  const index = Math.floor(Math.random() * DUMMY_SEASONS.length);
  return DUMMY_SEASONS[index] ?? DUMMY_SEASONS[0]!;
}

export function formatSeasonRecord(season: DummySeason): string {
  return [
    `SEASON ${season.season} — "${season.name}"`,
    `Weather: ${season.weather}`,
    `Season champion: ${season.champion}`,
    `Deaths: ${season.deaths}`,
    `Election: ${season.election}`,
    `War: ${season.war}`,
    `Events: ${season.events}`,
  ].join("\n");
}
