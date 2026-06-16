"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentInfo, Artwork } from "@/lib/types";

interface AgentExperienceProps {
  agent: AgentInfo;
  initialArtwork: Artwork | null;
}

type Phase =
  | "cached"
  | "intro"
  | "question"
  | "ready"
  | "creating"
  | "reveal"
  | "complete";

async function consumeSSE(
  response: Response,
  onEvent: (data: Record<string, string>) => void
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

function ArtworkView({
  agent,
  title,
  imageUrl,
  artistStatement,
}: {
  agent: AgentInfo;
  title: string;
  imageUrl: string;
  artistStatement: string;
}) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg">{agent.name}</h1>
        <p className="text-sm text-[#666]">{agent.tagline}</p>
      </div>
      <h2 className="text-xl">{title}</h2>
      <img src={imageUrl} alt={title} className="w-full" />
      <p className="text-sm leading-relaxed">{artistStatement}</p>
    </div>
  );
}

export function AgentExperience({ agent, initialArtwork }: AgentExperienceProps) {
  const [phase, setPhase] = useState<Phase>(
    initialArtwork ? "cached" : "intro"
  );
  const [error, setError] = useState("");
  const introStarted = useRef(false);

  const [introSource, setIntroSource] = useState("");
  const [introText, setIntroText] = useState("");
  const { displayed: introDisplayed, caughtUp: introDone } = useTypewriter(
    introSource,
    phase === "intro"
  );

  const [descriptionSource, setDescriptionSource] = useState("");
  const typingActive = phase === "creating" || phase === "reveal";
  const { displayed: descriptionDisplayed, caughtUp: descriptionTyped } =
    useTypewriter(descriptionSource, typingActive);

  const [title, setTitle] = useState(initialArtwork?.title ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(
    initialArtwork?.imageUrl ?? null
  );
  const [artistStatement, setArtistStatement] = useState(
    initialArtwork?.artistStatement ?? ""
  );
  const [descriptionFading, setDescriptionFading] = useState(false);
  const [descriptionHidden, setDescriptionHidden] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showStatement, setShowStatement] = useState(false);

  const startIntro = useCallback(async () => {
    setError("");
    setPhase("intro");

    try {
      const res = await fetch("/api/intro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: agent.tokenId }),
      });

      if (!res.ok) throw new Error("Introduction failed");

      let full = "";
      await consumeSSE(res, (event) => {
        if (event.type === "text") {
          full += event.text;
          setIntroSource(full);
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });
      setIntroText(full);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Introduction failed");
    }
  }, [agent.tokenId]);

  useEffect(() => {
    if (initialArtwork || introStarted.current) return;
    introStarted.current = true;
    startIntro();
  }, [initialArtwork, startIntro]);

  useEffect(() => {
    if (phase !== "intro" || !introDone) return;
    const timer = setTimeout(() => {
      setPhase("question");
      setShowQuestion(true);
      setTimeout(() => {
        setShowCreate(true);
        setPhase("ready");
      }, 600);
    }, 1500);
    return () => clearTimeout(timer);
  }, [phase, introDone]);

  async function handleCreate() {
    setError("");
    setPhase("creating");
    setShowCreate(false);
    setShowQuestion(false);

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: agent.tokenId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Creation failed");
      }

      await consumeSSE(res, (event) => {
        if (event.type === "description") {
          setDescriptionSource(event.text);
        } else if (event.type === "image") {
          setTitle(event.title);
          setImageUrl(event.imageUrl);
          setPhase("reveal");
          setShowTitle(true);
          setShowImage(true);

          setTimeout(() => {
            setDescriptionFading(true);
            setTimeout(() => {
              setDescriptionHidden(true);
              setShowStatement(true);
              setPhase("complete");
            }, 800);
          }, 1000);
        } else if (event.type === "complete") {
          setTitle(event.title);
          setArtistStatement(event.artistStatement);
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
      setPhase("ready");
      setShowCreate(true);
      setShowQuestion(true);
    }
  }

  if (phase === "cached" && initialArtwork) {
    return (
      <ArtworkView
        agent={agent}
        title={initialArtwork.title}
        imageUrl={initialArtwork.imageUrl}
        artistStatement={initialArtwork.artistStatement}
      />
    );
  }

  const showIntroStatic =
    phase !== "intro" && introText && phase !== "complete";

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl min-h-[60vh]">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg">{agent.name}</h1>
        <p className="text-sm text-[#666]">{agent.tagline}</p>
      </div>

      {phase === "intro" && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {introDisplayed}
          {!introDone && <span className="cursor-blink">|</span>}
        </p>
      )}

      {showIntroStatic && (
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {introText}
        </p>
      )}

      {showQuestion && phase !== "creating" && phase !== "reveal" && phase !== "complete" && (
        <p className="text-sm text-[#666] fade-in">
          If you had one canvas — what would you create?
        </p>
      )}

      {showCreate && phase === "ready" && (
        <button
          onClick={handleCreate}
          className="self-start text-sm text-[#666] hover:text-[#e3e5e4] transition-colors duration-500 fade-in"
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

      {title && showTitle && (
        <h2 className={`text-xl ${showTitle ? "fade-in" : "opacity-0"}`}>
          {title}
        </h2>
      )}

      {imageUrl && (
        <img
          src={imageUrl}
          alt={title || `Artwork by ${agent.name}`}
          className={`w-full ${showImage ? "fade-in" : "opacity-0"}`}
        />
      )}

      {showStatement && artistStatement && (
        <p className="text-sm leading-relaxed fade-in">{artistStatement}</p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
