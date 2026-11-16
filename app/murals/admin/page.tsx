"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FrameKind } from "@/lib/murals/frame";
import type {
  GenerateAttemptFailure,
  MuralItem,
  MuralStatus,
} from "@/lib/murals/types";

const FRAME_KINDS: FrameKind[] = [
  "print",
  "ink",
  "glitch",
  "painting",
  "schematic",
  "craft",
  "plain",
];

const KEY_STORAGE = "murals-admin-key";

type RowDraft = {
  title: string;
  caption: string;
  frameKind: FrameKind;
  status: MuralStatus;
  seasonNumber: string;
};

function isDevEnv() {
  return process.env.NODE_ENV === "development";
}

function seasonNumberLabel(item: MuralItem): string {
  return typeof item.seasonNumber === "number" ? String(item.seasonNumber) : "";
}

function nextSeasonFromItems(list: MuralItem[]): number {
  let max = 0;
  for (const item of list) {
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
    frameKind: item.frameKind,
    status: item.status,
    seasonNumber: seasonNumberLabel(item),
  };
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
  const stopBatchRef = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

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
        setNotice("Unauthorized. Check the admin key.");
        setKeyReady(false);
        return;
      }
      const data = (await res.json()) as { ok?: boolean; items?: MuralItem[] };
      const list = Array.isArray(data.items) ? data.items : [];
      setItems(list);
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
  }, [headers]);

  useEffect(() => {
    if (keyReady) void refresh();
  }, [keyReady, refresh]);

  function saveKey() {
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

  async function requestGenerate(seasonNumber?: number): Promise<{
    ok: boolean;
    item?: MuralItem;
    error?: string;
    attempts?: GenerateAttemptFailure[];
  }> {
    const body =
      seasonNumber !== undefined ? JSON.stringify({ seasonNumber }) : "{}";
    const res = await fetch("/api/murals/admin/generate", {
      method: "POST",
      headers: headers(),
      body,
    });
    if (res.status === 401) {
      return { ok: false, error: "Unauthorized. Check the admin key." };
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
      const result = await requestGenerate();
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

  async function generateBatch(count: number) {
    if (generating || batchRunning) return;
    stopBatchRef.current = false;
    setBatchRunning(true);
    setGenerating(true);
    setNotice(null);
    setFailedAttempts([]);
    setBatchErrors([]);

    let nextNumber = nextSeasonFromItems(itemsRef.current);
    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      for (let i = 1; i <= count; i++) {
        if (stopBatchRef.current) break;
        setNotice(`Generating ${i} of ${count}...`);
        const seasonNumber = nextNumber;
        nextNumber += 1;
        try {
          const result = await requestGenerate(seasonNumber);
          if (!result.ok || !result.item) {
            failed += 1;
            const detail =
              result.attempts && result.attempts.length > 0
                ? result.attempts
                    .map((a) => `${a.stage}: ${a.message}`)
                    .join("; ")
                : (result.error ?? "Generate failed.");
            errors.push(`#${seasonNumber}: ${detail}`);
            continue;
          }
          upsertItem(result.item);
          if (isDevEnv() && autoApprove) {
            const approved = await approveItem(result.item.id);
            if (!approved) {
              errors.push(`#${seasonNumber}: generated but approve failed`);
            }
          }
          succeeded += 1;
        } catch (error) {
          failed += 1;
          const message =
            error instanceof Error ? error.message : "Generate failed.";
          errors.push(`#${seasonNumber}: ${message}`);
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
      frameKind: FrameKind;
      status: MuralStatus;
      seasonNumber: number;
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
      if (res.status === 401) {
        setRowError((prev) => ({
          ...prev,
          [id]: "Unauthorized. Check the admin key.",
        }));
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
      if (res.status === 401) {
        setRowError((prev) => ({
          ...prev,
          [id]: "Unauthorized. Check the admin key.",
        }));
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

  const generateBusy = generating || batchRunning;

  if (!keyReady && !isDevEnv()) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-12 text-[#0a0a0a]">
        <h1 className="page-title text-2xl uppercase tracking-wide">
          Murals Admin
        </h1>
        <p className="font-serif text-[#666]">
          Enter the admin key to continue.
        </p>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          className="border border-[#0a0a0a] bg-transparent px-3 py-2 font-mono text-sm"
          placeholder="MURALS_ADMIN_KEY"
        />
        <button type="button" onClick={saveKey} className="btn-minimal self-start">
          Continue
        </button>
        {notice ? <p className="font-serif text-[#0a0a0a]">{notice}</p> : null}
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12 text-[#0a0a0a]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl uppercase tracking-wide">
            Murals Admin
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
            Review pending generations
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center justify-end gap-2">
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
              <button
                type="button"
                onClick={stopBatch}
                className="btn-minimal"
              >
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
          {notice ? (
            <p className="font-serif text-sm text-[#0a0a0a]">{notice}</p>
          ) : null}
          {failedAttempts.length > 0 ? (
            <ul className="flex flex-col gap-1 text-right font-mono text-[0.6875rem] text-[#666]">
              {failedAttempts.map((attempt) => (
                <li key={`${attempt.attempt}-${attempt.stage}-${attempt.message}`}>
                  attempt {attempt.attempt} · {attempt.stage} · {attempt.message}
                </li>
              ))}
            </ul>
          ) : null}
          {batchErrors.length > 0 ? (
            <ul className="flex max-w-md flex-col gap-1 text-right font-mono text-[0.6875rem] text-[#666]">
              {batchErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="font-serif italic text-[#666]">Loading…</p>
      ) : null}

      <div className="flex flex-col gap-10">
        {items.map((item) => {
          const draft = drafts[item.id] ?? draftFromItem(item);
          const busy = Boolean(rowBusy[item.id]);
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
                {item.id} · season {seasonNumberLabel(item) || "—"} ·{" "}
                {item.seasonName} · {item.record.engine} · {item.status}
              </p>

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

              <label className="flex flex-col gap-1 font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Frame
                <select
                  value={draft.frameKind}
                  disabled={busy}
                  onChange={(e) => {
                    const frameKind = e.target.value as FrameKind;
                    setDrafts((prev) => ({
                      ...prev,
                      [item.id]: { ...draft, frameKind },
                    }));
                    void patchItem(item.id, { frameKind });
                  }}
                  className="border border-[#0a0a0a] bg-transparent px-2 py-1 font-mono text-sm text-[#0a0a0a] disabled:opacity-40"
                >
                  {FRAME_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
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
              {rowError[item.id] ? (
                <p className="font-mono text-[0.6875rem] text-[#0a0a0a]">
                  {rowError[item.id]}
                </p>
              ) : null}

              {openDetails[item.id] ? (
                <pre className="overflow-x-auto border border-[#0a0a0a] bg-[#faf7f0] p-3 font-mono text-[0.6875rem] leading-relaxed text-[#333]">
                  {JSON.stringify(item.record, null, 2)}
                </pre>
              ) : null}
            </article>
          );
        })}
      </div>
    </main>
  );
}
