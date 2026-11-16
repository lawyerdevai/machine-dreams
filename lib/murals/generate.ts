import { randomUUID } from "crypto";
import { runV2, type RunV2Result } from "./engine-v2";
import { runV3, type RunV3Result } from "./engine-v3";
import { frameKindFor } from "./frame";
import { getSeasonRecord } from "./season";
import {
  loadHistory,
  saveHistory,
  saveMuralItem,
  uploadMuralPng,
} from "./store";
import type {
  GenerateAttemptFailure,
  MuralGeneratorRecord,
  MuralItem,
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
  history: Awaited<ReturnType<typeof loadHistory>>
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
  };

  const item: MuralItem = {
    id,
    status: "pending",
    title: result.title,
    caption: result.caption,
    imageUrl,
    seasonId: result.seasonId,
    seasonName: result.seasonName,
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
 */
export async function generateMural(opts?: {
  seasonId?: string;
}): Promise<GenerateMuralResult> {
  const history = await loadHistory();
  const season = getSeasonRecord(opts?.seasonId ?? history.lastSeasonId);
  const attempts: GenerateAttemptFailure[] = [];

  for (let attempt = 1; attempt <= 3; attempt++) {
    const engine = Math.random() < 0.5 ? "v2" : "v3";
    const shared = {
      lastSeasonId: history.lastSeasonId,
      season,
      usedMedia: [] as string[],
      usedStyles: history.usedStyles,
      usedFigures: history.usedFigures,
      usedBeats: history.usedBeats,
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
      const item = await saveSuccess(result, history);
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
