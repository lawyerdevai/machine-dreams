"use client";

import { useEffect, useState } from "react";
import { NormiePfpBadge } from "@/app/components/normie-pfp-badge";
import { formatTokenId, lowercaseName } from "@/lib/format";
import { agentImageUrl } from "@/lib/normies";
import {
  arenaIngredient,
  arenaRecipeLabel,
  isArenaIngredientId,
  type ArenaIngredientId,
} from "@/lib/arena-schools";

const RUN_CAP = 12;

type Fx = { pixel: number; glitch: number };

type LabShared = {
  ok: true;
  tokenId: string;
  variation: number;
  name: string;
  type: string;
  title: string;
  imagePrompt: string;
  imageBase64: string;
};

type AbstractOk = LabShared & {
  pack?: "abstract";
  hand: ArenaIngredientId[];
  primary: ArenaIngredientId;
  accents: ArenaIngredientId[];
  fx: Fx;
  style: string;
  framing: string;
  direction: string;
  marks: string;
  action: string;
  patch: string;
  seal: boolean;
  dissolution: string;
  palette: string;
  interference: string[];
  disruption: number;
  pixelMode: string;
};

type CampaignOk = LabShared & {
  pack: "campaign";
  role: string;
  setting: string;
  weather: string;
  foreground: string;
  props: string[];
  framing: string;
  poseLevel: string;
  palette: string;
  twist: string;
  corner: string;
  signatureTraits: string[];
};

type LabOk = AbstractOk | CampaignOk;

type LabFail = {
  ok: false;
  tokenId: string;
  variation: number;
  message: string;
};

type LabCard = LabOk | LabFail;

function timestamp() {
  return Date.now();
}

function parseTokenList(raw: string): { tokens: string[]; error: string | null } {
  const parts = raw
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return { tokens: [], error: "Paste at least one Normie number." };
  }
  const tokens: string[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part) || Number(part) < 0 || Number(part) > 9999) {
      return {
        tokens: [],
        error: "Every number has to be a Normie from 0 to 9999.",
      };
    }
    if (!tokens.includes(part)) tokens.push(part);
  }
  if (tokens.length > RUN_CAP) {
    return { tokens, error: "12 images is the most in one run." };
  }
  return { tokens, error: null };
}

function names(ids: ArenaIngredientId[]) {
  return ids.map((id) => arenaIngredient(id).name).join(", ");
}

