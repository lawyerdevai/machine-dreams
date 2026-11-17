import { randomUUID } from "crypto";
import { runV2, type RunV2Result } from "./engine-v2";
import { runV3, type RunV3Result } from "./engine-v3";
import { frameKindFor } from "./frame";
import {
  normalizeDirection,
  type MuralDirection,
} from "./direction";
import {
  buildDirectedNormieCast,
  buildNormieCast,
} from "./normies";
import {
  getSeasonRecord,
  seasonRecordFromSource,
  type SeasonRecord,
} from "./season";
import {
  listMuralItems,
  loadHistory,
  nextSeasonNumber,
  saveHistory,
  saveMuralItem,
  uploadMuralPng,
} from "./store";
import type {
  GenerateAttemptFailure,
  MuralGeneratorRecord,
  MuralItem,
  MuralKind,
  NormieCastMember,
} from "./types";

export type { GenerateAttemptFailure, GenerateFailureStage } from "./types";

export type GenerateMuralResult =
  | { ok: true; item: MuralItem }
  | {
      ok: false;
      error: string;
      attempts: GenerateAttemptFailure[];
    };

type EngineOk = Extract<RunV2Result, { ok: true }> | Extract<RunV3Result, { ok: true }>;

async function saveSuccess(
  result: EngineOk,
  history: Awaited<ReturnType<typeof loadHistory>>,
  opts: {
    kind: MuralKind;
    seasonNumber?: number;
    day?: number;
    sourceMeta?: {
      source?: string;
      focus?: string;
      normieCast?: NormieCastMember[];
      directedScene?: string;
      directedCast?: string;
    };
  }
): Promise<MuralItem> {
  const id = randomUUID().replace(/-/g, "").slice(0, 16);
  const imageUrl = await uploadMuralPng(id, result.imageBytes);
  const createdAt = Date.now();
  const frameKind = frameKindFor(result.style, result.medium);

  const figures =
    result.version === "v3"
      ? result.figures
      : result.figure
        ? [result.figure]
        : [];

  const record: MuralGeneratorRecord = {
    version: result.version,
    engine: result.engine,
    style: result.style,
    medium: result.medium,
    tone: result.tone,
    moment: result.moment,
    scene: result.scene,
    level: result.violenceLevel,
    cast: result.castSize,
    mixLevel: result.version === "v3" ? result.mixLevel : null,
    styles: result.version === "v3" ? result.styles : undefined,
    palette: result.version === "v3" ? result.palette : null,
    composition: result.version === "v3" ? result.composition : null,
    texture: result.version === "v3" ? result.texture : null,
    figures,
    statement: result.statement,
    flags: result.flags,
    camera: result.version === "v2" ? result.camera : undefined,
    beat: result.beat,
    figure: result.version === "v2" ? result.figure : undefined,
    flagged: result.flagged,
    ...(opts.sourceMeta?.source ? { source: opts.sourceMeta.source } : {}),
    ...(opts.sourceMeta?.focus ? { focus: opts.sourceMeta.focus } : {}),
    ...(opts.sourceMeta?.normieCast
      ? { normieCast: opts.sourceMeta.normieCast }
      : {}),
    ...(opts.sourceMeta?.directedScene
      ? { directedScene: opts.sourceMeta.directedScene }
      : {}),
    ...(opts.sourceMeta?.directedCast
      ? { directedCast: opts.sourceMeta.directedCast }
      : {}),
  };

  const item: MuralItem = {
    id,
    status: "pending",
    title: result.title,
    caption: result.caption,
    imageUrl,
    seasonId: result.seasonId,
    seasonName: result.seasonName,
    kind: opts.kind,
    ...(opts.kind === "season" && opts.seasonNumber !== undefined
      ? { seasonNumber: opts.seasonNumber }
      : {}),
    ...(opts.kind === "moment" && opts.day !== undefined
      ? { day: opts.day }
      : {}),
    createdAt,
    approvedAt: null,
    frameKind,
    record,
  };

  await saveMuralItem(item);

  const nextStyles =
    result.version === "v3" && result.styles.length > 0
      ? [...result.styles, ...history.usedStyles]
      : [result.style, ...history.usedStyles];
  const nextPalettes =
    result.version === "v3" && result.palette
      ? [result.palette, ...history.usedPalettes]
      : history.usedPalettes;
  const nextCompositions =
    result.version === "v3" && result.composition
      ? [result.composition, ...history.usedCompositions]
      : history.usedCompositions;
  const nextFigures = [...figures, ...history.usedFigures];
  const nextBeats = result.beat
    ? [result.beat, ...history.usedBeats]
    : history.usedBeats;

  await saveHistory({
    usedStyles: nextStyles.slice(0, 20),
    usedPalettes: nextPalettes.slice(0, 8),
    usedCompositions: nextCompositions.slice(0, 8),
    usedFigures: nextFigures.slice(0, 10),
    usedBeats: nextBeats.slice(0, 10),
    lastSeasonId: result.seasonId,
  });

  return item;
}

/**
 * Flip a coin between v2 and v3, generate, save as pending under the env NS.
 * Retries up to 3 times, re-rolling engine/kits/style each attempt.
 * When `source` is set, uses the text path; otherwise the built-in test-data path.
 */
