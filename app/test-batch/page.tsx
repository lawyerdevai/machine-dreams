// TEMPORARY EVAL PAGE — DELETE BEFORE LAUNCH
"use client";

import { useCallback, useState } from "react";
import { lowercaseName, sentenceCase, uppercaseTitle } from "@/lib/format";

const BATCH_SIZE = 5;
const TOTAL = 30;

type CellState =
  | { status: "idle" }
  | { status: "loading"; tokenId: string }
  | {
      status: "done";
      tokenId: string;
      agentName: string;
      title: string;
      imageUrl: string;
      artistStatement: string;
    }
  | { status: "error"; tokenId: string; message: string };

async function runInBatches<T>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<void>
) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    await Promise.all(batch.map(fn));
  }
}

export default function TestBatchPage() {
  const [cells, setCells] = useState<CellState[]>(
    Array.from({ length: TOTAL }, () => ({ status: "idle" }))
  );
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [status, setStatus] = useState("");
  const [compactView, setCompactView] = useState(true);

  const updateCell = useCallback((index: number, cell: CellState) => {
    setCells((prev) => {
      const next = [...prev];
      next[index] = cell;
      return next;
    });
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setStatus("Picking token IDs…");

    try {
      const res = await fetch("/api/test-batch/candidates?count=30");
      if (!res.ok) throw new Error("Failed to pick candidates");
      const { tokenIds } = (await res.json()) as { tokenIds: string[] };

      if (tokenIds.length === 0) {
        setStatus("No eligible token IDs found.");
        return;
      }

      const slots: CellState[] = Array.from({ length: TOTAL }, (_, i) =>
        i < tokenIds.length
          ? { status: "loading", tokenId: tokenIds[i] }
          : { status: "idle" }
      );
      setCells(slots);
      setStatus(`Generating ${tokenIds.length} artworks (batches of ${BATCH_SIZE})…`);

      const jobs = tokenIds.map((tokenId, index) => ({ tokenId, index }));

      await runInBatches(jobs, BATCH_SIZE, async ({ tokenId, index }) => {
        try {
          const createRes = await fetch("/api/test-batch/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokenId }),
          });
          const data = await createRes.json();
          if (!createRes.ok) {
            throw new Error(data.error ?? "Creation failed");
          }
          updateCell(index, {
            status: "done",
            tokenId,
            agentName: data.agentName,
            title: data.title,
            imageUrl: data.imageUrl,
            artistStatement: data.artistStatement,
          });
        } catch (err) {
          updateCell(index, {
            status: "error",
            tokenId,
            message: err instanceof Error ? err.message : "Failed",
          });
        }
      });

      setStatus("Batch complete.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Batch failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setStatus("Deleting eval batch artworks…");
    try {
      const res = await fetch("/api/test-batch", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      const { deleted } = (await res.json()) as { deleted: number };
      setCells(Array.from({ length: TOTAL }, () => ({ status: "idle" })));
      setStatus(`Deleted ${deleted} eval batch artwork(s).`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="flex-1 px-6 py-12 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <h1 className="text-xl uppercase tracking-wide">Eval Batch</h1>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleGenerate}
              disabled={generating || deleting}
              className="btn-minimal disabled:opacity-40"
            >
              {generating ? "Generating…" : "GENERATE 30"}
            </button>
            <button
              onClick={handleDelete}
              disabled={generating || deleting}
              className="btn-minimal disabled:opacity-40"
            >
              {deleting ? "Deleting…" : "DELETE ALL EVAL BATCH"}
            </button>
            <button
              onClick={() => setCompactView((v) => !v)}
              className={`btn-minimal ${compactView ? "" : "opacity-50"}`}
            >
              COMPACT VIEW
            </button>
          </div>
          {status && (
            <p className="text-sm text-[#666] lowercase">{status}</p>
          )}
        </div>

        <div
          className={
            compactView
              ? "grid grid-cols-6 gap-3"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          }
        >
          {cells.map((cell, i) => (
            <div
              key={i}
              className={
                compactView
                  ? "flex flex-col gap-1"
                  : "flex flex-col gap-3 border border-[#0a0a0a]/10 p-4 min-h-[280px]"
              }
            >
              {cell.status === "idle" && (
                <div
                  className={
                    compactView
                      ? "w-[150px] h-[150px] flex items-center justify-center text-xs text-[#999] lowercase"
                      : "flex-1 flex items-center justify-center text-sm text-[#999] lowercase"
                  }
                >
                  —
                </div>
              )}
              {cell.status === "loading" && (
                <>
                  <div
                    className={
                      compactView
                        ? "w-[150px] h-[150px] bg-[#f5f5f5] animate-pulse"
                        : "aspect-square bg-[#f5f5f5] animate-pulse"
                    }
                  />
                  <p
                    className={
                      compactView
                        ? "text-xs text-[#666] lowercase"
                        : "text-sm text-[#666] lowercase"
                    }
                  >
                    {compactView
                      ? `#${cell.tokenId}…`
                      : `generating #${cell.tokenId}…`}
                  </p>
                </>
              )}
              {cell.status === "error" && (
                <>
                  <div
                    className={
                      compactView
                        ? "w-[150px] h-[150px] bg-[#f5f5f5] flex items-center justify-center text-xs text-red-600 lowercase p-2 text-center"
                        : "aspect-square bg-[#f5f5f5] flex items-center justify-center text-sm text-red-600 lowercase p-4 text-center"
                    }
                  >
                    {cell.message}
                  </div>
                  <p
                    className={
                      compactView
                        ? "text-xs text-[#666] lowercase"
                        : "text-sm text-[#666] lowercase"
                    }
                  >
                    #{cell.tokenId}
                  </p>
                </>
              )}
              {cell.status === "done" && (
                <>
                  <img
                    src={cell.imageUrl}
                    alt={cell.title}
                    className={
                      compactView
                        ? "w-[150px] h-[150px] object-cover"
                        : "w-full aspect-square object-cover"
                    }
                  />
                  <p
                    className={
                      compactView
                        ? "text-xs uppercase tracking-wide leading-tight"
                        : "text-sm uppercase tracking-wide"
                    }
                  >
                    {uppercaseTitle(cell.title)}
                  </p>
                  {compactView ? (
                    <p className="text-xs text-[#666] lowercase">
                      #{cell.tokenId}
                    </p>
                  ) : (
                    <>
                      <p className="text-sm lowercase">
                        {lowercaseName(cell.agentName)} · #{cell.tokenId}
                      </p>
                      <p className="text-xs leading-relaxed text-[#666]">
                        {sentenceCase(cell.artistStatement)}
                      </p>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
