"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArtworkReveal } from "@/app/components/artwork-reveal";
import { OwnershipMintBlock } from "@/app/components/artwork-mint-block";
import { DebugRegenerateButton } from "@/app/components/debug-regenerate-button";
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

function SaveCardButton({
  artwork,
  pfpSrc,
}: {
  artwork: Artwork;
  pfpSrc: string;
}) {
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
    <div className="mt-3 flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={busy}
        aria-label={busy ? "Saving card" : "Save card"}
        title="Save card"
        className="inline-flex h-8 w-8 items-center justify-center text-[#aaa] transition-colors hover:text-[#666] focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#ccc] disabled:opacity-40"
      >
        {busy ? (
          <span className="h-3.5 w-3.5 animate-pulse rounded-sm bg-current opacity-40" />
        ) : (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden
          >
            <path
              d="M8 2.5v7.25M8 9.75 5.25 7M8 9.75 10.75 7"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M3 11.5v1.25c0 .69.56 1.25 1.25 1.25h7.5c.69 0 1.25-.56 1.25-1.25V11.5"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
      {error ? (
        <span className={`${BODY} text-[0.75rem] text-[#a33]`}>{error}</span>
      ) : null}
    </div>
  );
}

function ArtworkLightbox({
  src,
  alt,
  open,
  onClose,
}: {
  src: string;
  alt: string;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/85 p-4 md:p-10"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center text-white/70 transition-colors hover:text-white md:right-6 md:top-6"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
          <path
            d="M5 5l10 10M15 5 5 15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

export function ArtworkPageClient({
  artwork,
  aboutBio = null,
  previewMode = false,
  playReveal = false,
  debugRegenerate = false,
}: {
  artwork: Artwork;
  /** Agent voice bio from Redis intro, or API backstory fallback. */
  aboutBio?: string | null;
  /** Sandbox / test preview — hide mint, save card, ownership */
  previewMode?: boolean;
  /** Post-creation unveil (`?justCreated=true`). One-shot per load. */
  playReveal?: boolean;
  /** Owner debug: show regenerate control when `?debugRegenerate=true` (9445 only). */
  debugRegenerate?: boolean;
}) {
  const pfpSrc = agentImageUrl(artwork.tokenId);
  const aboutLabel = `About ${lowercaseName(artwork.agentName)}`;

  // Latch the server's justCreated decision for this mount. Using router.replace
  // to strip the query would re-fetch the RSC payload with playReveal=false and
  // abort the unveil mid-sequence — so we keep a local flag and mutate history.
  const [revealing, setRevealing] = useState(playReveal);
  const [settledFromReveal, setSettledFromReveal] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (playReveal) setRevealing(true);
  }, [playReveal]);

  // Strip justCreated without a Next navigation (refresh/share won't replay)
  useEffect(() => {
    if (!revealing && !settledFromReveal) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("justCreated")) return;
    url.searchParams.delete("justCreated");
    const next = url.pathname + (url.search ? url.search : "") + url.hash;
    window.history.replaceState(window.history.state, "", next);
  }, [revealing, settledFromReveal]);

  const debugBar =
    debugRegenerate && !revealing ? (
      <DebugRegenerateButton tokenId={artwork.tokenId} />
    ) : null;

  if (revealing) {
    return (
      <>
        {debugBar}
        <ArtworkReveal
          artwork={artwork}
          aboutBio={aboutBio}
          statusSlot={<OwnershipMintBlock artwork={artwork} />}
          onComplete={() => {
            setSettledFromReveal(true);
            setRevealing(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      {debugBar}
      <div className="grid flex-1 grid-cols-1 md:grid-cols-2 md:items-start">
        {/* Left: artwork with tight mat */}
        <div className="flex flex-col items-center justify-center px-6 py-10 md:min-h-[calc(100vh-3.5rem)] md:px-10 md:py-12">
          <div className="w-full max-w-xl">
            <div className="bg-[#f7f7f5] p-3 md:p-4">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label={`View larger: ${artwork.title}`}
                className="relative aspect-square w-full cursor-zoom-in overflow-hidden bg-[#0a0a0a] outline-none focus-visible:ring-1 focus-visible:ring-[#0a0a0a]/40 focus-visible:ring-offset-2"
              >
                <img
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  className="h-full w-full object-contain"
                />
              </button>
            </div>
            {!previewMode ? (
              <SaveCardButton artwork={artwork} pfpSrc={pfpSrc} />
            ) : null}
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
                instant={settledFromReveal}
              />
              <span className={`${BODY} text-[#444]`}>
                {lowercaseName(artwork.agentName)}
                <span className="mx-1.5 text-[#bbb]">·</span>
                Normie {formatTokenId(artwork.tokenId)}
              </span>
            </div>

            <h1
              className={`${BODY} text-[1.25rem] tracking-[0.04em] md:text-[1.375rem]`}
            >
              {uppercaseTitle(artwork.title)}
            </h1>

            <div className="flex flex-col">
              {/* Artist statement — open by default */}
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

              {!previewMode ? <OwnershipMintBlock artwork={artwork} /> : null}
            </div>
          </div>
        </div>
      </div>

      <ArtworkLightbox
        src={artwork.imageUrl}
        alt={artwork.title}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
