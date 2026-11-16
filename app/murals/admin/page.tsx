"use client";

import { useCallback, useEffect, useState } from "react";
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

function isDevEnv() {
  return process.env.NODE_ENV === "development";
}

export default function MuralsAdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [keyReady, setKeyReady] = useState(false);
  const [items, setItems] = useState<MuralItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<GenerateAttemptFailure[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [rowBusy, setRowBusy] = useState<Record<string, boolean>>({});
  const [rowConfirm, setRowConfirm] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<
    Record<
      string,
      { title: string; caption: string; frameKind: FrameKind; status: MuralStatus }
    >
  >({});

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
      const nextDrafts: typeof drafts = {};
      for (const item of list) {
        nextDrafts[item.id] = {
          title: item.title,
          caption: item.caption,
          frameKind: item.frameKind,
          status: item.status,
        };
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

  async function generateNew() {
    if (generating) return;
    setGenerating(true);
    setNotice(null);
    setFailedAttempts([]);
    try {
      const res = await fetch("/api/murals/admin/generate", {
        method: "POST",
        headers: headers(),
        body: "{}",
      });
      if (res.status === 401) {
        setNotice("Unauthorized. Check the admin key.");
        return;
      }
      const data = (await res.json()) as {
        ok?: boolean;
        item?: MuralItem;
        error?: string;
        message?: string;
        attempts?: GenerateAttemptFailure[];
      };
      if (!res.ok || !data.ok || !data.item) {
        setNotice(data.error ?? data.message ?? "Generate failed.");
        setFailedAttempts(Array.isArray(data.attempts) ? data.attempts : []);
        return;
      }
      setItems((prev) => [data.item!, ...prev]);
      setDrafts((prev) => ({
        ...prev,
        [data.item!.id]: {
          title: data.item!.title,
          caption: data.item!.caption,
          frameKind: data.item!.frameKind,
          status: data.item!.status,
        },
      }));
    } catch {
      setNotice("Generate failed.");
      setFailedAttempts([]);
    } finally {
      setGenerating(false);
    }
  }

  async function patchItem(
    id: string,
    patch: Partial<{
      title: string;
      caption: string;
      frameKind: FrameKind;
      status: MuralStatus;
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
        [id]: {
          title: data.item!.title,
          caption: data.item!.caption,
          frameKind: data.item!.frameKind,
          status: data.item!.status,
        },
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
          <button
            type="button"
            onClick={generateNew}
            disabled={generating || loading}
            className="btn-minimal disabled:opacity-40"
          >
            {generating ? "Generating..." : "Generate new"}
          </button>
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
        </div>
      </div>

      {loading ? (
        <p className="font-serif italic text-[#666]">Loading…</p>
      ) : null}

      <div className="flex flex-col gap-10">
        {items.map((item) => {
          const draft = drafts[item.id] ?? {
            title: item.title,
            caption: item.caption,
            frameKind: item.frameKind,
            status: item.status,
          };
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
                {item.id} · {item.seasonName} · {item.record.engine} ·{" "}
                {item.status}
              </p>

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
