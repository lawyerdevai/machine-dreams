import type { FrameKind } from "./frame";

export type MuralStatus = "pending" | "approved" | "rejected";

/** Public mural type: season chronicle vs one-off moment. Missing → moment. */
export type MuralKind = "season" | "moment";

export type NormieCastStatus =
  | "matched"
  | "ambiguous"
  | "not_found"
  | "error";

/** Looked-up Normie from pasted source (internal only). */
export type NormieCastMember = {
  name: string;
  tokenId?: number;
  type?: string;
  /** Full API traits (Details JSON). Brief may use directedDescription instead. */
  traits?: Record<string, string>;
  status: NormieCastStatus;
  /**
   * Directed-mode admin description for this cast line. When set, the brief
   * uses this instead of API traits; full traits stay on the record.
   */
  directedDescription?: string;
};

/** Full generator output stored under the mural record. */
export type MuralGeneratorRecord = {
  version: "v2" | "v3";
  engine: "v2" | "v3";
  style: string;
  medium: string;
  tone: string;
  moment: string;
  scene: string;
  level: string;
  cast: string;
  mixLevel?: string | null;
  styles?: string[];
  palette?: string | null;
  composition?: string | null;
  texture?: string | null;
  figures: string[];
  statement: string;
  flags: string[];
  camera?: string;
  beat?: string;
  figure?: string;
  flagged?: boolean;
  /** Pasted source text (admin / internal only; never public). */
  source?: string;
  /** Optional focus line for text-path generations (internal only). */
  focus?: string;
  /**
   * Normie cast looked up from source text (admin / internal only; never public).
   * Named normieCast to avoid clashing with cast (scene cast-size string).
   */
  normieCast?: NormieCastMember[];
  /** Directed-mode required scene/event (admin / internal only). */
  directedScene?: string;
  /** Directed-mode cast text, one Name: description per line (admin / internal). */
  directedCast?: string;
};

export type MuralItem = {
  id: string;
  status: MuralStatus;
  title: string;
  caption: string;
  imageUrl: string;
  seasonId: string;
  seasonName: string;
  /**
   * Season chronicle vs moment. Older records omit this; treat as "moment" on read.
   */
  kind?: MuralKind;
  /** Season ordinal; only meaningful when kind is "season". */
  seasonNumber?: number;
  /** Optional world day for kind "moment". */
  day?: number;
  createdAt: number;
  approvedAt: number | null;
  frameKind: FrameKind;
  record: MuralGeneratorRecord;
};

export type MuralPublicItem = {
  id: string;
  title: string;
  caption: string;
  imageUrl: string;
  seasonName: string;
  createdAt: number;
  kind: MuralKind;
  seasonNumber?: number;
  day?: number;
};

/** Normalize stored kind; records without it count as moment. */
export function muralKindOf(
  item: { kind?: MuralKind | string | null } | null | undefined
): MuralKind {
  return item?.kind === "season" ? "season" : "moment";
}

export type MuralHistory = {
  usedStyles: string[];
  usedPalettes: string[];
  usedCompositions: string[];
  usedFigures: string[];
  usedBeats: string[];
  lastSeasonId?: string;
};

export type GenerateFailureStage =
  | "lookup"
  | "brief"
  | "image"
  | "vision"
  | "save";

export type GenerateAttemptFailure = {
  attempt: number;
  stage: GenerateFailureStage;
  message: string;
};
