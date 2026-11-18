"use client";

import { upload } from "@vercel/blob/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { blobMotionPath } from "@/lib/murals/ns";
import type {
  GenerateAttemptFailure,
  MuralItem,
  MuralKind,
  MuralMotion,
  MuralStatus,
  NormieCastMember,
} from "@/lib/murals/types";
import { muralKindOf, muralMotionOf } from "@/lib/murals/types";

const KEY_STORAGE = "murals-admin-key";
const MOTION_MAX_BYTES = 6 * 1024 * 1024;

type RowDraft = {
  title: string;
  caption: string;
  status: MuralStatus;
  kind: MuralKind;
  seasonNumber: string;
  day: string;
};

type CastLineRow = {
  id: string;
  name: string;
  description: string;
};

function newCastLineId() {
  return `cast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyCastLine(): CastLineRow {
  return { id: newCastLineId(), name: "", description: "" };
}

function serializeCastLines(lines: CastLineRow[]): string {
  return lines
    .map((line) => {
      const name = line.name.trim();
      if (!name) return "";
      const description = line.description.trim();
      return description ? `${name}: ${description}` : name;
    })
    .filter(Boolean)
    .join("\n");
}

function isDevEnv() {
  return process.env.NODE_ENV === "development";
}

function seasonNumberLabel(item: MuralItem): string {
  return typeof item.seasonNumber === "number" ? String(item.seasonNumber) : "";
}

function dayLabel(item: MuralItem): string {
  return typeof item.day === "number" ? String(item.day) : "";
}

function nextSeasonFromItems(list: MuralItem[]): number {
  let max = 0;
  for (const item of list) {
    if (muralKindOf(item) !== "season") continue;
    if (
      typeof item.seasonNumber === "number" &&
      Number.isFinite(item.seasonNumber)
    ) {
      max = Math.max(max, Math.trunc(item.seasonNumber));
    }
  }
  return max + 1;
}

function draftFromItem(item: MuralItem): RowDraft {
  return {
    title: item.title,
    caption: item.caption,
    status: item.status,
    kind: muralKindOf(item),
    seasonNumber: seasonNumberLabel(item),
    day: dayLabel(item),
  };
}

function isTextPathRecord(item: MuralItem): boolean {
  return Boolean(item.record.source || item.record.normieCast);
}

/** Hide seasonName in the meta line when it only repeats the season number. */
function readVideoMeta(
  file: File
): Promise<{ width: number; height: number; seconds: number }> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.removeAttribute("src");
      video.load();
    };
    video.onloadedmetadata = () => {
      const width = Math.round(video.videoWidth);
      const height = Math.round(video.videoHeight);
      const seconds = video.duration;
      cleanup();
      if (
        !Number.isFinite(width) ||
        width <= 0 ||
        !Number.isFinite(height) ||
        height <= 0 ||
        !Number.isFinite(seconds) ||
        seconds <= 0
      ) {
        reject(new Error("Could not read video dimensions/duration."));
        return;
      }
      resolve({
        width,
        height,
        seconds: Math.round(seconds * 10) / 10,
      });
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("Could not load video metadata."));
    };
    video.src = objectUrl;
  });
}

function metaSeasonName(item: MuralItem): string | null {
  const num = seasonNumberLabel(item);
  const name = item.seasonName.trim();
  if (!name) return null;
  if (num && new RegExp(`^season\\s*${num}$`, "i").test(name)) return null;
  return item.seasonName;
}

function castDetails(cast: NormieCastMember[] | undefined) {
  const list = cast ?? [];
  const unmatched = list.filter((m) => m.status !== "matched");
  return { list, unmatched };
}

/** Compact one-line cast summary for the row chrome. */
function castStatusLine(cast: NormieCastMember[] | undefined): string | null {
  const list = cast ?? [];
  if (list.length === 0) return null;
  return list
    .map((m) => {
      const bits = [m.name, m.status];
      if (m.tokenId != null) bits.push(`#${m.tokenId}`);
      if (m.type) bits.push(m.type);
      return bits.join(" ");
    })
    .join(" · ");
}

