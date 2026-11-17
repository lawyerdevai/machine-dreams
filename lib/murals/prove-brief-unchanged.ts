/**
 * Safety proof: Auto / empty Scene+Cast briefs must match main exactly.
 *
 * Usage:
 *   npx tsx lib/murals/prove-brief-unchanged.ts
 *   npx tsx lib/murals/prove-brief-unchanged.ts --write   # refresh goldens from branch empty path
 *
 * Also rebuilds main's buildBrief via `git show main:…` into a temp module and
 * compares string equality against this branch with direction omitted/empty.
 */
import { createHash } from "crypto";
import { execSync } from "child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { pathToFileURL } from "url";
import { buildBriefV2 } from "./build-brief-v2";
import { buildBriefV3 } from "./build-brief-v3";
import type { SeasonRecord } from "./season";

const ROOT = join(import.meta.dirname, "../..");
const FIXTURE_DIR = join(ROOT, "lib/murals/__fixtures__");
const WRITE = process.argv.includes("--write");

const season: SeasonRecord = {
  season: 12,
  name: "Season 12",
  weather: "clear",
  champion: "Ada",
  deaths: "3",
  election: "none",
  war: "Cats vs Agents",
  events: "Ada held the gate.",
  characters: "Ada, Moss",
  clashes: "A scuffle at the gate.",
  tags: ["gate"],
  sourceText:
    "DAY 4\nAda held the gate. Moss fell back. Three Normies fell overall.",
  focus: "Ada at the gate",
};

const sharedCast = undefined;

const v3Input = {
  startingDirection: "woodcut + teletext hybrid",
  styleMarks: "coarse hatch; CRT scanlines",
  usedMedia: ["ink wash", "linocut"],
  usedFigures: ["tall agent with antenna"],
  usedBeats: ["a charge toward the other side"],
  factionKits: {
    Human: {
      A: {
        faction: "Human" as const,
        label: "Human A",
        traits: { scale: "average adult" },
      },
      B: {
        faction: "Human" as const,
        label: "Human B",
        traits: { scale: "tall adult" },
      },
    },
    Cat: {
      A: {
        faction: "Cat" as const,
        label: "Cat A",
        traits: { scale: "ordinary cat size" },
      },
      B: {
        faction: "Cat" as const,
        label: "Cat B",
        traits: { scale: "human-sized" },
      },
    },
    Alien: {
      A: {
        faction: "Alien" as const,
        label: "Alien A",
        traits: { scale: "human-sized" },
      },
      B: {
        faction: "Alien" as const,
        label: "Alien B",
        traits: { scale: "tall" },
      },
    },
    Agent: {
      A: {
        faction: "Agent" as const,
        label: "Agent A",
        traits: { scale: "human-sized" },
      },
      B: {
        faction: "Agent" as const,
        label: "Agent B",
        traits: { scale: "tall" },
      },
    },
    Zombie: {
      A: {
        faction: "Zombie" as const,
        label: "Zombie A",
        traits: { scale: "human-sized" },
      },
      B: {
        faction: "Zombie" as const,
        label: "Zombie B",
        traits: { scale: "short adult" },
      },
    },
    label: "FACTION KITS (fixed proof fixture)",
  },
  sceneKit: {
    violenceLevel: "scuffle",
    castSize: "two figures",
    beat: "a shove at the threshold",
    camera: "eye level",
    label: "scuffle; two figures; a shove at the threshold; eye level",
  },
  season,
  targetTone: "combat" as const,
  forceCombat: false,
  normieCast: sharedCast,
};

const v2Input = {
  startingDirection: "gouache illustration",
  styleMarks: null as string | null,
  usedMedia: [] as string[],
  usedFigures: [] as string[],
  usedBeats: [] as string[],
  figureKit: {
    build: "stocky and short",
    coloring: "ash-grey coat",
    mark: "one cracked horn",
    gear: "a rope coil",
    posture: "planted wide and stubborn",
    label:
      "stocky and short; ash-grey coat; one cracked horn; a rope coil; planted wide and stubborn",
  },
  sceneKit: {
    violenceLevel: "tense standoff",
    castSize: "two figures",
    camera: "low angle",
    beat: "a held blade",
    label: "tense standoff; two figures; low angle; a held blade",
  },
  season,
  targetTone: "quiet" as const,
  forceCombat: false,
  normieCast: sharedCast,
};

function sha(text: string) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** Rewrite relative murals imports so main's brief modules load from a temp dir. */
function rewriteMuralsImports(source: string, dir: string): string {
  return source
    .replaceAll(
      'from "./direction"',
      `from ${JSON.stringify(join(dir, "direction.ts"))}`
    )
    .replaceAll(
      'from "./brief-cast"',
      `from ${JSON.stringify(join(dir, "brief-cast.ts"))}`
    )
    .replaceAll(
      'from "./season"',
      `from ${JSON.stringify(join(ROOT, "lib/murals/season.ts"))}`
    )
    .replaceAll(
      'from "./types"',
      `from ${JSON.stringify(join(ROOT, "lib/murals/types.ts"))}`
    );
}

