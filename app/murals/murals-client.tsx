"use client";

import { useEffect, useState } from "react";

type MuralTone = "combat" | "quiet" | "political" | "other";

type MuralResult = {
  id: string;
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralTone;
  moment: string;
  statement: string;
  flagged: boolean;
  imageDataUrl: string;
};

type ApiOk = {
  ok: true;
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralTone;
  moment: string;
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

function downloadName(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `arena-mural-${slug || "result"}.png`;
}

export function MuralsClient({ isDev }: { isDev: boolean }) {
  const [results, setResults] = useState<MuralResult[]>([]);
  const [lastSeasonId, setLastSeasonId] = useState<string | undefined>();
  const [usedMedia, setUsedMedia] = useState<string[]>([]);
  const [usedStyles, setUsedStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!loading || startedAt === null) return;
    const timer = window.setInterval(() => setNow(timestamp()), 250);
    return () => window.clearInterval(timer);
  }, [loading, startedAt]);

  async function generate() {
    if (loading) return;
    setNotice(null);
    setLoading(true);
    const start = timestamp();
    setStartedAt(start);
    setNow(start);
    try {
      const res = await fetch("/api/murals/dev-unified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastSeasonId, usedMedia, usedStyles }),
      });
      if (res.status === 404) {
        setNotice("This tool is only available in development.");
        return;
      }
      const data = (await res.json()) as ApiOk | ApiFail;
      if (!("ok" in data) || data.ok !== true) {
        setNotice(
          "message" in data && data.message
            ? data.message
            : "This mural couldn't be drawn right now. Please try again."
        );
        return;
      }
      setLastSeasonId(data.seasonId);
      setUsedMedia((prev) => [data.medium, ...prev].slice(0, 10));
      setUsedStyles((prev) => [data.style, ...prev].slice(0, 10));
      setResults((prev) => [
        {
          id: `${timestamp()}-${data.title}`,
          seasonId: data.seasonId,
          seasonName: data.seasonName,
          title: data.title,
          style: data.style,
          medium: data.medium,
          tone: data.tone,
          moment: data.moment,
          statement: data.statement,
          flagged: data.flagged,
          imageDataUrl: data.imageDataUrl,
        },
        ...prev,
      ]);
    } catch {
      setNotice("This mural couldn't be drawn right now. Please try again.");
    } finally {
      setLoading(false);
      setStartedAt(null);
    }
  }

  const elapsed =
    startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const toneCounts = {
    combat: results.filter((item) => item.tone === "combat").length,
    quiet: results.filter((item) => item.tone === "quiet").length,
    political: results.filter((item) => item.tone === "political").length,
    other: results.filter((item) => item.tone === "other").length,
  };

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
            Tones so far · combat {toneCounts.combat} · quiet {toneCounts.quiet}{" "}
            · political {toneCounts.political} · other {toneCounts.other}
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="btn-minimal self-start disabled:opacity-40"
          >
            Generate dummy mural
          </button>
          {loading ? (
            <p className="font-serif italic text-[#666]" aria-live="polite">
              Drawing a mural… {elapsed}s
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
                download={downloadName(result.title)}
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
