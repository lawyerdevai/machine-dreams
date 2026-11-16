"use client";

import { useEffect, useState } from "react";

type MuralTone = "combat" | "quiet" | "other";

type MuralResultV2 = {
  version: "v2";
  id: string;
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralTone;
  moment: string;
  scene: string;
  figure: string;
  violenceLevel: string;
  castSize: string;
  camera: string;
  beat: string;
  statement: string;
  flagged: boolean;
  flags: string[];
  imageDataUrl: string;
};

type MuralResultV3 = {
  version: "v3";
  id: string;
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralTone;
  moment: string;
  scene: string;
  figures: string[];
  violenceLevel: string;
  castSize: string;
  beat: string;
  mixLevel: string;
  styles: string[];
  palette: string | null;
  composition: string | null;
  texture: string | null;
  statement: string;
  flagged: boolean;
  flags: string[];
  imageDataUrl: string;
};

type MuralResult = MuralResultV2 | MuralResultV3;

type ApiOkV2 = {
  ok: true;
  version?: "v2";
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralTone;
  moment: string;
  scene: string;
  figure: string;
  violenceLevel: string;
  castSize: string;
  camera: string;
  beat: string;
  statement: string;
  flagged: boolean;
  flags?: string[];
  imageDataUrl: string;
};

type ApiOkV3 = {
  ok: true;
  version?: "v3";
  seasonId: string;
  seasonName: string;
  title: string;
  style: string;
  medium: string;
  tone: MuralTone;
  moment: string;
  scene: string;
  figures: string[];
  violenceLevel: string;
  castSize: string;
  beat: string;
  mixLevel: string;
  styles: string[];
  palette: string | null;
  composition: string | null;
  texture: string | null;
  statement: string;
  flagged: boolean;
  flags?: string[];
  imageDataUrl: string;
};

type ApiFail = {
  ok: false;
  message?: string;
};

function timestamp() {
  return Date.now();
}

function downloadName(title: string, version: "v2" | "v3") {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `arena-mural-${version}-${slug || "result"}.png`;
}

function dialLabel(value: string | null | undefined) {
  return value && value.trim() ? value : "left to the artist";
}

function parseFlags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function flaggedLine(flags: string[]) {
  if (flags.length === 0) return "Flagged";
  return `Flagged: ${flags.join(", ")}`;
}

type RunKind = "v2" | "v3";

