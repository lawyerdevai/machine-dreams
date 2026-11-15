"use client";

import { useEffect, useState } from "react";

type MuralToneV1 = "combat" | "quiet" | "political" | "other";
type MuralToneV2 = "combat" | "quiet" | "other";

type MuralResultV1 = {
  version: "v1";
  id: string;
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralToneV1;
  moment: string;
  statement: string;
  flagged: boolean;
  imageDataUrl: string;
};

type MuralResultV2 = {
  version: "v2";
  id: string;
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralToneV2;
  moment: string;
  figure: string;
  statement: string;
  flagged: boolean;
  imageDataUrl: string;
};

type MuralResult = MuralResultV1 | MuralResultV2;

type ApiOkV1 = {
  ok: true;
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralToneV1;
  moment: string;
  statement: string;
  flagged: boolean;
  imageDataUrl: string;
};

type ApiOkV2 = {
  ok: true;
  version?: "v2";
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralToneV2;
  moment: string;
  figure: string;
  statement: string;
  flagged: boolean;
  imageDataUrl: string;
};

type ApiFail = {
  ok: false;
  message?: string;
};

function timestamp() {
  return Date.now();
}

function downloadName(title: string, version: "v1" | "v2") {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `arena-mural-${version}-${slug || "result"}.png`;
}

type RunKind = "v1" | "v2" | "v2-combat";