export function ArenaLabClient() {
  const [raw, setRaw] = useState("");
  const [pack, setPack] = useState<"abstract" | "campaign">("abstract");
  const [fourTimes, setFourTimes] = useState(false);
  const [phase, setPhase] = useState<"edit" | "confirm" | "run">("edit");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  const [cards, setCards] = useState<LabCard[]>([]);
  const [done, setDone] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (phase !== "run" || startedAt === null) return;
    const timer = window.setInterval(() => setNow(timestamp()), 250);
    return () => window.clearInterval(timer);
  }, [phase, startedAt]);

  function prepare() {
    const parsed = parseTokenList(raw);
    if (parsed.error || parsed.tokens.length === 0) {
      setNotice(parsed.error ?? "Paste at least one Normie number.");
      setPhase("edit");
      return;
    }
    if (fourTimes && parsed.tokens.length !== 1) {
      setNotice("Enter one Normie number to make it four times.");
      setPhase("edit");
      return;
    }
    setNotice(null);
    setPending(parsed.tokens);
    setPhase("confirm");
  }

  const jobs = fourTimes
    ? pending.slice(0, 1).flatMap((tokenId) =>
        [0, 1, 2, 3].map((variation) => ({ tokenId, variation }))
      )
    : pending.map((tokenId) => ({ tokenId, variation: 0 }));

  async function run() {
    if (jobs.length === 0 || jobs.length > RUN_CAP) return;
    setPhase("run");
    setCards([]);
    setDone(0);
    const start = timestamp();
    setStartedAt(start);
    setNow(start);
    const next: LabCard[] = [];
    for (const job of jobs) {
      try {
        const res = await fetch("/api/arena/lab", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId: job.tokenId,
            runSize: jobs.length,
            variation: job.variation,
            pack,
          }),
        });
        const data = (await res.json()) as LabOk | { message?: string };
        if (!res.ok || !("ok" in data) || data.ok !== true) {
          next.push({
            ok: false,
            tokenId: job.tokenId,
            variation: job.variation,
            message:
              "message" in data && data.message
                ? data.message
                : "This portrait couldn't be drawn right now. Please try again in a moment.",
          });
        } else {
          next.push(data);
        }
      } catch {
        next.push({
          ok: false,
          tokenId: job.tokenId,
          variation: job.variation,
          message:
            "This portrait couldn't be drawn right now. Please try again in a moment.",
        });
      }
      setCards([...next]);
      setDone(next.length);
    }
    setPhase("edit");
  }

  const elapsed =
    startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));
  const fraction = jobs.length === 0 ? 0 : done / jobs.length;
  const imageCount = jobs.length;
  const primaryCounts = new Map<string, number>();
  const comboCounts = new Map<string, number>();
  const dissolutionCounts = new Map<string, number>();
  const paletteCounts = new Map<string, number>();
  const titles: string[] = [];
  for (const card of cards) {
    if (!card.ok) continue;
    titles.push(
      `${card.title} · ${formatTokenId(card.tokenId)} · ${card.variation}`
    );
    if (card.pack === "campaign") continue;
    const primaryName = arenaIngredient(card.primary).name;
    primaryCounts.set(primaryName, (primaryCounts.get(primaryName) ?? 0) + 1);
    const combo = arenaRecipeLabel(card.primary, card.accents);
    comboCounts.set(combo, (comboCounts.get(combo) ?? 0) + 1);
    dissolutionCounts.set(
      card.dissolution,
      (dissolutionCounts.get(card.dissolution) ?? 0) + 1
    );
    paletteCounts.set(card.palette, (paletteCounts.get(card.palette) ?? 0) + 1);
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-10 text-[#15120f]">
      <div>
        <h1 className="page-title text-2xl uppercase tracking-wide">
          Arena lab
        </h1>
        <p className="mt-3 max-w-xl font-serif text-[#3a342c]">
          Paste Normie numbers, separated by commas or spaces. Nothing here is
          saved.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={pack === "abstract"}
          disabled={phase === "run"}
          onClick={() => {
            setPack("abstract");
            if (phase === "confirm") setPhase("edit");
          }}
          className={`border border-[#15120f] px-3 py-2 font-serif disabled:opacity-40 ${
            pack === "abstract"
              ? "bg-[#15120f] text-[#f2ead8]"
              : "bg-transparent"
          }`}
        >
          Abstract (existing)
        </button>
        <button
          type="button"
          aria-pressed={pack === "campaign"}
          disabled={phase === "run"}
          onClick={() => {
            setPack("campaign");
            if (phase === "confirm") setPhase("edit");
          }}
          className={`border border-[#15120f] px-3 py-2 font-serif disabled:opacity-40 ${
            pack === "campaign"
              ? "bg-[#15120f] text-[#f2ead8]"
              : "bg-transparent"
          }`}
        >
          Campaign (new)
        </button>
      </div>

      <label className="flex items-center gap-2 font-serif">
        <input
          type="checkbox"
          checked={fourTimes}
          disabled={phase === "run"}
          onChange={(event) => {
            setFourTimes(event.target.checked);
            if (phase === "confirm") setPhase("edit");
          }}
        />
        Same Normie 4 times
      </label>

      <textarea
        value={raw}
        onChange={(event) => {
          setRaw(event.target.value);
          if (phase === "confirm") setPhase("edit");
        }}
        disabled={phase === "run"}
        rows={5}
        placeholder="972, 100, 250"
        className="w-full border border-[#15120f] bg-[#f2ead8] px-3 py-2 font-mono text-sm focus:outline-none"
      />

      {phase === "confirm" ? (
        <div className="flex flex-col gap-3">
          <p className="font-serif">
            This will make {imageCount}{" "}
            {pack === "campaign" ? "Campaign" : "Abstract"}{" "}
            {imageCount === 1 ? "image" : "images"}.
          </p>
          <button type="button" onClick={run} className="btn-minimal self-start">
            Confirm
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={prepare}
          disabled={phase === "run"}
          className="btn-minimal self-start disabled:opacity-40"
        >
          Make
        </button>
      )}

      {notice ? <p className="font-serif text-[#15120f]">{notice}</p> : null}

      {phase === "run" ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <div className="h-0.5 w-full bg-[#e4dcc8]">
            <div
              className="h-full bg-[#15120f]"
              style={{ width: `${Math.min(100, fraction * 100)}%` }}
            />
          </div>
          <p className="font-serif italic">
            Making {Math.min(done + 1, imageCount)} of {imageCount} · {elapsed}s
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-10">
        {cards.map((card, index) =>
          card.ok ? (
            <article
              key={`${card.tokenId}-${card.variation}-${index}`}
              className="flex flex-col gap-4"
            >
              {/* Data URL from this lab response; not a remote portrait. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/webp;base64,${card.imageBase64}`}
                alt={card.title}
                className="w-full max-w-xl border border-[#15120f] bg-[#f2ead8]"
              />
              <h2 className="page-title text-2xl uppercase tracking-wide">
                {card.title}
              </h2>
              <div className="flex items-center gap-3">
                <NormiePfpBadge
                  src={agentImageUrl(card.tokenId)}
                  variant="inline"
                />
                <div className="flex flex-col">
                  <span className="font-mono text-sm">
                    {lowercaseName(card.name)}
                  </span>
                  <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#3a342c]">
                    {[card.type, formatTokenId(card.tokenId)]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              </div>
              {card.pack === "campaign" ? (
                <>
                  <p className="font-mono text-sm">
                    Traits requested: {card.signatureTraits.join("; ")}
                  </p>
                  <p className="font-mono text-sm">Twist: {card.twist}</p>
                  <p className="font-mono text-sm">Role: {card.role}</p>
                  <p className="font-mono text-sm">Setting: {card.setting}</p>
                  <p className="font-mono text-sm">
                    Time and weather: {card.weather}
                  </p>
                  <p className="font-mono text-sm">
                    Foreground: {card.foreground}
                  </p>
                  <p className="font-mono text-sm">
                    Props: {card.props.join(", ")}
                  </p>
                  <p className="font-mono text-sm">Framing: {card.framing}</p>
                  <p className="font-mono text-sm">Pose: {card.poseLevel}</p>
                  <p className="font-mono text-sm">Palette: {card.palette}</p>
                  <p className="font-mono text-sm">
                    Identity card: {card.corner}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-mono text-sm">
                    Hand: {names(card.hand.filter(isArenaIngredientId))}
                  </p>
                  <p className="font-mono text-sm">
                    Choice: {arenaRecipeLabel(card.primary, card.accents)} ·
                    pixel {card.fx.pixel} · glitch {card.fx.glitch}
                  </p>
                  <p className="max-w-xl font-serif leading-relaxed">
                    {card.style}
                  </p>
                  <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#3a342c]">
                    {card.action} · {card.framing} · faces {card.direction} ·{" "}
                    {card.marks} marks · variation {card.variation}
                  </p>
                  <p className="font-mono text-sm">
                    Dissolution: {card.dissolution}
                  </p>
                  <p className="font-mono text-sm">Palette: {card.palette}</p>
                  <p className="font-mono text-sm">
                    Interference:{" "}
                    {card.interference.length > 0
                      ? card.interference.join("; ")
                      : "none"}
                  </p>
                  <p className="font-mono text-sm">
                    Disruption: {card.disruption} · pixels {card.pixelMode}
                  </p>
                </>
              )}
              <details className="max-w-xl">
                <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.08em]">
                  Image prompt
                </summary>
                <pre className="mt-3 whitespace-pre-wrap font-serif text-sm leading-relaxed">
                  {card.imagePrompt}
                </pre>
              </details>
            </article>
          ) : (
            <article
              key={`${card.tokenId}-${card.variation}-error-${index}`}
              className="border border-[#15120f] px-4 py-3"
            >
              <p className="font-mono text-sm">{formatTokenId(card.tokenId)}</p>
              <p className="mt-2 font-serif">{card.message}</p>
            </article>
          )
        )}
      </div>

      {cards.some((card) => card.ok) ? (
        <section className="flex flex-col gap-4 border-t border-[#15120f] pt-6">
          <h2 className="font-mono text-xs uppercase tracking-[0.12em]">
            Recipes so far
          </h2>
          <ul className="font-serif">
            {[...primaryCounts.entries()].map(([name, count]) => (
              <li key={name}>
                {name}: {count}
              </li>
            ))}
          </ul>
          <ul className="font-serif">
            {[...comboCounts.entries()].map(([name, count]) => (
              <li key={name}>
                {name}: {count}
              </li>
            ))}
          </ul>
          <h2 className="font-mono text-xs uppercase tracking-[0.12em]">
            Dissolution
          </h2>
          <ul className="font-serif">
            {[...dissolutionCounts.entries()].map(([name, count]) => (
              <li key={name}>
                {name}: {count}
              </li>
            ))}
          </ul>
          <h2 className="font-mono text-xs uppercase tracking-[0.12em]">
            Palettes
          </h2>
          <ul className="font-serif">
            {[...paletteCounts.entries()].map(([name, count]) => (
              <li key={name}>
                {name}: {count}
              </li>
            ))}
          </ul>
          <h2 className="font-mono text-xs uppercase tracking-[0.12em]">
            Titles
          </h2>
          <ul className="font-serif">
            {titles.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