export default function MuralsAdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [keyReady, setKeyReady] = useState(false);
  const [items, setItems] = useState<MuralItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<GenerateAttemptFailure[]>(
    []
  );
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [autoApprove, setAutoApprove] = useState(false);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowConfirm, setRowConfirm] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [generateMode, setGenerateMode] = useState<"auto" | "directed">(
    "auto"
  );
  const [engineChoice, setEngineChoice] = useState<"random" | "v2" | "v3">(
    "random"
  );
  const [sourceKind, setSourceKind] = useState<MuralKind>("moment");
  const [sourceSeason, setSourceSeason] = useState("");
  const [sourceDay, setSourceDay] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceFocus, setSourceFocus] = useState("");
  const [directedScene, setDirectedScene] = useState("");
  const [castLines, setCastLines] = useState<CastLineRow[]>([emptyCastLine()]);
  const [describeBusyId, setDescribeBusyId] = useState<string | null>(null);
  const castFileInputsRef = useRef<Record<string, HTMLInputElement | null>>(
    {}
  );
  const [testingOpen, setTestingOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importKind, setImportKind] = useState<MuralKind>("moment");
  const [importDay, setImportDay] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importCaption, setImportCaption] = useState("");
  const [importDetails, setImportDetails] = useState("");
  const [importing, setImporting] = useState(false);
  const stopBatchRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const nextSeasonPrefill = nextSeasonFromItems(items);

  const lockAdmin = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
    setAdminKey("");
    setKeyReady(false);
    setNotice(null);
    setItems([]);
  }, []);

  useEffect(() => {
    if (isDevEnv()) {
      setKeyReady(true);
      return;
    }
    const stored = sessionStorage.getItem(KEY_STORAGE) ?? "";
    setAdminKey(stored);
    setKeyReady(Boolean(stored.trim()));
  }, []);

  const headers = useCallback((): HeadersInit => {
    const h: HeadersInit = { "Content-Type": "application/json" };
    if (!isDevEnv() && adminKey.trim()) {
      h["x-admin-key"] = adminKey.trim();
    }
    return h;
  }, [adminKey]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch("/api/murals/admin/list", { headers: headers() });
      if (res.status === 401) {
        lockAdmin();
        return;
      }
      if (res.status === 429) {
        lockAdmin();
        setNotice("Too many failed attempts. Try again later.");
        return;
      }
      const data = (await res.json()) as { ok?: boolean; items?: MuralItem[] };
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
      setSourceSeason((prev) =>
        prev.trim() ? prev : String(nextSeasonFromItems(list))
      );
      const nextDrafts: Record<string, RowDraft> = {};
      for (const item of list) {
        nextDrafts[item.id] = draftFromItem(item);
      }
      setDrafts(nextDrafts);
    } catch {
      setNotice("Could not load murals.");
    } finally {
      setLoading(false);
    }
  }, [headers, lockAdmin]);

  useEffect(() => {
    if (keyReady) void refresh();
  }, [keyReady, refresh]);

  function unlockAdmin() {
    const value = adminKey.trim();
    if (!value) return;
    sessionStorage.setItem(KEY_STORAGE, value);
    setKeyReady(true);
  }

  function flashConfirm(id: string, label: string) {
    setRowConfirm((prev) => ({ ...prev, [id]: label }));
    window.setTimeout(() => {
      setRowConfirm((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 2000);
  }

  function upsertItem(item: MuralItem) {
    setItems((prev) => {
      const without = prev.filter((row) => row.id !== item.id);
      return [item, ...without];
    });
    setDrafts((prev) => ({
      ...prev,
      [item.id]: draftFromItem(item),
    }));
  }

  async function requestGenerate(body: {
    kind?: MuralKind;
    seasonNumber?: number;
    day?: number;
    source?: string;
    focus?: string;
    scene?: string;
    cast?: string;
    engine?: "random" | "v2" | "v3";
  }): Promise<{
    ok: boolean;
    item?: MuralItem;
    error?: string;
    attempts?: GenerateAttemptFailure[];
  }> {
    const res = await fetch("/api/murals/admin/generate", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      lockAdmin();
      return { ok: false };
    }
    if (res.status === 429) {
      lockAdmin();
      setNotice("Too many failed attempts. Try again later.");
      return { ok: false };
    }
    const data = (await res.json()) as {
      ok?: boolean;
      item?: MuralItem;
      error?: string;
      message?: string;
      attempts?: GenerateAttemptFailure[];
    };
    if (!res.ok || !data.ok || !data.item) {
      return {
        ok: false,
        error: data.error ?? data.message ?? "Generate failed.",
        attempts: Array.isArray(data.attempts) ? data.attempts : [],
      };
    }
    return { ok: true, item: data.item };
  }

  async function approveItem(id: string): Promise<boolean> {
    const res = await fetch(`/api/murals/admin/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status: "approved" }),
    });
    if (res.status === 401 || res.status === 429) {
      lockAdmin();
      return false;
    }
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as {
      item?: MuralItem;
    } | null;
    if (data?.item) upsertItem(data.item);
    return Boolean(data?.item);
  }

  async function generateNew() {
    if (generating || batchRunning) return;
    setGenerating(true);
    setNotice(null);
    setFailedAttempts([]);
    setBatchErrors([]);
    try {
      const result = await requestGenerate({
        kind: "moment",
        ...(engineChoice === "random" ? {} : { engine: engineChoice }),
      });
      if (!result.ok || !result.item) {
        setNotice(result.error ?? "Generate failed.");
        setFailedAttempts(result.attempts ?? []);
        return;
      }
      upsertItem(result.item);
      if (isDevEnv() && autoApprove) {
        await approveItem(result.item.id);
      }
    } catch {
      setNotice("Generate failed.");
      setFailedAttempts([]);
    } finally {
      setGenerating(false);
    }
  }

  async function describeCastFromImage(lineId: string, file?: File | null) {
    if (describeBusyId || generating || batchRunning) return;
    const line = castLines.find((row) => row.id === lineId);
    if (!line) return;
    const query = line.name.trim();
    if (!file && !query) {
      setNotice("Enter a name or token ID, or choose an image first.");
      return;
    }
    setDescribeBusyId(lineId);
    setNotice(null);
    try {
      const form = new FormData();
      if (file) form.append("image", file);
      if (query) form.append("query", query);
      const h: HeadersInit = {};
      if (!isDevEnv() && adminKey.trim()) {
        h["x-admin-key"] = adminKey.trim();
      }
      const res = await fetch("/api/murals/admin/describe-cast", {
        method: "POST",
        headers: h,
        body: form,
      });
      if (res.status === 401 || res.status === 429) {
        lockAdmin();
        if (res.status === 429) {
          setNotice("Too many attempts. Try again later.");
        }
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        description?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.description) {
        setNotice(data?.error ?? "Describe from image failed.");
        return;
      }
      setCastLines((prev) =>
        prev.map((row) =>
          row.id === lineId ? { ...row, description: data.description! } : row
        )
      );
      setNotice("Description filled — edit as needed.");
    } catch {
      setNotice("Describe from image failed.");
    } finally {
      setDescribeBusyId(null);
      const input = castFileInputsRef.current[lineId];
      if (input) input.value = "";
    }
  }

  async function generateFromSource() {
    if (generating || batchRunning) return;
    const source = sourceText.trim();
    const scene = directedScene.trim();
    const cast = serializeCastLines(castLines);
    const directed = generateMode === "directed";
    if (!directed && !source) {
      setNotice("Paste source text first.");
      setFailedAttempts([]);
      return;
    }
    if (directed && !source && !scene && !cast) {
      setNotice("Add a Scene, Cast, or Source for Directed mode.");
      setFailedAttempts([]);
      return;
    }
    let seasonNumber: number | undefined;
    if (sourceKind === "season") {
      const seasonRaw = sourceSeason.trim();
      seasonNumber = seasonRaw
        ? Number(seasonRaw)
        : nextSeasonFromItems(itemsRef.current);
      if (!Number.isInteger(seasonNumber) || seasonNumber < 1) {
        setNotice("Season number must be a positive integer.");
        setFailedAttempts([]);
        return;
      }
    }
    let day: number | undefined;
    if (sourceKind === "moment") {
      const dayRaw = sourceDay.trim();
      if (dayRaw) {
        day = Number(dayRaw);
        if (!Number.isInteger(day) || day < 1) {
          setNotice("Day must be a positive integer.");
          setFailedAttempts([]);
          return;
        }
      }
    }
    setGenerating(true);
    setNotice(null);
    setFailedAttempts([]);
    setBatchErrors([]);
    try {
      const focus = sourceFocus.trim();
      const result = await requestGenerate({
        kind: sourceKind,
        ...(seasonNumber !== undefined ? { seasonNumber } : {}),
        ...(day !== undefined ? { day } : {}),
        ...(source ? { source } : {}),
        ...(focus ? { focus } : {}),
        ...(directed && scene ? { scene } : {}),
        ...(directed && cast ? { cast } : {}),
        ...(engineChoice === "random" ? {} : { engine: engineChoice }),
      });
      if (!result.ok || !result.item) {
        setNotice(result.error ?? "Generate failed.");
        setFailedAttempts(result.attempts ?? []);
        return;
      }
      upsertItem(result.item);
      if (sourceKind === "season" && seasonNumber !== undefined) {
        setSourceSeason(String(seasonNumber + 1));
      }
      if (isDevEnv() && autoApprove) {
        await approveItem(result.item.id);
      }
    } catch {
      setNotice("Generate failed.");
      setFailedAttempts([]);
    } finally {
      setGenerating(false);
    }
  }

  async function generateBatch(count: number) {
    if (generating || batchRunning) return;
    stopBatchRef.current = false;
    setBatchRunning(true);
    setGenerating(true);
    setNotice(null);
    setFailedAttempts([]);
    setBatchErrors([]);

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      for (let i = 1; i <= count; i++) {
        if (stopBatchRef.current) break;
        setNotice(`Generating ${i} of ${count}...`);
        try {
          const result = await requestGenerate({
            kind: "moment",
            ...(engineChoice === "random" ? {} : { engine: engineChoice }),
          });
          if (!result.ok || !result.item) {
            failed += 1;
            const detail =
              result.attempts && result.attempts.length > 0
                ? result.attempts
                    .map((a) => `${a.stage}: ${a.message}`)
                    .join("; ")
                : (result.error ?? "Generate failed.");
            errors.push(`#${i}: ${detail}`);
            continue;
          }
          upsertItem(result.item);
          if (isDevEnv() && autoApprove) {
            const approved = await approveItem(result.item.id);
            if (!approved) {
              errors.push(`#${i}: generated but approve failed`);
            }
          }
          succeeded += 1;
        } catch (error) {
          failed += 1;
          const message =
            error instanceof Error ? error.message : "Generate failed.";
          errors.push(`#${i}: ${message}`);
        }
      }
      setBatchErrors(errors);
      const stopped = stopBatchRef.current
        ? " Stopped after current piece."
        : "";
      setNotice(
        `${succeeded} succeeded, ${failed} failed.${stopped}`.trim()
      );
    } finally {
      setBatchRunning(false);
      setGenerating(false);
      stopBatchRef.current = false;
    }
  }

  function stopBatch() {
    stopBatchRef.current = true;
    setNotice("Stopping after current piece…");
  }

  async function patchItem(
    id: string,
    patch: Partial<{
      title: string;
      caption: string;
      status: MuralStatus;
      seasonNumber: number;
      kind: MuralKind;
      day: number | null;
      motion: MuralMotion | null;
    }>,
    confirmLabel?: string
  ) {
    setRowError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/murals/admin/${id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(patch),
      });
      if (res.status === 401 || res.status === 429) {
        lockAdmin();
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        item?: MuralItem;
        error?: string;
      } | null;
      if (!res.ok || !data?.item) {
        setRowError((prev) => ({
          ...prev,
          [id]: data?.error ?? "Update failed.",
        }));
        return;
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? data.item! : item))
      );
      setDrafts((prev) => ({
        ...prev,
        [id]: draftFromItem(data.item!),
      }));
      if (confirmLabel) flashConfirm(id, confirmLabel);
    } catch {
      setRowError((prev) => ({ ...prev, [id]: "Update failed." }));
    } finally {
      setRowBusy((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function uploadMotion(id: string, file: File) {
    if (rowBusy[id]) return;
    if (file.type !== "video/mp4" && !file.name.toLowerCase().endsWith(".mp4")) {
      setRowError((prev) => ({
        ...prev,
        [id]: "Motion must be an .mp4 file.",
      }));
      return;
    }
    if (file.size > MOTION_MAX_BYTES) {
      setRowError((prev) => ({
        ...prev,
        [id]: `Motion file is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max 6 MB.`,
      }));
      return;
    }
    setRowError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    try {
      const meta = await readVideoMeta(file);
      const authHeaders: Record<string, string> = {};
      if (!isDevEnv() && adminKey.trim()) {
        authHeaders["x-admin-key"] = adminKey.trim();
      }
      const blob = await upload(blobMotionPath(id), file, {
        access: "public",
        handleUploadUrl: "/api/murals/admin/motion-upload",
        clientPayload: id,
        headers: authHeaders,
        contentType: "video/mp4",
      });
      const motion: MuralMotion = {
        url: blob.url,
        width: meta.width,
        height: meta.height,
        seconds: meta.seconds,
      };
      await patchItem(id, { motion }, "Motion saved");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Motion upload failed.";
      setRowError((prev) => ({ ...prev, [id]: message }));
      setRowBusy((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function removeMotion(id: string) {
    if (!window.confirm("Remove motion clip from this mural?")) return;
    await patchItem(id, { motion: null }, "Motion removed");
  }

  async function removeItem(id: string) {
    if (!window.confirm("Delete this mural and its image?")) return;
    setRowError((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setRowBusy((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/murals/admin/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (res.status === 401 || res.status === 429) {
        lockAdmin();
        return;
      }
      if (!res.ok) {
        setRowError((prev) => ({ ...prev, [id]: "Delete failed." }));
        return;
      }
      flashConfirm(id, "Deleted");
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch {
      setRowError((prev) => ({ ...prev, [id]: "Delete failed." }));
    } finally {
      setRowBusy((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function importMural() {
    setNotice(null);
    setFailedAttempts([]);
    let details: unknown;
    const detailsTrim = importDetails.trim();
    if (detailsTrim) {
      try {
        details = JSON.parse(detailsTrim) as unknown;
      } catch {
        setNotice("Import details must be valid JSON.");
        return;
      }
      if (
        details === null ||
        typeof details !== "object" ||
        Array.isArray(details)
      ) {
        setNotice("Import details must be a JSON object.");
        return;
      }
    }

    setImporting(true);
    try {
      const dayNum = Number(importDay.trim());
      const res = await fetch("/api/murals/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify({
          imageUrl: importUrl.trim(),
          type: importKind,
          ...(importDay.trim() && Number.isInteger(dayNum) && dayNum > 0
            ? { day: dayNum }
            : {}),
          title: importTitle.trim(),
          caption: importCaption.trim(),
          ...(details ? { details } : {}),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        id?: string;
        error?: string;
      } | null;
      if (!res.ok || !data?.ok || !data.id) {
        setNotice(data?.error || "Import failed.");
        return;
      }
      setNotice(`Imported ${data.id} as pending.`);
      setImportUrl("");
      setImportDay("");
      setImportTitle("");
      setImportCaption("");
      setImportDetails("");
      await refresh();
    } finally {
      setImporting(false);
    }
  }

  const generateBusy = generating || batchRunning || importing;

  if (!keyReady && !isDevEnv()) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12 text-[#0a0a0a]">
        <h1 className="page-title text-2xl uppercase tracking-wide">
          Murals Admin
        </h1>
        <label className="flex flex-col gap-2 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
          Admin key
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") unlockAdmin();
            }}
            className="border border-[#0a0a0a] bg-transparent px-3 py-2 font-mono text-sm normal-case tracking-normal text-[#0a0a0a]"
            autoComplete="current-password"
          />
        </label>
        <button
          type="button"
          onClick={unlockAdmin}
          className="btn-minimal self-start"
        >
          Unlock
        </button>
        {notice ? <p className="font-serif text-[#0a0a0a]">{notice}</p> : null}
      </main>
    );
  }

  const seasonInputValue =
    sourceSeason.trim() || String(nextSeasonPrefill || 1);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12 text-[#0a0a0a]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="page-title text-2xl uppercase tracking-wide">
            Murals Admin
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
            Review pending generations
          </p>
        </div>
        {!isDevEnv() ? (
          <button
            type="button"
            onClick={lockAdmin}
            className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666] underline-offset-2 hover:underline"
          >
            Lock
          </button>
        ) : null}
      </div>

      <section className="flex flex-col gap-4 border border-[#0a0a0a] p-4">
        <h2 className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
          New mural
        </h2>
        <fieldset className="flex flex-wrap gap-4 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
          <legend className="sr-only">Generate mode</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="generate-mode"
              value="auto"
              checked={generateMode === "auto"}
              disabled={generateBusy}
              onChange={() => setGenerateMode("auto")}
            />
            Auto
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="generate-mode"
              value="directed"
              checked={generateMode === "directed"}
              disabled={generateBusy}
              onChange={() => setGenerateMode("directed")}
            />
            Directed
          </label>
        </fieldset>
        <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
          Type
          <select
            value={sourceKind}
            disabled={generateBusy}
            onChange={(e) =>
              setSourceKind(e.target.value === "season" ? "season" : "moment")
            }
            className="w-40 border border-[#0a0a0a] bg-transparent px-2 py-1 font-mono text-sm text-[#0a0a0a] disabled:opacity-40"
          >
            <option value="moment">Moment</option>
            <option value="season">Season</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
          Engine
          <select
            value={engineChoice}
            disabled={generateBusy}
            onChange={(e) => {
              const v = e.target.value;
              setEngineChoice(
                v === "v2" || v === "v3" ? v : "random"
              );
            }}
            className="w-40 border border-[#0a0a0a] bg-transparent px-2 py-1 font-mono text-sm text-[#0a0a0a] disabled:opacity-40"
          >
            <option value="random">Random</option>
            <option value="v2">v2</option>
            <option value="v3">v3</option>
          </select>
        </label>
        {sourceKind === "season" ? (
          <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
            Season number
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={seasonInputValue}
              disabled={generateBusy}
              onChange={(e) => setSourceSeason(e.target.value)}
              className="w-28 border border-[#0a0a0a] bg-transparent px-2 py-1 font-mono text-sm normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
            />
          </label>
        ) : null}
        {sourceKind === "moment" ? (
          <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
            Day{generateMode === "directed" ? " (optional)" : ""}
            <input
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              value={sourceDay}
              disabled={generateBusy}
              placeholder="Optional"
              onChange={(e) => setSourceDay(e.target.value)}
              className="w-28 border border-[#0a0a0a] bg-transparent px-2 py-1 font-mono text-sm normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
            />
          </label>
        ) : null}
        {generateMode === "directed" ? (
          <>
            <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
              Scene
              <input
                type="text"
                value={directedScene}
                disabled={generateBusy}
                maxLength={1000}
                placeholder="The event that must happen in the picture"
                onChange={(e) => setDirectedScene(e.target.value)}
                className="border border-[#0a0a0a] bg-transparent px-2 py-1 font-serif text-base normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
              />
            </label>
            <div className="flex flex-col gap-2">
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Cast
              </p>
              <ul className="flex flex-col gap-3">
                {castLines.map((line) => (
                  <li
                    key={line.id}
                    className="flex flex-col gap-2 border border-[#0a0a0a] p-3"
                  >
                    <div className="flex flex-wrap items-end gap-2">
                      <label className="flex min-w-[8rem] flex-1 flex-col gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
                        Name / token ID
                        <input
                          type="text"
                          value={line.name}
                          disabled={generateBusy || describeBusyId === line.id}
                          maxLength={80}
                          placeholder="Name or token ID"
                          onChange={(e) =>
                            setCastLines((prev) =>
                              prev.map((row) =>
                                row.id === line.id
                                  ? { ...row, name: e.target.value }
                                  : row
                              )
                            )
                          }
                          className="border border-[#0a0a0a] bg-transparent px-2 py-1 font-serif text-base normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={(el) => {
                            castFileInputsRef.current[line.id] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={generateBusy || describeBusyId === line.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            if (file) void describeCastFromImage(line.id, file);
                          }}
                        />
                        <button
                          type="button"
                          disabled={generateBusy || describeBusyId !== null}
                          onClick={() =>
                            castFileInputsRef.current[line.id]?.click()
                          }
                          className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666] underline-offset-2 hover:underline disabled:opacity-40"
                        >
                          Upload image
                        </button>
                        <button
                          type="button"
                          disabled={
                            generateBusy ||
                            describeBusyId !== null ||
                            !line.name.trim()
                          }
                          onClick={() => void describeCastFromImage(line.id)}
                          className="btn-minimal disabled:opacity-40"
                        >
                          {describeBusyId === line.id
                            ? "Describing..."
                            : "Describe from image"}
                        </button>
                        {castLines.length > 1 ? (
                          <button
                            type="button"
                            disabled={
                              generateBusy || describeBusyId === line.id
                            }
                            onClick={() =>
                              setCastLines((prev) =>
                                prev.filter((row) => row.id !== line.id)
                              )
                            }
                            className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666] underline-offset-2 hover:underline disabled:opacity-40"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <label className="flex flex-col gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
                      Description
                      <textarea
                        value={line.description}
                        rows={2}
                        disabled={generateBusy || describeBusyId === line.id}
                        maxLength={500}
                        placeholder="Visible features in plain words"
                        onChange={(e) =>
                          setCastLines((prev) =>
                            prev.map((row) =>
                              row.id === line.id
                                ? { ...row, description: e.target.value }
                                : row
                            )
                          )
                        }
                        className="border border-[#0a0a0a] bg-transparent px-2 py-2 font-serif text-base normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
                      />
                    </label>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={generateBusy || describeBusyId !== null}
                onClick={() =>
                  setCastLines((prev) => [...prev, emptyCastLine()])
                }
                className="self-start font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666] underline-offset-2 hover:underline disabled:opacity-40"
              >
                Add cast line
              </button>
            </div>
          </>
        ) : null}
        <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
          Source{generateMode === "directed" ? " (optional)" : ""}
          <textarea
            value={sourceText}
            rows={10}
            disabled={generateBusy}
            placeholder="Paste the weekly recap or any notes here"
            onChange={(e) => setSourceText(e.target.value)}
            className="border border-[#0a0a0a] bg-transparent px-2 py-2 font-serif text-base normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
          />
        </label>
        <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
          Focus (optional)
          <input
            type="text"
            value={sourceFocus}
            disabled={generateBusy}
            maxLength={200}
            placeholder="One line: the moment to build around"
            onChange={(e) => setSourceFocus(e.target.value)}
            className="border border-[#0a0a0a] bg-transparent px-2 py-1 font-serif text-base normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void generateFromSource()}
            disabled={
              generateBusy ||
              loading ||
              describeBusyId !== null ||
              (generateMode === "auto"
                ? !sourceText.trim()
                : !sourceText.trim() &&
                  !directedScene.trim() &&
                  !serializeCastLines(castLines))
            }
            className="btn-minimal disabled:opacity-40"
          >
            {generating && !batchRunning
              ? "Generating..."
              : generateMode === "directed"
                ? "Generate directed"
                : "Generate from source"}
          </button>
        </div>
        {notice ? (
          <p className="font-serif text-sm text-[#0a0a0a]">{notice}</p>
        ) : null}
        {failedAttempts.length > 0 ? (
          <ul className="flex flex-col gap-1 font-mono text-[0.6875rem] text-[#666]">
            {failedAttempts.map((attempt) => (
              <li key={`${attempt.attempt}-${attempt.stage}-${attempt.message}`}>
                attempt {attempt.attempt} · {attempt.stage} · {attempt.message}
              </li>
            ))}
          </ul>
        ) : null}
        {batchErrors.length > 0 ? (
          <ul className="flex max-w-xl flex-col gap-1 font-mono text-[0.6875rem] text-[#666]">
            {batchErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <details
        className="border border-[#0a0a0a] p-4"
        open={testingOpen}
        onToggle={(e) => setTestingOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
          Testing tools
        </summary>
        <div className="mt-4 flex flex-col items-start gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={generateNew}
              disabled={generateBusy || loading}
              className="btn-minimal disabled:opacity-40"
            >
              {generating && !batchRunning ? "Generating..." : "Generate new"}
            </button>
            <button
              type="button"
              onClick={() => void generateBatch(10)}
              disabled={generateBusy || loading}
              className="btn-minimal disabled:opacity-40"
            >
              Generate 10
            </button>
            {batchRunning ? (
              <button type="button" onClick={stopBatch} className="btn-minimal">
                Stop
              </button>
            ) : null}
          </div>
          {isDevEnv() ? (
            <label className="flex items-center gap-2 font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
              <input
                type="checkbox"
                checked={autoApprove}
                disabled={generateBusy}
                onChange={(e) => setAutoApprove(e.target.checked)}
              />
              Approve automatically (testing only)
            </label>
          ) : null}

          <div className="mt-2 w-full max-w-xl border-t border-[#0a0a0a] pt-4">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
              Import
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
                  Image URL (Vercel Blob)
                </span>
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  disabled={generateBusy}
                  className="border border-[#0a0a0a] bg-white px-3 py-2 font-mono text-sm text-[#0a0a0a]"
                  placeholder="https://….public.blob.vercel-storage.com/…"
                />
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
                    Type
                  </span>
                  <select
                    value={importKind}
                    onChange={(e) =>
                      setImportKind(
                        e.target.value === "season" ? "season" : "moment"
                      )
                    }
                    disabled={generateBusy}
                    className="border border-[#0a0a0a] bg-white px-3 py-2 font-mono text-sm"
                  >
                    <option value="moment">moment</option>
                    <option value="season">season</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
                    {importKind === "season" ? "Season #" : "Day"}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={importDay}
                    onChange={(e) => setImportDay(e.target.value)}
                    disabled={generateBusy}
                    className="w-24 border border-[#0a0a0a] bg-white px-3 py-2 font-mono text-sm"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
                  Title
                </span>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  disabled={generateBusy}
                  className="border border-[#0a0a0a] bg-white px-3 py-2 font-serif text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
                  Caption
                </span>
                <textarea
                  value={importCaption}
                  onChange={(e) => setImportCaption(e.target.value)}
                  disabled={generateBusy}
                  rows={3}
                  className="border border-[#0a0a0a] bg-white px-3 py-2 font-serif text-sm"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
                  Details JSON (optional)
                </span>
                <textarea
                  value={importDetails}
                  onChange={(e) => setImportDetails(e.target.value)}
                  disabled={generateBusy}
                  rows={4}
                  className="border border-[#0a0a0a] bg-white px-3 py-2 font-mono text-[0.6875rem]"
                  placeholder='{ "style": "…", "normieCast": [] }'
                />
              </label>
              <button
                type="button"
                onClick={() => void importMural()}
                disabled={
                  generateBusy ||
                  loading ||
                  !importUrl.trim() ||
                  !importTitle.trim() ||
                  !importCaption.trim()
                }
                className="btn-minimal disabled:opacity-40"
              >
                {importing ? "Importing…" : "Import"}
              </button>
            </div>
          </div>
        </div>
      </details>

      {loading ? (
        <p className="font-serif italic text-[#666]">Loading…</p>
      ) : null}

      <div className="flex flex-col gap-10">
        {items.map((item) => {
          const draft = drafts[item.id] ?? draftFromItem(item);
          const busy = Boolean(rowBusy[item.id]);
          const seasonNameMeta = metaSeasonName(item);
          return (
            <article
              key={item.id}
              className="flex flex-col gap-4 border border-[#0a0a0a] p-4"
            >
              <div className="relative aspect-[3/2] w-full overflow-hidden border border-[#0a0a0a] bg-[#f2ead8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                />
              </div>

              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                {item.id} · {muralKindOf(item)}
                {muralKindOf(item) === "season"
                  ? ` · season ${seasonNumberLabel(item) || "—"}`
                  : dayLabel(item)
                    ? ` · day ${dayLabel(item)}`
                    : ""}
                {seasonNameMeta ? ` · ${seasonNameMeta}` : ""} ·{" "}
                {item.record.engine} · {item.status}
              </p>

              {(() => {
                const motion = muralMotionOf(item);
                return (
                  <div className="flex flex-col gap-2 border border-[#0a0a0a] bg-[#faf7f0] p-3">
                    <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                      Motion
                    </p>
                    {motion ? (
                      <div className="flex flex-wrap items-start gap-3">
                        <video
                          src={motion.url}
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          controls
                          className="max-h-28 max-w-[12rem] border border-[#0a0a0a] bg-[#0a0a0a]"
                        />
                        <p className="font-mono text-[0.6875rem] leading-relaxed text-[#666]">
                          {motion.width}×{motion.height} · {motion.seconds}s
                          <br />
                          Optional; independent of approve/publish.
                        </p>
                      </div>
                    ) : (
                      <p className="font-mono text-[0.6875rem] text-[#666]">
                        No motion clip. Upload an .mp4 (max 6 MB).
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="btn-minimal cursor-pointer disabled:opacity-40">
                        <input
                          type="file"
                          accept="video/mp4,.mp4"
                          disabled={busy}
                          className="sr-only"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (file) void uploadMotion(item.id, file);
                          }}
                        />
                        {busy
                          ? "Working…"
                          : motion
                            ? "Replace .mp4"
                            : "Upload .mp4"}
                      </label>
                      {motion ? (
                        <button
                          type="button"
                          className="btn-minimal disabled:opacity-40"
                          disabled={busy}
                          onClick={() => void removeMotion(item.id)}
                        >
                          Remove motion
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })()}

              <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Type
                <select
                  value={draft.kind}
                  disabled={busy}
                  onChange={(e) => {
                    const kind =
                      e.target.value === "season" ? "season" : "moment";
                    setDrafts((prev) => ({
                      ...prev,
                      [item.id]: { ...draft, kind },
                    }));
                    void patchItem(item.id, { kind });
                  }}
                  className="w-40 border border-[#0a0a0a] bg-transparent px-2 py-1 font-mono text-sm text-[#0a0a0a] disabled:opacity-40"
                >
                  <option value="moment">Moment</option>
                  <option value="season">Season</option>
                </select>
              </label>

              {draft.kind === "season" ? (
                <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                  Season #
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={draft.seasonNumber}
                    disabled={busy}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { ...draft, seasonNumber: e.target.value },
                      }))
                    }
                    onBlur={() => {
                      const parsed = Number(draft.seasonNumber);
                      const current =
                        typeof item.seasonNumber === "number"
                          ? item.seasonNumber
                          : null;
                      if (
                        !Number.isInteger(parsed) ||
                        parsed < 1 ||
                        parsed === current
                      ) {
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...draft,
                            seasonNumber: seasonNumberLabel(item),
                          },
                        }));
                        return;
                      }
                      void patchItem(item.id, { seasonNumber: parsed });
                    }}
                    className="w-24 border border-[#0a0a0a] bg-transparent px-2 py-1 font-mono text-sm normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
                  />
                </label>
              ) : null}

              {draft.kind === "moment" ? (
                <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                  Day
                  <input
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={draft.day}
                    disabled={busy}
                    placeholder="Optional"
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [item.id]: { ...draft, day: e.target.value },
                      }))
                    }
                    onBlur={() => {
                      const raw = draft.day.trim();
                      const current =
                        typeof item.day === "number" ? item.day : null;
                      if (!raw) {
                        if (current == null) return;
                        void patchItem(item.id, { day: null });
                        return;
                      }
                      const parsed = Number(raw);
                      if (!Number.isInteger(parsed) || parsed < 1) {
                        setDrafts((prev) => ({
                          ...prev,
                          [item.id]: { ...draft, day: dayLabel(item) },
                        }));
                        return;
                      }
                      if (parsed === current) return;
                      void patchItem(item.id, { day: parsed });
                    }}
                    className="w-24 border border-[#0a0a0a] bg-transparent px-2 py-1 font-mono text-sm normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
                  />
                </label>
              ) : null}

              <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Title
                <input
                  value={draft.title}
                  disabled={busy}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [item.id]: { ...draft, title: e.target.value },
                    }))
                  }
                  onBlur={() => {
                    if (draft.title.trim() !== item.title) {
                      void patchItem(item.id, { title: draft.title });
                    }
                  }}
                  className="border border-[#0a0a0a] bg-transparent px-2 py-1 font-serif text-base normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
                />
              </label>

              <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Caption
                <textarea
                  value={draft.caption}
                  rows={3}
                  disabled={busy}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [item.id]: { ...draft, caption: e.target.value },
                    }))
                  }
                  onBlur={() => {
                    if (draft.caption.trim() !== item.caption) {
                      void patchItem(item.id, { caption: draft.caption });
                    }
                  }}
                  className="border border-[#0a0a0a] bg-transparent px-2 py-1 font-serif text-base normal-case tracking-normal text-[#0a0a0a] disabled:opacity-40"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                {item.status !== "approved" ? (
                  <button
                    type="button"
                    className="btn-minimal disabled:opacity-40"
                    disabled={busy}
                    onClick={() =>
                      patchItem(item.id, { status: "approved" }, "Approved")
                    }
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-minimal disabled:opacity-40"
                    disabled={busy}
                    onClick={() =>
                      patchItem(item.id, { status: "pending" }, "Unapproved")
                    }
                  >
                    Unapprove
                  </button>
                )}
                <button
                  type="button"
                  className="btn-minimal disabled:opacity-40"
                  disabled={busy}
                  onClick={() =>
                    patchItem(item.id, { status: "rejected" }, "Rejected")
                  }
                >
                  Reject
                </button>
                <button
                  type="button"
                  className="btn-minimal disabled:opacity-40"
                  disabled={busy}
                  onClick={() => removeItem(item.id)}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="btn-minimal disabled:opacity-40"
                  disabled={busy}
                  onClick={() =>
                    setOpenDetails((prev) => ({
                      ...prev,
                      [item.id]: !prev[item.id],
                    }))
                  }
                >
                  {openDetails[item.id] ? "Hide details" : "Details"}
                </button>
                {rowConfirm[item.id] ? (
                  <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                    {rowConfirm[item.id]}
                  </span>
                ) : null}
              </div>
              {isTextPathRecord(item) ? (
                <p className="font-mono text-[0.6875rem] leading-relaxed text-[#666]">
                  Cast:{" "}
                  {castStatusLine(item.record.normieCast) ??
                    "no names looked up"}
                </p>
              ) : null}
              {rowError[item.id] ? (
                <p className="font-mono text-[0.6875rem] text-[#0a0a0a]">
                  {rowError[item.id]}
                </p>
              ) : null}

              {openDetails[item.id] ? (
                <div className="space-y-3">
                  <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#666]">
                    Engine: {item.record.engine}
                  </p>
                  {item.record.directedScene || item.record.directedCast ? (
                    <div className="border border-[#0a0a0a] bg-[#faf7f0] p-3 font-mono text-[0.6875rem] leading-relaxed text-[#333]">
                      <p className="mb-2 uppercase tracking-[0.08em] text-[#666]">
                        Directed
                      </p>
                      {item.record.directedScene ? (
                        <p>
                          <span className="text-[#666]">Scene: </span>
                          {item.record.directedScene}
                        </p>
                      ) : null}
                      {item.record.directedCast ? (
                        <pre className="mt-2 whitespace-pre-wrap">
                          <span className="text-[#666]">Cast:{"\n"}</span>
                          {item.record.directedCast}
                        </pre>
                      ) : null}
                    </div>
                  ) : null}
                  {isTextPathRecord(item) ? (
                    <div className="border border-[#0a0a0] bg-[#faf7f0] p-3 font-mono text-[0.6875rem] leading-relaxed text-[#333]">
                      <p className="mb-2 uppercase tracking-[0.08em] text-[#666]">
                        Cast lookup
                      </p>
                      {(() => {
                        const { list, unmatched } = castDetails(
                          item.record.normieCast
                        );
                        if (list.length === 0) {
                          return (
                            <p className="text-[#666]">No cast looked up.</p>
                          );
                        }
                        return (
                          <>
                            <ul className="space-y-1">
                              {list.map((member) => (
                                <li key={`${member.name}-${member.status}`}>
                                  <span className="text-[#0a0a0a]">
                                    {member.name}
                                  </span>
                                  {` · ${member.status}`}
                                  {member.tokenId != null
                                    ? ` · #${member.tokenId}`
                                    : ""}
                                  {member.type ? ` · ${member.type}` : ""}
                                </li>
                              ))}
                            </ul>
                            {unmatched.length > 0 ? (
                              <p className="mt-2 text-[#666]">
                                Unmatched:{" "}
                                {unmatched
                                  .map((m) => `${m.name} (${m.status})`)
                                  .join(", ")}
                              </p>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  ) : null}
                  <pre className="overflow-x-auto border border-[#0a0a0a] bg-[#faf7f0] p-3 font-mono text-[0.6875rem] leading-relaxed text-[#333]">
                    {JSON.stringify(item.record, null, 2)}
                  </pre>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}
