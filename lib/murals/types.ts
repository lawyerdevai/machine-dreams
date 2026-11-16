import type { FrameKind } from "./frame";

export type MuralStatus = "pending" | "approved" | "rejected";

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
};

export type MuralItem = {
  id: string;
  status: MuralStatus;
  title: string;
  caption: string;
  imageUrl: string;
  seasonId: string;
  seasonName: string;
  /** Public season ordinal; optional on older records. */
  seasonNumber?: number;
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
  frameKind: FrameKind;
  seasonNumber?: number;
};

export type MuralHistory = {
  usedStyles: string[];
  usedPalettes: string[];
  usedCompositions: string[];
  usedFigures: string[];
  usedBeats: string[];
  lastSeasonId?: string;
};

export type GenerateFailureStage = "brief" | "image" | "vision" | "save";

export type GenerateAttemptFailure = {
  attempt: number;
  stage: GenerateFailureStage;
  message: string;
};
