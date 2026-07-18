"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentName,
  ArtworkTitle,
  CreatedDate,
  ProseSm,
  SectionLabel,
} from "@/app/components/typography";
import type { AgentInfo, Artwork } from "@/lib/types";
import { ARTWORK_CREATION_USER_MESSAGE } from "@/lib/artwork-creation-messages";
import { sentenceCase } from "@/lib/format";
import { TYPE } from "@/lib/typography";
import { agentImageUrl } from "@/lib/normies";
import { SketchViewer } from "@/app/components/sketch-viewer";

const GRID =
  "grid grid-cols-1 md:grid-cols-2 gap-16 w-full max-w-6xl mx-auto";

const IMAGE_FRAME = "w-full aspect-square";

async function consumeSSE(
  response: Response,
  onEvent: (data: Record<string, string | boolean>) => void
) {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (line.startsWith("data: ")) {
        onEvent(JSON.parse(line.slice(6)));
      }
    }
  }
}

function useTypewriter(source: string, active: boolean) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!active) return;
    if (displayed.length >= source.length) return;
    const timer = setTimeout(() => {
      setDisplayed(source.slice(0, displayed.length + 1));
    }, 16);
    return () => clearTimeout(timer);
  }, [source, displayed, active]);

  return {
    displayed: active || displayed.length > 0 ? displayed : "",
    caughtUp: displayed.length >= source.length && source.length > 0,
  };
}

const INTRO_FAILED_MESSAGE = "Introduction failed. Please try again.";

/** Loads intro from Redis cache or /api/intro. Types only when animate is true. */
function useIntroStream(
  tokenId: string,
  cachedIntro: string | null,
  animate: boolean
) {
  const [introSource, setIntroSource] = useState("");
  const [introLoaded, setIntroLoaded] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (cachedIntro) {
      setIntroSource(cachedIntro);
      setIntroLoaded(true);
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/intro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenId }),
        });
        if (!res.ok) throw new Error(INTRO_FAILED_MESSAGE);
        let full = "";
        await consumeSSE(res, (event) => {
          if (event.type === "text") {
            full += event.text as string;
            setIntroSource(full);
          } else if (event.type === "error") {
            throw new Error(INTRO_FAILED_MESSAGE);
          }
        });
        setIntroLoaded(true);
      } catch {
        setError(INTRO_FAILED_MESSAGE);
        setIntroLoaded(true);
      }
    })();
  }, [tokenId, cachedIntro]);

  const { displayed: introDisplayed, caughtUp } = useTypewriter(
    introSource,
    animate
  );
  const introComplete = animate ? introLoaded && caughtUp : introLoaded;
  const introStreaming =
    animate && introSource.length > 0 && !introComplete;

  return {
    introSource,
    introDisplayed: animate ? introDisplayed : introSource,
    introComplete,
    introStreaming,
    error,
  };
}

function DreamingStatus() {
  const [dots, setDots] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDots((current) => (current + 1) % 4);
    }, 450);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className={`${TYPE.proseSm} italic`}>
      Dreaming{".".repeat(dots)}
    </p>
  );
}

/** Left column — pixel-identical to /artwork/[tokenId] */
function AgentLeftColumn({
  tokenId,
  agentName,
  introDisplayed,
  introComplete,
  introStreaming,
  introSource,
  animateIntro,
}: {
  tokenId: string;
  agentName: string;
  introDisplayed: string;
  introComplete: boolean;
  introStreaming: boolean;
  introSource: string;
  animateIntro: boolean;
}) {
  const introText =
    !animateIntro || introComplete
      ? sentenceCase(introSource)
      : introDisplayed;

  return (
    <div className="flex flex-col gap-6">
      <div className={IMAGE_FRAME}>
        <img
          src={agentImageUrl(tokenId)}
          alt={agentName}
          className="w-full h-full object-cover"
        />
      </div>
      <AgentName name={agentName} prominent as="p" />
      {introSource.length > 0 && (
        <ProseSm className="whitespace-pre-wrap">
          {introText}
          {introStreaming && <span className="cursor-blink">|</span>}
        </ProseSm>
      )}
    </div>
  );
}