async function loadMainBuilders(dir: string) {
  for (const name of [
    "direction.ts",
    "brief-cast.ts",
    "build-brief-v2.ts",
    "build-brief-v3.ts",
  ]) {
    const source = execSync(`git show main:lib/murals/${name}`, {
      encoding: "utf8",
      cwd: ROOT,
    });
    writeFileSync(join(dir, name), rewriteMuralsImports(source, dir), "utf8");
  }
  const v3 = (await import(
    pathToFileURL(join(dir, "build-brief-v3.ts")).href
  )) as {
    buildBriefV3: (input: typeof v3Input) => string;
  };
  const v2 = (await import(
    pathToFileURL(join(dir, "build-brief-v2.ts")).href
  )) as {
    buildBriefV2: (input: typeof v2Input) => string;
  };
  return {
    buildBriefMainV3: v3.buildBriefV3,
    buildBriefMainV2: v2.buildBriefV2,
  };
}

function assertEqual(label: string, a: string, b: string) {
  if (a === b) {
    console.log(`PASS ${label} (len=${a.length}, sha256=${sha(a).slice(0, 12)}…)`);
    return;
  }
  console.error(`FAIL ${label}`);
  console.error(`  len a=${a.length} b=${b.length}`);
  console.error(`  sha a=${sha(a)}`);
  console.error(`  sha b=${sha(b)}`);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  console.error(`  first diff at ${i}`);
  console.error(`  a: ${JSON.stringify(a.slice(Math.max(0, i - 40), i + 80))}`);
  console.error(`  b: ${JSON.stringify(b.slice(Math.max(0, i - 40), i + 80))}`);
  process.exitCode = 1;
}

async function main() {
  const branchV3Omit = buildBriefV3({ ...v3Input });
  const branchV3Empty = buildBriefV3({
    ...v3Input,
    direction: { scene: "", cast: "" },
  });
  const branchV3Undefined = buildBriefV3({
    ...v3Input,
    direction: undefined,
  });
  const branchV2Omit = buildBriefV2({ ...v2Input });
  const branchV2Empty = buildBriefV2({
    ...v2Input,
    direction: { scene: "", cast: "" },
  });

  assertEqual("v3 omit === empty direction", branchV3Omit, branchV3Empty);
  assertEqual("v3 omit === undefined direction", branchV3Omit, branchV3Undefined);
  assertEqual("v2 omit === empty direction", branchV2Omit, branchV2Empty);

  mkdirSync(FIXTURE_DIR, { recursive: true });
  const v3Path = join(FIXTURE_DIR, "brief-v3-main-baseline.txt");
  const v2Path = join(FIXTURE_DIR, "brief-v2-main-baseline.txt");
  const metaPath = join(FIXTURE_DIR, "brief-baseline-meta.json");

  const tmp = mkdtempSync(join(tmpdir(), "murals-brief-proof-"));
  try {
    const { buildBriefMainV3, buildBriefMainV2 } = await loadMainBuilders(tmp);
    const mainV3 = buildBriefMainV3(v3Input);
    const mainV2 = buildBriefMainV2(v2Input);

    assertEqual("v3 branch empty === main", branchV3Omit, mainV3);
    assertEqual("v2 branch empty === main", branchV2Omit, mainV2);

    if (WRITE || !existsSync(v3Path) || !existsSync(v2Path)) {
      const mainCommit = execSync("git rev-parse main", {
        encoding: "utf8",
        cwd: ROOT,
      }).trim();
      writeFileSync(v3Path, mainV3, "utf8");
      writeFileSync(v2Path, mainV2, "utf8");
      writeFileSync(
        metaPath,
        JSON.stringify(
          {
            mainCommit,
            capturedAt: new Date().toISOString(),
            v3Sha256: sha(mainV3),
            v2Sha256: sha(mainV2),
          },
          null,
          2
        ) + "\n",
        "utf8"
      );
      console.log(`Wrote goldens from main@${mainCommit.slice(0, 7)}`);
    } else {
      const goldenV3 = readFileSync(v3Path, "utf8");
      const goldenV2 = readFileSync(v2Path, "utf8");
      assertEqual("v3 branch empty === golden", branchV3Omit, goldenV3);
      assertEqual("v2 branch empty === golden", branchV2Omit, goldenV2);
      const meta = JSON.parse(readFileSync(metaPath, "utf8")) as {
        mainCommit: string;
      };
      console.log(`Goldens from main@${meta.mainCommit.slice(0, 7)}`);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  if (process.exitCode && process.exitCode !== 0) {
    console.error("\nSafety proof FAILED: Auto/empty briefs differ from main.");
    process.exit(process.exitCode);
  }
  console.log("\nSafety proof OK: Auto/empty Scene+Cast briefs match main exactly.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
