"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AgentName, TokenId } from "@/app/components/typography";
import { ARTWORK_CREATION_USER_MESSAGE } from "@/lib/artwork-creation-messages";
import { agentImageUrl } from "@/lib/normies";
import { agentOrArtworkPath } from "@/lib/routes";
import { TYPE } from "@/lib/typography";

interface AgentResult {
  tokenId: string;
  name: string;
  hasArtwork: boolean;
}

type Feedback = { message: string; tone: "error" | "info" } | null;

function isValidWalletAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}

function isValidTokenId(value: string) {
  if (!/^\d+$/.test(value.trim())) return false;
  const n = Number(value.trim());
  return n >= 0 && n <= 9999;
}

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

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <p
      className={`text-center ${
        feedback.tone === "error" ? TYPE.statusError : TYPE.status
      }`}
    >
      {feedback.message}
    </p>
  );
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
    <p className={`${TYPE.proseSm} italic text-center`}>
      Dreaming{".".repeat(dots)}
    </p>
  );
}

export function FindPageClient() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState<Feedback>(null);
  const [tokenFeedback, setTokenFeedback] = useState<Feedback>(null);
  const [agents, setAgents] = useState<AgentResult[]>([]);

  const busy = walletLoading || tokenLoading || creating;

  async function createArtworkAndReveal(trimmedTokenId: string) {
    setCreating(true);
    setTokenFeedback(null);

    try {
      const res = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: trimmedTokenId }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok || contentType.includes("application/json")) {
        setTokenFeedback({
          tone: "error",
          message: ARTWORK_CREATION_USER_MESSAGE,
        });
        setCreating(false);
        return;
      }

      await consumeSSE(res, (event) => {
        if (event.type === "complete") {
          window.location.assign(
            `/artwork/${trimmedTokenId}?justCreated=true`
          );
        } else if (event.type === "error") {
          throw new Error("creation_failed");
        }
      });
    } catch {
      setTokenFeedback({
        tone: "error",
        message: ARTWORK_CREATION_USER_MESSAGE,
      });
      setCreating(false);
    }
  }

  async function handleWalletSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed || busy) return;

    setWalletLoading(true);
    setWalletFeedback(null);
    setAgents([]);

    if (!isValidWalletAddress(trimmed)) {
      setWalletFeedback({
        tone: "error",
        message:
          "that doesn't look like a valid ethereum address. try 0x followed by 40 hex characters.",
      });
      setWalletLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/holders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: trimmed }),
      });
      const data = await res.json();

      if (res.status === 400 && data.error === "invalid_address") {
        setWalletFeedback({
          tone: "error",
          message:
            "that doesn't look like a valid ethereum address. try 0x followed by 40 hex characters.",
        });
        return;
      }

      if (!res.ok) {
        setWalletFeedback({
          tone: "error",
          message: "something went wrong looking up that wallet. please try again.",
        });
        return;
      }

      const awakened: AgentResult[] = data.agents ?? [];
      if (awakened.length === 0) {
        setWalletFeedback({
          tone: "info",
          message:
            "this wallet is valid, but none of its normies have awakened yet.",
        });
        return;
      }

      setAgents(awakened);
    } catch {
      setWalletFeedback({
        tone: "error",
        message: "something went wrong looking up that wallet. please try again.",
      });
    } finally {
      setWalletLoading(false);
    }
  }

  async function handleTokenGo(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = tokenId.trim();
    if (!trimmed || busy) return;

    setTokenLoading(true);
    setTokenFeedback(null);

    if (!isValidTokenId(trimmed)) {
      setTokenFeedback({
        tone: "error",
        message: "enter a valid token id between 0 and 9999.",
      });
      setTokenLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/check-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: trimmed }),
      });
      const data = await res.json();

      if (res.status === 400 && data.error === "invalid_token_id") {
        setTokenFeedback({
          tone: "error",
          message: "enter a valid token id between 0 and 9999.",
        });
        return;
      }

      if (!res.ok) {
        setTokenFeedback({
          tone: "error",
          message: "something went wrong checking that token. please try again.",
        });
        return;
      }

      if (!data.awakened) {
        setTokenFeedback({
          tone: "info",
          message:
            "no awakened agent found for that token id. double-check the number, or this normie may not have awakened yet.",
        });
        return;
      }

      if (data.hasArtwork === true) {
        router.push(`/artwork/${trimmed}`);
        return;
      }

      // No artwork yet — start generation here (skip /agent intermediate page)
      setTokenLoading(false);
      await createArtworkAndReveal(trimmed);
      return;
    } catch {
      setTokenFeedback({
        tone: "error",
        message: "something went wrong checking that token. please try again.",
      });
    } finally {
      setTokenLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto gap-10">
      <form onSubmit={handleWalletSearch} className="flex flex-col gap-4 w-full">
        <input
          type="text"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (walletFeedback) setWalletFeedback(null);
          }}
          placeholder="wallet address"
          disabled={creating}
          className={TYPE.input}
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-minimal w-full disabled:opacity-40"
        >
          {walletLoading ? "Searching…" : "Search"}
        </button>
        <FeedbackMessage feedback={walletFeedback} />
      </form>

      <div className="relative flex items-center w-full">
        <div className="h-px bg-[#0a0a0a] w-full" />
        <span
          className={`${TYPE.sectionLabel} absolute left-1/2 -translate-x-1/2 bg-white px-3 text-[#666]`}
        >
          or
        </span>
      </div>

      <form onSubmit={handleTokenGo} className="flex flex-col gap-4 w-full">
        <input
          type="text"
          value={tokenId}
          onChange={(e) => {
            setTokenId(e.target.value);
            if (tokenFeedback) setTokenFeedback(null);
          }}
          placeholder="token id"
          disabled={creating}
          className={TYPE.input}
        />
        <button
          type="submit"
          disabled={busy}
          className="btn-minimal w-full disabled:opacity-40"
        >
          {creating
            ? "Creating…"
            : tokenLoading
              ? "Checking…"
              : "Go"}
        </button>
        {creating ? <DreamingStatus /> : null}
        <FeedbackMessage feedback={tokenFeedback} />
      </form>

      {agents.length > 0 && !creating ? (
        <div className="grid grid-cols-3 gap-6 w-full pt-4">
          {agents.map((agent) => (
            <Link
              key={agent.tokenId}
              href={agentOrArtworkPath(agent.tokenId, agent.hasArtwork)}
              className="flex flex-col gap-2 hover:opacity-80 transition-opacity"
            >
              <img
                src={agentImageUrl(agent.tokenId)}
                alt={agent.name}
                className="w-full aspect-square object-cover bg-white"
              />
              <AgentName name={agent.name} />
              <TokenId tokenId={agent.tokenId} />
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