/** Right column STATE 2 — pixel-identical to /artwork/[tokenId] */
function ArtworkRightColumn({
  tokenId,
  title,
  kind,
  imageUrl,
  sketchCode,
  artistStatement,
  createdAt,
}: {
  tokenId: string;
  title: string;
  kind: "image" | "sketch";
  imageUrl: string | null;
  sketchCode: string | null;
  artistStatement: string;
  createdAt: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <ArtworkTitle title={title} />
      <div className={IMAGE_FRAME}>
        {kind === "sketch" && sketchCode ? (
          <SketchViewer
            sketchCode={sketchCode}
            tokenId={tokenId}
            hasThumbnail={!!imageUrl}
          />
        ) : (
          <img
            src={imageUrl ?? undefined}
            alt={title}
            className="w-full h-full object-contain"
          />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <SectionLabel>Artist Statement</SectionLabel>
        <div className="h-px bg-[#0a0a0a] w-full" />
        <ProseSm>{sentenceCase(artistStatement)}</ProseSm>
        <CreatedDate iso={createdAt} />
      </div>
    </div>
  );
}

type Phase = "intro" | "question" | "ready" | "creating" | "complete";

interface AgentPageClientProps {
  agent: AgentInfo;
  artwork: Artwork | null;
  sketchCode: string | null;
  expiredArtwork: Artwork | null;
  cachedIntro: string | null;
}

export function AgentPageClient({
  agent,
  artwork,
  sketchCode,
  expiredArtwork,
  cachedIntro,
}: AgentPageClientProps) {
  const animateIntro = !artwork && !expiredArtwork;
  const intro = useIntroStream(agent.tokenId, cachedIntro, animateIntro);
  const agentName = artwork?.agentName ?? agent.name;

  return (
    <div className={GRID}>
      <AgentLeftColumn
        tokenId={agent.tokenId}
        agentName={agentName}
        introDisplayed={intro.introDisplayed}
        introComplete={intro.introComplete}
        introStreaming={intro.introStreaming}
        introSource={intro.introSource}
        animateIntro={animateIntro}
      />

      {artwork ? (
        <ExistingArtworkColumn
          agent={agent}
          artwork={artwork}
          sketchCode={sketchCode}
        />
      ) : expiredArtwork ? (
        <ExpiredRightColumn
          agent={agent}
          expiredArtwork={expiredArtwork}
          introError={intro.error}
        />
      ) : (
        <DiscoveryRightColumn
          agent={agent}
          introComplete={intro.introComplete}
          introError={intro.error}
        />
      )}
    </div>
  );
}

// SEASON-2-MOTION TEST BRANCH ONLY — do not merge to main.
// Always shows a regenerate CTA below existing artwork, even when it's
// still valid, so any awakened Normie can be pushed through the Season 2
// sketch pipeline for testing without waiting on expiry.
function ExistingArtworkColumn({
  agent,
  artwork,
  sketchCode,
}: {
  agent: AgentInfo;
  artwork: Artwork;
  sketchCode: string | null;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateFailed, setRegenerateFailed] = useState(false);

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenerateFailed(false);
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: agent.tokenId, regenerate: true }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        setRegenerateFailed(true);
        setRegenerating(false);
        return;
      }
      if (contentType.includes("text/event-stream")) {
        await consumeSSE(res, (event) => {
          if (event.type === "error") {
            throw new Error("creation_failed");
          }
        });
      }
      window.location.reload();
    } catch {
      setRegenerateFailed(true);
      setRegenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ArtworkRightColumn
        tokenId={artwork.tokenId}
        title={artwork.title}
        kind={artwork.kind ?? "image"}
        imageUrl={artwork.imageUrl ?? null}
        sketchCode={sketchCode}
        artistStatement={artwork.artistStatement}
        createdAt={artwork.createdAt}
      />
      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className="btn-minimal self-start disabled:opacity-40"
      >
        {regenerating ? "Regenerating..." : "Regenerate as Season 2"}
      </button>
      {regenerateFailed && (
        <p className={`${TYPE.proseSm} text-[#dc2626]`}>
          {ARTWORK_CREATION_USER_MESSAGE}
        </p>
      )}
    </div>
  );
}

