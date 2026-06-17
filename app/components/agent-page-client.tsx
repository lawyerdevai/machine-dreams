"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentInfo, Artwork } from "@/lib/types";
import { lowercaseName, sentenceCase, uppercaseTitle } from "@/lib/format";
import { agentImageUrl } from "@/lib/normies";

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

/** Loads intro from Redis cache or Claude API; always typewrites on screen. */
function useIntroStream(tokenId: string, cachedIntro: string | null) {
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
        if (!res.ok) throw new Error("Introduction failed");
        let full = "";
        await consumeSSE(res, (event) => {
          if (event.type === "text") {
            full += event.text as string;
            setIntroSource(full);
          } else if (event.type === "error") {
            throw new Error(event.message as string);
          }
        });
        setIntroLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Introduction failed");
        setIntroLoaded(true);
      }
    })();
  }, [tokenId, cachedIntro]);

  const { displayed: introDisplayed, caughtUp } = useTypewriter(
    introSource,
    true
  );
  const introComplete = introLoaded && caughtUp;
  const introStreaming = introSource.length > 0 && !introComplete;

  return { introSource, introDisplayed, introComplete, introStreaming, error };
}

/** Left column — pixel-identical to /artwork/[tokenId] */
function AgentLeftColumn({
  tokenId,
  agentName,
  introDisplayed,
  introComplete,
  introStreaming,
  introSource,
}: {
  tokenId: string;
  agentName: string;
  introDisplayed: string;
  introComplete: boolean;
  introStreaming: boolean;
  introSource: string;
}) {
  const introText = introComplete
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
      <p className="text-lg lowercase">{lowercaseName(agentName)}</p>
      {introSource.length > 0 && (
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-widest">
            Agent Voice
          </span>
          <div className="h-px bg-[#0a0a0a] w-full" />
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {introText}
            {introStreaming && (
              <span className="cursor-blink">|</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/** Right column STATE 2 — pixel-identical to /artwork/[tokenId] */
function ArtworkRightColumn({
  title,
  imageUrl,
  artistStatement,
}: {
  title: string;
  imageUrl: string;
  artistStatement: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl uppercase tracking-wide">
        {uppercaseTitle(title)}
      </h1>
      <div className={IMAGE_FRAME}>
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-contain"
        />
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-widest">
          Artist Statement
        </span>
        <div className="h-px bg-[#0a0a0a] w-full" />
        <p className="text-sm leading-relaxed">
          {sentenceCase(artistStatement)}
        </p>
      </div>
    </div>
  );
}

type Phase =
  | "intro"
  | "question"
  | "ready"
  | "creating"
  | "reveal"
  | "complete";

interface AgentPageClientProps {
  agent: AgentInfo;
  artwork: Artwork | null;
  expiredArtwork: Artwork | null;
  cachedIntro: string | null;
}

export function AgentPageClient({
  agent,
  artwork,
  expiredArtwork,
  cachedIntro,
}: AgentPageClientProps) {
  const intro = useIntroStream(agent.tokenId, cachedIntro);
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
      />

      {artwork ? (
        <ArtworkRightColumn
          title={artwork.title}
          imageUrl={artwork.imageUrl}
          artistStatement={artwork.artistStatement}
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
  const [error, setError] = useState("");

  async function handleRegenerate() {
    setRegenerating(true);
    setError("");
    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: agent.tokenId, regenerate: true }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Regeneration failed");
      }
      if (contentType.includes("text/event-stream")) {
        await consumeSSE(res, () => {});
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regeneration failed");
      setRegenerating(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl uppercase tracking-wide">
        {uppercaseTitle(expiredArtwork.title)}
      </h1>
      <div className="w-full aspect-square flex items-center justify-center text-[#666] text-sm lowercase">
        image expired
      </div>
      <div className="flex flex-col gap-3">
        <span className="text-xs uppercase tracking-widest">
          Artist Statement
        </span>
        <div className="h-px bg-[#0a0a0a] w-full" />
        <p className="text-sm leading-relaxed">
          {sentenceCase(expiredArtwork.artistStatement)}
        </p>
      </div>
      <button
        onClick={handleRegenerate}
        disabled={regenerating}
        className="btn-minimal self-start disabled:opacity-40"
      >
        {regenerating ? "Regenerating..." : "Regenerate Artwork"}
      </button>
      {(error || introError) && (
        <p className="text-sm lowercase text-red-600">{error || introError}</p>
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
  const [error, setError] = useState("");
  const questionShown = useRef(false);

  const [descriptionSource, setDescriptionSource] = useState("");
  const typingActive = phase === "creating" || phase === "reveal";
  const { displayed: descriptionDisplayed, caughtUp: descriptionTyped } =
    useTypewriter(descriptionSource, typingActive);

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [artistStatement, setArtistStatement] = useState("");
  const [descriptionFading, setDescriptionFading] = useState(false);
  const [descriptionHidden, setDescriptionHidden] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showArtwork, setShowArtwork] = useState(false);

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
    setError("");
    setPhase("creating");
    setShowCreate(false);
    setShowQuestion(false);
    setDescriptionHidden(false);
    setDescriptionFading(false);
    setShowArtwork(false);
    setDescriptionSource("");
    setImageUrl(null);
    setTitle("");
    setArtistStatement("");

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: agent.tokenId }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Creation failed");
      }
      if (contentType.includes("application/json")) {
        throw new Error("Artwork already exists");
      }

      await consumeSSE(res, (event) => {
        if (event.type === "description") {
          setDescriptionSource(event.text as string);
        } else if (event.type === "image") {
          setTitle(event.title as string);
          setImageUrl(event.imageUrl as string);
          setPhase("reveal");
          setTimeout(() => {
            setDescriptionFading(true);
            setTimeout(() => {
              setDescriptionHidden(true);
              setShowArtwork(true);
              setPhase("complete");
            }, 800);
          }, 1000);
        } else if (event.type === "complete") {
          setTitle(event.title as string);
          setArtistStatement(event.artistStatement as string);
          setImageUrl((prev) => prev ?? (event.imageUrl as string));
        } else if (event.type === "error") {
          throw new Error(event.message as string);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
      setPhase("ready");
      setShowCreate(true);
      setShowQuestion(true);
    }
  }, [agent.tokenId]);

  const isState2 = showArtwork && title && imageUrl && artistStatement;

  return (
    <div className="flex flex-col gap-6 min-h-[40vh]">
      {isState2 ? (
        <ArtworkRightColumn
          title={title}
          imageUrl={imageUrl}
          artistStatement={artistStatement}
        />
      ) : (
        <>
          {showQuestion &&
            (phase === "question" || phase === "ready") && (
              <p className="text-sm text-[#666] fade-in lowercase">
                if you had one canvas — what would you create?
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

          {descriptionSource && !descriptionHidden && (
            <p
              className={`text-sm leading-relaxed whitespace-pre-wrap ${
                descriptionFading ? "fade-out" : ""
              }`}
            >
              {descriptionDisplayed}
              {phase === "creating" && !descriptionTyped && (
                <span className="cursor-blink">|</span>
              )}
            </p>
          )}

          {(phase === "reveal" || phase === "complete") &&
            title &&
            imageUrl &&
            !showArtwork && (
              <>
                <h1 className="text-xl uppercase tracking-wide fade-in">
                  {uppercaseTitle(title)}
                </h1>
                <div className={`${IMAGE_FRAME} fade-in`}>
                  <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-contain"
                  />
                </div>
              </>
            )}
        </>
      )}

      {(error || introError) && (
        <p className="text-sm lowercase text-red-600">{error || introError}</p>
      )}
    </div>
  );
}
