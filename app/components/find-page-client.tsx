"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agentImageUrl } from "@/lib/normies";
import { formatTokenId, lowercaseName } from "@/lib/format";

interface AgentResult {
  tokenId: string;
  name: string;
}

export function FindPageClient() {
  const router = useRouter();
  const [address, setAddress] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState<AgentResult[]>([]);

  async function handleWalletSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    setAgents([]);

    try {
      const res = await fetch("/api/holders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });
      if (!res.ok) throw new Error("Failed to fetch holders");
      const data = await res.json();
      const awakened: AgentResult[] = data.agents;
      if (awakened.length === 0) {
        setError("no awakened agents found for this wallet.");
        return;
      }
      setAgents(awakened);
    } catch {
      setError("could not fetch holders.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTokenGo(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenId.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/check-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: tokenId.trim() }),
      });
      const data = await res.json();
      if (!data.awakened) {
        setError("this normie hasn't awakened yet.");
        return;
      }
      router.push(`/agent/${tokenId.trim()}`);
    } catch {
      setError("could not verify token.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto gap-10">
      <form onSubmit={handleWalletSearch} className="flex flex-col gap-4 w-full">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="wallet address"
          className="border border-[#0a0a0a] px-3 py-2 text-sm lowercase bg-white w-full focus:outline-none font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-minimal w-full disabled:opacity-40"
        >
          Search
        </button>
      </form>

      <div className="h-px bg-[#0a0a0a] w-full" />

      <form onSubmit={handleTokenGo} className="flex flex-col gap-4 w-full">
        <input
          type="text"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
          placeholder="token id"
          className="border border-[#0a0a0a] px-3 py-2 text-sm lowercase bg-white w-full focus:outline-none font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-minimal w-full disabled:opacity-40"
        >
          Go
        </button>
      </form>

      {error && (
        <p className="font-mono text-sm lowercase text-red-600 text-center">{error}</p>
      )}

      {agents.length > 0 && (
        <div className="grid grid-cols-3 gap-6 w-full pt-4">
          {agents.map((agent) => (
            <Link
              key={agent.tokenId}
              href={`/agent/${agent.tokenId}`}
              className="flex flex-col gap-2 hover:opacity-80 transition-opacity"
            >
              <img
                src={agentImageUrl(agent.tokenId)}
                alt={agent.name}
                className="w-full aspect-square object-cover bg-white"
              />
              <span className="font-serif text-xs lowercase">
                {lowercaseName(agent.name)}
              </span>
              <span className="font-mono text-xs lowercase text-[#666]">
                {formatTokenId(agent.tokenId)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