function ExpiredRightColumn({
  agent,
  expiredArtwork,
  introError,
}: {
  agent: AgentInfo;
  expiredArtwork: Artwork;
  introError: string;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateFailed, setRegenerateFailed] = useState(false);
  const [error, setError] = useState("");

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenerateFailed(false);
    setError("");
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: agent.tokenId, regenerate: true }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        setRegenerateFailed(true);
        return;
      }
      if (contentType.includes("text/event-stream")) {
        await consumeSSE(res, (event) => {
          if (event.type === "error") {
            throw new Error("creation_failed");
          }
        });
      }
      window.location.reload();
    } catch {
      setRegenerateFailed(true);
      setRegenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ArtworkTitle title={expiredArtwork.title} />
      <div className="w-full aspect-square flex items-center justify-center">
        {regenerating ? (
          <DreamingStatus />
        ) : (
          <p className={TYPE.status}>image expired</p>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <SectionLabel>Artist Statement</SectionLabel>
        <div className="h-px bg-[#0a0a0a] w-full" />
        <ProseSm>{sentenceCase(expiredArtwork.artistStatement)}</ProseSm>
        <CreatedDate iso={expiredArtwork.createdAt} />
      </div>
      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className="btn-minimal self-start disabled:opacity-40"
      >
        {regenerating ? "Regenerating..." : "Regenerate Artwork"}
      </button>
      {regenerateFailed && (
        <p className={`${TYPE.proseSm} text-[#dc2626]`}>
          {ARTWORK_CREATION_USER_MESSAGE}
        </p>
      )}
      {(error || introError) && (
        <p className={TYPE.statusError}>{error || introError}</p>
      )}
    </div>
  );
}

function DiscoveryRightColumn({
  agent,
  introComplete,
  introError,
}: {
  agent: AgentInfo;
  introComplete: boolean;
  introError: string;
}) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [creationFailed, setCreationFailed] = useState(false);
  const questionShown = useRef(false);

  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"image" | "sketch">("sketch");
  const [sketchCode, setSketchCode] = useState<string | null>(null);
  const [artistStatement, setArtistStatement] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [showQuestion, setShowQuestion] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!introComplete || questionShown.current) return;
    questionShown.current = true;
    const timer = setTimeout(() => {
      setPhase("question");
      setShowQuestion(true);
      setTimeout(() => {
        setShowCreate(true);
        setPhase("ready");
      }, 600);
    }, 1000);
    return () => clearTimeout(timer);
  }, [introComplete]);

  const handleCreate = useCallback(async () => {
    setCreationFailed(false);
    setPhase("creating");
    setShowCreate(false);
    setShowQuestion(false);
    setSketchCode(null);
    setTitle("");
    setArtistStatement("");
    setCreatedAt("");

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: agent.tokenId }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        setCreationFailed(true);
        setPhase("ready");
        setShowCreate(true);
        setShowQuestion(true);
        return;
      }
      if (contentType.includes("application/json")) {
        setCreationFailed(true);
        setPhase("ready");
        setShowCreate(true);
        setShowQuestion(true);
        return;
      }

      await consumeSSE(res, (event) => {
        if (event.type === "complete") {
          setTitle(event.title as string);
          setArtistStatement(event.artistStatement as string);
          setKind((event.kind as "image" | "sketch" | undefined) ?? "sketch");
          setSketchCode((event.sketchCode as string) ?? null);
          setCreatedAt(event.createdAt as string);
          setPhase("complete");
        } else if (event.type === "error") {
          throw new Error("creation_failed");
        }
      });
    } catch {
      setCreationFailed(true);
      setPhase("ready");
      setShowCreate(true);
      setShowQuestion(true);
    }
  }, [agent.tokenId]);

  const isComplete =
    phase === "complete" && title && sketchCode && artistStatement && createdAt;

  return (
    <div className="flex flex-col gap-6 min-h-[40vh]">
      {isComplete ? (
        <ArtworkRightColumn
          tokenId={agent.tokenId}
          title={title}
          kind={kind}
          imageUrl={null}
          sketchCode={sketchCode}
          artistStatement={artistStatement}
          createdAt={createdAt}
        />
      ) : (
        <>
          {showQuestion && (phase === "question" || phase === "ready") && (
            <p className={`${TYPE.proseSm} text-[#666] fade-in`}>
              If you had one canvas — what would you create?
            </p>
          )}

          {showCreate && phase === "ready" && (
            <button
              onClick={handleCreate}
              className="btn-minimal self-start fade-in"
            >
              Create
            </button>
          )}

          {phase === "creating" && <DreamingStatus />}

          {creationFailed && (
            <p className={`${TYPE.proseSm} text-[#dc2626]`}>
              {ARTWORK_CREATION_USER_MESSAGE}
            </p>
          )}
        </>
      )}

      {introError && <p className={TYPE.statusError}>{introError}</p>}
    </div>
  );
}