export function MuralsClient({ isDev }: { isDev: boolean }) {
  const [resultsV1, setResultsV1] = useState<MuralResultV1[]>([]);
  const [resultsV2, setResultsV2] = useState<MuralResultV2[]>([]);

  const [lastSeasonIdV1, setLastSeasonIdV1] = useState<string | undefined>();
  const [usedMediaV1, setUsedMediaV1] = useState<string[]>([]);
  const [usedStylesV1, setUsedStylesV1] = useState<string[]>([]);

  const [lastSeasonIdV2, setLastSeasonIdV2] = useState<string | undefined>();
  const [usedMediaV2, setUsedMediaV2] = useState<string[]>([]);
  const [usedStylesV2, setUsedStylesV2] = useState<string[]>([]);
  const [usedFiguresV2, setUsedFiguresV2] = useState<string[]>([]);

  const [loading, setLoading] = useState<RunKind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (loading === null || startedAt === null) return;
    const timer = window.setInterval(() => setNow(timestamp()), 250);
    return () => window.clearInterval(timer);
  }, [loading, startedAt]);

  async function generate(kind: RunKind) {
    if (loading !== null) return;
    setNotice(null);
    setLoading(kind);
    const start = timestamp();
    setStartedAt(start);
    setNow(start);
    try {
      const isV2 = kind !== "v1";
      const res = await fetch(
        isV2 ? "/api/murals/dev-unified-v2" : "/api/murals/dev-unified",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isV2
              ? {
                  lastSeasonId: lastSeasonIdV2,
                  usedMedia: usedMediaV2,
                  usedStyles: usedStylesV2,
                  usedFigures: usedFiguresV2,
                  ...(kind === "v2-combat" ? { forceTone: "combat" } : {}),
                }
              : {
                  lastSeasonId: lastSeasonIdV1,
                  usedMedia: usedMediaV1,
                  usedStyles: usedStylesV1,
                }
          ),
        }
      );
      if (res.status === 404) {
        setNotice("This tool is only available in development.");
        return;
      }
      const data = (await res.json()) as ApiOkV1 | ApiOkV2 | ApiFail;
      if (!("ok" in data) || data.ok !== true) {
        setNotice(
          "message" in data && data.message
            ? data.message
            : "This mural couldn't be drawn right now. Please try again."
        );
        return;
      }

      if (isV2) {
        const v2 = data as ApiOkV2;
        if (typeof v2.figure !== "string" || !v2.figure.trim()) {
          setNotice("The mural brief could not be read. Try again.");
          return;
        }
        setLastSeasonIdV2(v2.seasonId);
        setUsedMediaV2((prev) => [v2.medium, ...prev].slice(0, 10));
        setUsedStylesV2((prev) => [v2.style, ...prev].slice(0, 10));
        setUsedFiguresV2((prev) => [v2.figure, ...prev].slice(0, 10));
        setResultsV2((prev) => [
          {
            version: "v2",
            id: `${timestamp()}-v2-${v2.title}`,
            seasonId: v2.seasonId,
            seasonName: v2.seasonName,
            title: v2.title,
            style: v2.style,
            medium: v2.medium,
            tone: v2.tone,
            moment: v2.moment,
            figure: v2.figure,
            statement: v2.statement,
            flagged: v2.flagged,
            imageDataUrl: v2.imageDataUrl,
          },
          ...prev,
        ]);
      } else {
        const v1 = data as ApiOkV1;
        setLastSeasonIdV1(v1.seasonId);
        setUsedMediaV1((prev) => [v1.medium, ...prev].slice(0, 10));
        setUsedStylesV1((prev) => [v1.style, ...prev].slice(0, 10));
        setResultsV1((prev) => [
          {
            version: "v1",
            id: `${timestamp()}-v1-${v1.title}`,
            seasonId: v1.seasonId,
            seasonName: v1.seasonName,
            title: v1.title,
            style: v1.style,
            medium: v1.medium,
            tone: v1.tone,
            moment: v1.moment,
            statement: v1.statement,
            flagged: v1.flagged,
            imageDataUrl: v1.imageDataUrl,
          },
          ...prev,
        ]);
      }
    } catch {
      setNotice("This mural couldn't be drawn right now. Please try again.");
    } finally {
      setLoading(null);
      setStartedAt(null);
    }
  }

  const elapsed =
    startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const toneCountsV1 = {
    combat: resultsV1.filter((item) => item.tone === "combat").length,
    quiet: resultsV1.filter((item) => item.tone === "quiet").length,
    political: resultsV1.filter((item) => item.tone === "political").length,
    other: resultsV1.filter((item) => item.tone === "other").length,
  };
  const toneCountsV2 = {
    combat: resultsV2.filter((item) => item.tone === "combat").length,
    quiet: resultsV2.filter((item) => item.tone === "quiet").length,
    other: resultsV2.filter((item) => item.tone === "other").length,
  };

  const results: MuralResult[] = [...resultsV2, ...resultsV1].sort((a, b) => {
    const aTime = Number(a.id.split("-")[0] ?? 0);
    const bTime = Number(b.id.split("-")[0] ?? 0);
    return bTime - aTime;
  });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-6 py-12 text-[#0a0a0a]">
      <div>
        <h1 className="page-title text-2xl uppercase tracking-wide md:text-3xl">
          Arena Murals
        </h1>
        <p className="mt-4 max-w-xl font-serif text-[#666]">
          No murals yet. The first one is made when a season ends.
        </p>
      </div>

      {isDev ? (
        <div className="flex flex-col gap-3 border border-[#0a0a0a] px-4 py-4">
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-[#666]">
            DEV
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
            v1 tones · combat {toneCountsV1.combat} · quiet {toneCountsV1.quiet}{" "}
            · political {toneCountsV1.political} · other {toneCountsV1.other}
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
            v2 tones · combat {toneCountsV2.combat} · quiet {toneCountsV2.quiet}{" "}
            · other {toneCountsV2.other}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => generate("v1")}
              disabled={loading !== null}
              className="btn-minimal disabled:opacity-40"
            >
              Generate dummy mural
            </button>
            <button
              type="button"
              onClick={() => generate("v2")}
              disabled={loading !== null}
              className="btn-minimal disabled:opacity-40"
            >
              Generate dummy mural (v2)
            </button>
            <button
              type="button"
              onClick={() => generate("v2-combat")}
              disabled={loading !== null}
              className="btn-minimal disabled:opacity-40"
            >
              Generate combat mural (v2)
            </button>
          </div>
          {loading ? (
            <p className="font-serif italic text-[#666]" aria-live="polite">
              Drawing a mural
              {loading === "v2"
                ? " (v2)"
                : loading === "v2-combat"
                  ? " (v2 combat)"
                  : ""}
              … {elapsed}s
            </p>
          ) : null}
          {notice ? <p className="font-serif text-[#0a0a0a]">{notice}</p> : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-12">
        {results.map((result) => (
          <article key={result.id} className="flex flex-col gap-4">
            <div className="relative aspect-[3/2] w-full overflow-hidden border border-[#0a0a0a] bg-[#f2ead8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.imageDataUrl}
                alt={result.title}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="page-title text-xl uppercase tracking-wide">
                {result.title}
              </h2>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Version · {result.version}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Season · {result.seasonName}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Style · {result.style}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Medium · {result.medium}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Tone · {result.tone}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Moment · {result.moment}
              </p>
              {result.version === "v2" ? (
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                  Figure · {result.figure}
                </p>
              ) : null}
              {result.flagged ? (
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#0a0a0a]">
                  Flagged: text or object detected
                </p>
              ) : null}
              <p className="max-w-2xl font-serif leading-relaxed text-[#666]">
                {result.statement}
              </p>
              <a
                href={result.imageDataUrl}
                download={downloadName(result.title, result.version)}
                className="btn-minimal self-start"
              >
                Download
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