export function MuralsClient({ isDev }: { isDev: boolean }) {
  const [resultsV2, setResultsV2] = useState<MuralResultV2[]>([]);
  const [resultsV3, setResultsV3] = useState<MuralResultV3[]>([]);

  const [lastSeasonIdV2, setLastSeasonIdV2] = useState<string | undefined>();
  const [usedMediaV2, setUsedMediaV2] = useState<string[]>([]);
  const [usedStylesV2, setUsedStylesV2] = useState<string[]>([]);
  const [usedFiguresV2, setUsedFiguresV2] = useState<string[]>([]);
  const [usedBeatsV2, setUsedBeatsV2] = useState<string[]>([]);

  const [lastSeasonIdV3, setLastSeasonIdV3] = useState<string | undefined>();
  const [usedMediaV3, setUsedMediaV3] = useState<string[]>([]);
  const [usedStylesV3, setUsedStylesV3] = useState<string[]>([]);
  const [usedPalettesV3, setUsedPalettesV3] = useState<string[]>([]);
  const [usedCompositionsV3, setUsedCompositionsV3] = useState<string[]>([]);
  const [usedFiguresV3, setUsedFiguresV3] = useState<string[]>([]);
  const [usedBeatsV3, setUsedBeatsV3] = useState<string[]>([]);

  const [loading, setLoading] = useState<RunKind | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [showEngineButtons, setShowEngineButtons] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setShowEngineButtons(params.get("dev") === "1");
  }, []);

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
      const res = await fetch(
        kind === "v3"
          ? "/api/murals/dev-unified-v3"
          : "/api/murals/dev-unified-v2",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            kind === "v3"
              ? {
                  lastSeasonId: lastSeasonIdV3,
                  usedMedia: usedMediaV3,
                  usedStyles: usedStylesV3,
                  usedPalettes: usedPalettesV3,
                  usedCompositions: usedCompositionsV3,
                  usedFigures: usedFiguresV3,
                  usedBeats: usedBeatsV3,
                }
              : {
                  lastSeasonId: lastSeasonIdV2,
                  usedMedia: usedMediaV2,
                  usedStyles: usedStylesV2,
                  usedFigures: usedFiguresV2,
                  usedBeats: usedBeatsV2,
                }
          ),
        }
      );
      if (res.status === 404) {
        setNotice("This tool is only available in development.");
        return;
      }
      const data = (await res.json()) as ApiOkV2 | ApiOkV3 | ApiFail;
      if (!("ok" in data) || data.ok !== true) {
        setNotice(
          "message" in data && data.message
            ? data.message
            : "This mural couldn't be drawn right now. Please try again."
        );
        return;
      }

      if (kind === "v3") {
        const v3 = data as ApiOkV3;
        const figures = Array.isArray(v3.figures)
          ? v3.figures.filter(
              (item): item is string =>
                typeof item === "string" && Boolean(item.trim())
            )
          : [];
        if (figures.length === 0 || typeof v3.scene !== "string" || !v3.scene.trim()) {
          setNotice("The mural brief could not be read. Try again.");
          return;
        }
        const dealtStyles = Array.isArray(v3.styles)
          ? v3.styles.filter(
              (item): item is string =>
                typeof item === "string" && Boolean(item.trim())
            )
          : [];
        const flags = parseFlags(v3.flags);
        setLastSeasonIdV3(v3.seasonId);
        setUsedMediaV3((prev) => [v3.medium, ...prev].slice(0, 10));
        setUsedStylesV3((prev) => [...dealtStyles, ...prev].slice(0, 20));
        if (typeof v3.palette === "string" && v3.palette.trim()) {
          setUsedPalettesV3((prev) => [v3.palette!, ...prev].slice(0, 8));
        }
        if (typeof v3.composition === "string" && v3.composition.trim()) {
          setUsedCompositionsV3((prev) =>
            [v3.composition!, ...prev].slice(0, 8)
          );
        }
        setUsedFiguresV3((prev) => [...figures, ...prev].slice(0, 10));
        if (typeof v3.beat === "string" && v3.beat.trim()) {
          setUsedBeatsV3((prev) => [v3.beat, ...prev].slice(0, 10));
        }
        setResultsV3((prev) => [
          {
            version: "v3",
            id: `${timestamp()}-v3-${v3.title}`,
            seasonId: v3.seasonId,
            seasonName: v3.seasonName,
            title: v3.title,
            style: v3.style,
            medium: v3.medium,
            tone: v3.tone,
            moment: v3.moment,
            scene: v3.scene,
            figures,
            violenceLevel: v3.violenceLevel ?? "",
            castSize: v3.castSize ?? "",
            beat: v3.beat ?? "",
            mixLevel: v3.mixLevel ?? "",
            styles: dealtStyles,
            palette: v3.palette ?? null,
            composition: v3.composition ?? null,
            texture: v3.texture ?? null,
            statement: v3.statement,
            flagged: Boolean(v3.flagged) || flags.length > 0,
            flags,
            imageDataUrl: v3.imageDataUrl,
          },
          ...prev,
        ]);
      } else {
        const v2 = data as ApiOkV2;
        if (
          typeof v2.figure !== "string" ||
          !v2.figure.trim() ||
          typeof v2.scene !== "string" ||
          !v2.scene.trim()
        ) {
          setNotice("The mural brief could not be read. Try again.");
          return;
        }
        const flags = parseFlags(v2.flags);
        setLastSeasonIdV2(v2.seasonId);
        setUsedMediaV2((prev) => [v2.medium, ...prev].slice(0, 10));
        setUsedStylesV2((prev) => [v2.style, ...prev].slice(0, 10));
        setUsedFiguresV2((prev) => [v2.figure, ...prev].slice(0, 10));
        if (typeof v2.beat === "string" && v2.beat.trim()) {
          setUsedBeatsV2((prev) => [v2.beat, ...prev].slice(0, 10));
        }
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
            scene: v2.scene,
            figure: v2.figure,
            violenceLevel: v2.violenceLevel ?? "",
            castSize: v2.castSize ?? "",
            camera: v2.camera ?? "",
            beat: v2.beat ?? "",
            statement: v2.statement,
            flagged: Boolean(v2.flagged) || flags.length > 0,
            flags,
            imageDataUrl: v2.imageDataUrl,
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

  function generateCoinFlip() {
    generate(Math.random() < 0.5 ? "v2" : "v3");
  }

  const elapsed =
    startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const toneCountsV2 = {
    combat: resultsV2.filter((item) => item.tone === "combat").length,
    quiet: resultsV2.filter((item) => item.tone === "quiet").length,
    other: resultsV2.filter((item) => item.tone === "other").length,
  };
  const toneCountsV3 = {
    combat: resultsV3.filter((item) => item.tone === "combat").length,
    quiet: resultsV3.filter((item) => item.tone === "quiet").length,
    other: resultsV3.filter((item) => item.tone === "other").length,
  };

  const results: MuralResult[] = [...resultsV3, ...resultsV2].sort((a, b) => {
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
            v2 tones · combat {toneCountsV2.combat} · quiet {toneCountsV2.quiet}{" "}
            · other {toneCountsV2.other}
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
            v3 tones · combat {toneCountsV3.combat} · quiet {toneCountsV3.quiet}{" "}
            · other {toneCountsV3.other}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={generateCoinFlip}
              disabled={loading !== null}
              className="btn-minimal disabled:opacity-40"
            >
              Generate
            </button>
          </div>
          {showEngineButtons ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => generate("v2")}
                disabled={loading !== null}
                className="btn-minimal disabled:opacity-40"
              >
                Generate mural (v2)
              </button>
              <button
                type="button"
                onClick={() => generate("v3")}
                disabled={loading !== null}
                className="btn-minimal disabled:opacity-40"
              >
                Generate mural (v3)
              </button>
            </div>
          ) : null}
          {loading ? (
            <p className="font-serif italic text-[#666]" aria-live="polite">
              Drawing a mural ({loading})… {elapsed}s
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
                Engine · {result.version === "v2" ? "V2" : "V3"}
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
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Scene · {result.scene}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Level · {result.violenceLevel}
              </p>
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                Cast · {result.castSize}
              </p>
              {result.version === "v2" ? (
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                  Camera · {result.camera}
                </p>
              ) : (
                <>
                  <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                    Mix level · {result.mixLevel}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                    Styles ·{" "}
                    {result.styles.length > 0
                      ? result.styles.join(" + ")
                      : "left to the artist"}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                    Palette · {dialLabel(result.palette)}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                    Composition · {dialLabel(result.composition)}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                    Texture · {dialLabel(result.texture)}
                  </p>
                </>
              )}
              {result.version === "v2" ? (
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]">
                  Figure · {result.figure}
                </p>
              ) : (
                result.figures.map((phrase, index) => (
                  <p
                    key={`${result.id}-figure-${index}`}
                    className="font-mono text-xs uppercase tracking-[0.08em] text-[#666]"
                  >
                    Figures · {phrase}
                  </p>
                ))
              )}
              {result.flagged ? (
                <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#0a0a0a]">
                  {flaggedLine(result.flags)}
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
