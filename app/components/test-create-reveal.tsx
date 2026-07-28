"use client";

import { useCallback, useEffect, useState } from "react";
import { MaterializingArtwork } from "@/app/components/materializing-artwork";
import { MaterializingNormiePfp } from "@/app/components/materializing-normie-pfp";
import { TextReveal } from "@/app/components/text-reveal";
import {
  formatTokenId,
  lowercaseName,
  sentenceCase,
  uppercaseTitle,
} from "@/lib/format";
import { agentImageUrl } from "@/lib/normies";
import type { Artwork } from "@/lib/types";

const EYEBROW =
  "font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#666]";
const BODY = "font-serif text-[0.9375rem] leading-[1.65] text-[#0a0a0a]";
const SECTION = "flex flex-col gap-8";
const RULE = "border-t border-[#e5e5e5]";

type Stage = "credit" | "bio" | "artwork" | "statement" | "status" | "done";

/**
 * One-time post-generation unveil for /test-create only.
 * Regular /artwork/[tokenId] does not use this — it loads instantly.
 */
export function TestCreateReveal({
  artwork,
  aboutBio,
}: {
  artwork: Artwork;
  aboutBio: string | null;
}) {
  const pfpSrc = agentImageUrl(artwork.tokenId);
  const aboutLabel = `About ${lowercaseName(artwork.agentName)}`;
  const bioText = aboutBio ? sentenceCase(aboutBio) : "";
  const statementText = sentenceCase(artwork.artistStatement);
  const hasBio = bioText.length > 0;

  const [stage, setStage] = useState<Stage>("credit");
  const [nameVisible, setNameVisible] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);
  const [bioSettled, setBioSettled] = useState(!hasBio);

  const onPfpComplete = useCallback(() => {
    setNameVisible(true);
    window.setTimeout(() => {
      setStage((s) => {
        if (s !== "credit") return s;
        return hasBio ? "bio" : "artwork";
      });
      if (!hasBio) setBioSettled(true);
    }, 280);
  }, [hasBio]);

  const onBioComplete = useCallback(() => {
    setBioSettled(true);
    setStage((s) => (s === "bio" ? "artwork" : s));
  }, []);

  // Title placard appears as the image resolves (~last third of materialize)
  useEffect(() => {
    if (stage !== "artwork") return;
    const titleAt = window.setTimeout(() => setTitleVisible(true), 1400);
    return () => window.clearTimeout(titleAt);
  }, [stage]);

  const onArtworkComplete = useCallback(() => {
    setTitleVisible(true);
    window.setTimeout(() => {
      setStage((s) => (s === "artwork" ? "statement" : s));
    }, 350);
  }, []);

  const onStatementComplete = useCallback(() => {
    setStatusVisible(true);
    setStage("status");
    window.setTimeout(() => setStage("done"), 700);
  }, []);

  const showArtwork =
    stage === "artwork" ||
    stage === "statement" ||
    stage === "status" ||
    stage === "done";

  return (
    <div className="grid flex-1 grid-cols-1 md:grid-cols-2 md:items-start">
      <div className="flex flex-col items-center justify-center px-6 py-10 md:min-h-[calc(100vh-3.5rem)] md:px-10 md:py-12">
        <div className="w-full max-w-xl bg-[#f7f7f5] p-3 md:p-4">
          {showArtwork ? (
            <MaterializingArtwork
              key={artwork.imageUrl}
              src={artwork.imageUrl}
              alt={artwork.title}
              active
              durationMs={2000}
              onComplete={onArtworkComplete}
            />
          ) : (
            <div className="aspect-square w-full bg-[#0a0a0a]/5" aria-hidden />
          )}
        </div>
      </div>

      <div className="flex flex-col justify-center px-6 py-10 md:min-h-[calc(100vh-3.5rem)] md:px-10 md:py-12 lg:px-14">
        <div className={`mx-auto w-full max-w-md ${SECTION}`}>
          <div className="flex items-center gap-3">
            <MaterializingNormiePfp
              key={`pfp-${artwork.tokenId}-${artwork.createdAt}`}
              src={pfpSrc}
              sizeClass="h-10 w-10 md:h-11 md:w-11"
              onComplete={onPfpComplete}
            />
            <span
              className={`${BODY} text-[#444] transition-opacity duration-500 ${
                nameVisible ? "opacity-100" : "opacity-0"
              }`}
            >
              {lowercaseName(artwork.agentName)}
              <span className="mx-1.5 text-[#bbb]">·</span>
              Normie {formatTokenId(artwork.tokenId)}
            </span>
          </div>

          <h1
            className={`${BODY} text-[1.25rem] tracking-[0.04em] transition-opacity duration-700 md:text-[1.375rem] ${
              titleVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {uppercaseTitle(artwork.title)}
          </h1>

          <div className="flex flex-col">
            {hasBio && (stage !== "credit" || bioSettled) ? (
              <div className={`${RULE} py-8`}>
                <div className="flex flex-col gap-3">
                  <span className={EYEBROW}>{aboutLabel}</span>
                  {stage === "bio" ? (
                    <TextReveal
                      key={`bio-${artwork.createdAt}`}
                      text={bioText}
                      active
                      msPerChar={14}
                      className={BODY}
                      onComplete={onBioComplete}
                    />
                  ) : bioSettled ? (
                    <p className={BODY}>{bioText}</p>
                  ) : null}
                </div>
              </div>
            ) : null}

            {stage === "statement" ||
            stage === "status" ||
            stage === "done" ? (
              <div className={`${RULE} py-8`}>
                <div className="flex flex-col gap-3">
                  <span className={EYEBROW}>Artist Statement</span>
                  {stage === "statement" ? (
                    <TextReveal
                      key={`stmt-${artwork.createdAt}`}
                      text={statementText}
                      active
                      msPerChar={14}
                      className={BODY}
                      onComplete={onStatementComplete}
                    />
                  ) : (
                    <p className={BODY}>{statementText}</p>
                  )}
                </div>
              </div>
            ) : null}

            {statusVisible ? (
              <div
                className={`${RULE} pt-8 transition-opacity duration-700 opacity-100`}
              >
                <div className="flex flex-col gap-4 opacity-50">
                  <span className={EYEBROW}>Status</span>
                  <div className="flex items-center justify-between gap-6">
                    <p className={BODY}>Not yet minted</p>
                    <button
                      type="button"
                      disabled
                      className="shrink-0 bg-[#0a0a0a] px-5 py-2.5 font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-white opacity-40"
                    >
                      Mint
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
