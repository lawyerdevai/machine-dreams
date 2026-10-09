/**
 * One-off: load data/datagrams/2026-10-05.json into Upstash via lib/datagrams/store.ts putWeek.
 * Usage (from repo root): node scripts/seed-datagrams.mjs
 */
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error("Missing .env.local");
    process.exit(1);
  }
  for (const raw of text.split(/\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let val = line.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvLocal();

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN missing");
  process.exit(1);
}

const runner = resolve(root, "scripts/.seed-datagrams-run.ts");
writeFileSync(
  runner,
  `
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { putWeek, getWeek, listWeeks } from "../lib/datagrams/store";

async function main() {
  const file = resolve(process.cwd(), "data/datagrams/2026-10-05.json");
  const rec = JSON.parse(readFileSync(file, "utf8"));
  await putWeek(rec);
  const got = await getWeek(rec.weekKey);
  const weeks = await listWeeks();
  console.log(JSON.stringify({
    ok: Boolean(got),
    weekKey: got?.weekKey ?? null,
    title: got?.title ?? null,
    published: got?.published ?? null,
    genesis: got?.genesis ?? null,
    sha256Prefix: got?.sha256 ? got.sha256.slice(0, 12) : null,
    listCount: weeks.length,
  }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
`
);

const result = spawnSync("npx", ["--yes", "tsx", runner], {
  cwd: root,
  env: process.env,
  encoding: "utf8",
});

try {
  unlinkSync(runner);
} catch {
  /* ignore */
}

if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);
