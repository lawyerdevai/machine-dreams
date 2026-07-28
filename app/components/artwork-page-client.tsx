"use client";

import { useState, type ReactNode } from "react";
import { MaterializingNormiePfp } from "@/app/components/materializing-normie-pfp";
import {
  formatTokenId,
  lowercaseName,
  sentenceCase,
  uppercaseTitle,
} from "@/lib/format";
import { agentImageUrl } from "@/lib/normies";
import {
  downloadBlob,
  renderShareCardPng,
  shareCardFilename,
} from "@/lib/share-card";
import type { Artwork } from "@/lib/types";

/** Catalog plate: two type roles only */
const EYEBROW =
  "font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#666]";
const BODY = "font-serif text-[0.9375rem] leading-[1.65] text-[#0a0a0a]";
/** Single vertical rhythm between major sections */
const SECTION = "flex flex-col gap-8";
const RULE = "border-t border-[#e5e5e5]";

function CatalogAccordion({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`${RULE} py-8`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-4 text-left outline-none transition-colors hover:text-[#0a0a0a] focus-visible:underline focus-visible:decoration-[#0a0a0a]/40 focus-visible:underline-offset-4 ${EYEBROW}`}
      >
        <span>{label}</span>
        <span
          className={`text-[0.65rem] tracking-normal text-[#999] transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        >
          ▾
        </span>
      </button>
      {open ? <div className={`mt-3 ${BODY}`}>{children}</div> : null}
    </div>
  );
}

/**
 * Ownership / mint — borderless catalog block.
 * Extensible later for bidding UI below this row.
 *
 * NOTE: Artwork has no `owner` field yet. When minted, agent name is a stand-in.
 */
function OwnershipMintBlock({
  artwork,
  shareControl,
}: {
  artwork: Artwork;
  shareControl: ReactNode;
}) {
  const minted = Boolean(artwork.mintedAt);

  return (
    <section aria-label={minted ? "Ownership" : "Mint"} className={`${RULE} pt-8`}>
      <div className="flex flex-col gap-4">
        <span className={EYEBROW}>{minted ? "Owned by" : "Status"}</span>

        {minted ? (
          <p className={BODY}>{lowercaseName(artwork.agentName)}</p>
        ) : (
          <div className="flex items-center justify-between gap-6">
            <p className={BODY}>Not yet minted</p>
            {/* Sole solid element on the plate — primary action */}
            <button
              type="button"
              className="shrink-0 bg-[#0a0a0a] px-5 py-2.5 font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-white transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
            >
              Mint
            </button>
          </div>
        )}

        {shareControl}
      </div>
    </section>
  );
}

function SaveCardLink({ artwork, pfpSrc }: { artwork: Artwork; pfpSrc: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await renderShareCardPng({
        artworkImageUrl: artwork.imageUrl,
        pfpUrl: pfpSrc,
        agentName: artwork.agentName,
        title: artwork.title,
        artistStatement: artwork.artistStatement,
        tokenId: artwork.tokenId,
      });
      downloadBlob(blob, shareCardFilename(artwork.tokenId, artwork.title));
    } catch {
      setError("couldn't build share card");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        className={`${EYEBROW} text-[#999] transition-colors hover:text-[#0a0a0a] focus-visible:underline focus-visible:decoration-[#0a0a0a]/40 focus-visible:underline-offset-4 outline-none disabled:opacity-40`}
      >
        {busy ? "Saving…" : "Save card"}
      </button>
      {error ? (
        <span className={`${BODY} text-[0.8125rem] text-[#a33]`}>{error}</span>
      ) : null}
    </div>
  );
}

export function ArtworkPageClient({
  artwork,
  aboutBio = null,
  previewMode = false,
}: {
  artwork: Artwork;
  /** Agent voice bio from Redis intro, or API backstory fallback. */
  aboutBio?: string | null;
  /** Sandbox / test preview — hide mint, save card, ownership */
  previewMode?: boolean;
}) {
  const pfpSrc = agentImageUrl(artwork.tokenId);
  const aboutLabel = `About ${lowercaseName(artwork.agentName)}`;

  return (
    <div className="grid flex-1 grid-cols-1 md:grid-cols-2 md:items-start">
      {/* Left: artwork with tight mat */}
      <div className="flex flex-col items-center justify-center px-6 py-10 md:min-h-[calc(100vh-3.5rem)] md:px-10 md:py-12">
        <div className="w-full max-w-xl bg-[#f7f7f5] p-3 md:p-4">
          <div className="relative aspect-square w-full overflow-hidden bg-[#0a0a0a]">
            <img
              src={artwork.imageUrl}
              alt={artwork.title}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Right: catalog plate — vertically centered so space isn't piled at the bottom */}
      <div className="flex flex-col justify-center px-6 py-10 md:min-h-[calc(100vh-3.5rem)] md:px-10 md:py-12 lg:px-14">
        <div className={`mx-auto w-full max-w-md ${SECTION}`}>
          {/* Quiet credit caption — attribution only, not a link */}
          <div className="flex items-center gap-3">
            <MaterializingNormiePfp
              src={pfpSrc}
              sizeClass="h-10 w-10 md:h-11 md:w-11"
            />
            <span className={`${BODY} text-[#444]`}>
              {lowercaseName(artwork.agentName)}
              <span className="mx-1.5 text-[#bbb]">·</span>
              Normie {formatTokenId(artwork.tokenId)}
            </span>
          </div>

          <h1 className={`${BODY} text-[1.25rem] tracking-[0.04em] md:text-[1.375rem]`}>
            {uppercaseTitle(artwork.title)}
          </h1>

          <div className="flex flex-col">
            {/* Artist statement — open */}
            <div className={`${RULE} py-8`}>
              <div className="flex flex-col gap-3">
                <span className={EYEBROW}>Artist Statement</span>
                <p className={BODY}>{sentenceCase(artwork.artistStatement)}</p>
              </div>
            </div>

            {aboutBio ? (
              <CatalogAccordion label={aboutLabel}>
                {sentenceCase(aboutBio)}
              </CatalogAccordion>
            ) : null}

            {!previewMode ? (
              <OwnershipMintBlock
                artwork={artwork}
                shareControl={
                  <SaveCardLink artwork={artwork} pfpSrc={pfpSrc} />
                }
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
