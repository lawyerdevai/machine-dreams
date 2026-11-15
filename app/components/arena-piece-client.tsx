"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { NormiePfpBadge } from "@/app/components/normie-pfp-badge";
import { ArenaFindClient } from "@/app/components/arena-find-client";
import {
  formatCreatedAt,
  formatTokenId,
  lowercaseName,
  uppercaseTitle,
} from "@/lib/format";
import { agentImageUrl } from "@/lib/normies";
import {
  downloadBlob,
  renderShareCardPng,
  shareCardFilename,
} from "@/lib/share-card";
import { arenaRecipeLabel } from "@/lib/arena-schools";
import type { ArenaPortrait } from "@/lib/arena";
import { TYPE } from "@/lib/typography";

const ARENA_CARD = {
  background: "#f2ead8",
  ink: "#15120f",
  muted: "#3a342c",
  mat: "#f2ead8",
};

function SaveCardButton({ portrait }: { portrait: ArenaPortrait }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const blob = await renderShareCardPng({
        artworkImageUrl: portrait.imageUrl,
        pfpUrl: agentImageUrl(portrait.tokenId),
        agentName: portrait.name,
        title: portrait.title,
        artistStatement: arenaRecipeLabel(portrait.primary, portrait.accents),
        tokenId: portrait.tokenId,
        palette: ARENA_CARD,
      });
      downloadBlob(
        blob,
        shareCardFilename(portrait.tokenId, portrait.title, "arena-portrait")
      );
    } catch {
      setError("Couldn't build the share card.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="btn-minimal self-start disabled:opacity-40"
        aria-label={busy ? "Saving card" : "Save card"}
      >
        {busy ? "Saving…" : "Save card"}
      </button>
      {error ? <p className={TYPE.statusError}>{error}</p> : null}
    </div>
  );
}

export function ArenaPieceClient({
  portrait,
  playReveal = false,
  debugRegenerate = false,
}: {
  portrait: ArenaPortrait;
  playReveal?: boolean;
  debugRegenerate?: boolean;
}) {
  const [revealing, setRevealing] = useState(playReveal);

  useEffect(() => {
    if (!playReveal) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("justCreated")) return;
    url.searchParams.delete("justCreated");
    const next = url.pathname + (url.search ? url.search : "") + url.hash;
    window.history.replaceState(window.history.state, "", next);
  }, [playReveal]);

  return (
    <main className="flex flex-1 flex-col px-6 py-10 md:py-14">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-14">
        <div className="w-full">
          <div
            className={`relative aspect-square bg-[#f2ead8] ${
              revealing ? "arena-ink-wipe" : ""
            }`}
            onAnimationEnd={() => setRevealing(false)}
          >
            <Image
              src={portrait.imageUrl}
              alt={portrait.title}
              fill
              sizes="(max-width: 768px) 100vw, 40rem"
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="flex flex-col gap-8 text-[#15120f]">
          <h1 className="page-title text-3xl uppercase tracking-wide md:text-4xl">
            {uppercaseTitle(portrait.title)}
          </h1>
          <p className="font-mono text-sm uppercase tracking-[0.12em]">
            {arenaRecipeLabel(portrait.primary, portrait.accents)}
          </p>
          <div className="flex items-center gap-3">
            <NormiePfpBadge
              src={agentImageUrl(portrait.tokenId)}
              variant="inline"
            />
            <div className="flex flex-col">
              <span className="font-mono text-sm">{lowercaseName(portrait.name)}</span>
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#3a342c]">
                {[portrait.type, formatTokenId(portrait.tokenId)]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </div>
          </div>
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[#3a342c]">
            {formatCreatedAt(portrait.createdAt)}
          </p>
          <SaveCardButton portrait={portrait} />
          {/* MINT: add an Arena mint block here later. This series does not mint yet. */}
          {debugRegenerate ? (
            <div className="border border-dashed border-[#15120f] p-4">
              <p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.12em]">
                Debug — draw again
              </p>
              <ArenaFindClient
                allowRegenerate
                initialTokenId={portrait.tokenId}
              />
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