/**
 * Pull day from pasted source when Day was left empty.
 * Only a whole line "DAY N" (case-insensitive) counts; if several distinct
 * values appear, leave day empty.
 */
export function dayFromSourceText(source: string): number | undefined {
  const found = new Set<number>();
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = /^day\s+(\d+)$/i.exec(line);
    if (!match) continue;
    const n = Number(match[1]);
    if (!Number.isInteger(n) || n < 1) continue;
    found.add(n);
  }
  if (found.size !== 1) return undefined;
  return [...found][0];
}

export async function generateMural(opts?: {
  seasonId?: string;
  seasonNumber?: number;
  source?: string;
  focus?: string;
  kind?: MuralKind;
  day?: number;
  /** Directed scene/cast; empty/omitted keeps Auto brief identical to main. */
  direction?: MuralDirection;
}): Promise<GenerateMuralResult> {
  const history = await loadHistory();
  const attempts: GenerateAttemptFailure[] = [];

  const kind: MuralKind = opts?.kind === "season" ? "season" : "moment";

  const explicitSeasonNumber =
    typeof opts?.seasonNumber === "number" &&
    Number.isInteger(opts.seasonNumber) &&
    opts.seasonNumber > 0
      ? opts.seasonNumber
      : undefined;

  const seasonNumber =
    kind === "season"
      ? explicitSeasonNumber ?? nextSeasonNumber(await listMuralItems())
      : explicitSeasonNumber;

  const source =
    typeof opts?.source === "string" ? opts.source.trim() : undefined;
  const focus =
    typeof opts?.focus === "string" && opts.focus.trim()
      ? opts.focus.trim()
      : undefined;

  const direction = normalizeDirection(opts?.direction);

  const explicitDay =
    typeof opts?.day === "number" &&
    Number.isInteger(opts.day) &&
    opts.day > 0
      ? opts.day
      : undefined;
  const day =
    kind === "moment"
      ? explicitDay ??
        (source ? dayFromSourceText(source) : undefined)
      : undefined;

  const season: SeasonRecord = source
    ? seasonRecordFromSource({
        seasonNumber: seasonNumber ?? 1,
        source,
        ...(focus ? { focus } : {}),
      })
    : getSeasonRecord(opts?.seasonId ?? history.lastSeasonId);

  let normieCast: NormieCastMember[] | undefined;
  const directedCastText = direction?.cast;
  if (directedCastText) {
    console.info(`[murals] generate stage=lookup directed starting`);
    try {
      normieCast = await buildDirectedNormieCast(directedCastText);
      const matched = normieCast.filter((m) => m.status === "matched").length;
      console.info(
        `[murals] generate stage=lookup directed done names=${normieCast.length} matched=${matched}`
      );
    } catch (error) {
      console.warn(
        `[murals] generate stage=lookup directed failed (continuing without cast): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      normieCast = [];
    }
  } else if (source) {
    console.info(`[murals] generate stage=lookup starting`);
    try {
      normieCast = await buildNormieCast(source);
      const matched = normieCast.filter((m) => m.status === "matched").length;
      console.info(
        `[murals] generate stage=lookup done names=${normieCast.length} matched=${matched}`
      );
    } catch (error) {
      console.warn(
        `[murals] generate stage=lookup failed (continuing without cast): ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      normieCast = [];
    }
  }

  const sourceMeta =
    source || direction || normieCast
      ? {
          ...(source ? { source } : {}),
          ...(focus ? { focus } : {}),
          ...(normieCast ? { normieCast } : {}),
          ...(direction?.scene ? { directedScene: direction.scene } : {}),
          ...(direction?.cast ? { directedCast: direction.cast } : {}),
        }
      : undefined;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const engine = Math.random() < 0.5 ? "v2" : "v3";
    const shared = {
      lastSeasonId: history.lastSeasonId,
      season,
      usedMedia: [] as string[],
      usedStyles: history.usedStyles,
      usedFigures: history.usedFigures,
      usedBeats: history.usedBeats,
      ...(normieCast ? { normieCast } : {}),
      ...(direction ? { direction } : {}),
    };

    const result =
      engine === "v2"
        ? await runV2(shared)
        : await runV3({
            ...shared,
            usedPalettes: history.usedPalettes,
            usedCompositions: history.usedCompositions,
          });

    if (!result.ok) {
      const failure: GenerateAttemptFailure = {
        attempt,
        stage: result.stage,
        message: result.message,
      };
      attempts.push(failure);
      console.error(
        `[murals] generate attempt ${attempt} failed stage=${failure.stage}: ${failure.message}`
      );
      continue;
    }

    try {
      const item = await saveSuccess(result, history, {
        kind,
        ...(seasonNumber !== undefined ? { seasonNumber } : {}),
        ...(day !== undefined ? { day } : {}),
        ...(sourceMeta ? { sourceMeta } : {}),
      });
      return { ok: true, item };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Save failed. Please try again.";
      const failure: GenerateAttemptFailure = {
        attempt,
        stage: "save",
        message,
      };
      attempts.push(failure);
      console.error(
        `[murals] generate attempt ${attempt} failed stage=save: ${message}`
      );
    }
  }

  return {
    ok: false,
    error: "All generation attempts failed.",
    attempts,
  };
}
