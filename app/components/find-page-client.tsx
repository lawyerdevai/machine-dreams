"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AgentName, TokenId } from "@/app/components/typography";
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

export function FindPageClient() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [walletLoading, setWalletLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [walletFeedback, setWalletFeedback] = useState<Feedback>(null);
  const [tokenFeedback, setTokenFeedback] = useState<Feedback>(null);
  const [agents, setAgents] = useState<AgentResult[]>([]);

  async function handleWalletSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = address.trim();
    if (!trimmed) return;

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
    if (!trimmed) return;

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

      router.push(agentOrArtworkPath(trimmed, data.hasArtwork === true));
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
          className={TYPE.input}
        />
        <button
          type="submit"
          disabled={walletLoading || tokenLoading}
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
          className={TYPE.input}
        />
        <button
          type="submit"
          disabled={walletLoading || tokenLoading}
          className="btn-minimal w-full disabled:opacity-40"
        >
          {tokenLoading ? "Checking…" : "Go"}
        </button>
        <FeedbackMessage feedback={tokenFeedback} />
      </form>

      {agents.length > 0 && (
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
      )}
    </div>
  );
}
