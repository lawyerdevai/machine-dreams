"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agentImageUrl } from "@/lib/normies";
import type { Artwork } from "@/lib/types";

interface WalletSearchProps {
  onResults: (tokenIds: string[]) => void;
}

export function WalletSearch({ onResults }: WalletSearchProps) {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/holders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim() }),
      });

      if (!res.ok) throw new Error("Failed to fetch holders");

      const data = await res.json();
      onResults(data.agents.map((a: { tokenId: string }) => a.tokenId));
    } catch {
      setError("Could not fetch holders");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-xl">
      <input
        type="text"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Enter a wallet address"
        className="flex-1 bg-transparent border border-[#333] px-3 py-2 text-sm focus:outline-none focus:border-[#555]"
      />
      <button
        type="submit"
        disabled={loading}
        className="border border-[#333] px-4 py-2 text-sm hover:border-[#555] disabled:opacity-40"
      >
        {loading ? "..." : "Submit"}
      </button>
      {error && <span className="text-sm text-red-400 self-center">{error}</span>}
    </form>
  );
}

interface NormieGridProps {
  tokenIds: string[];
}

export function NormieGrid({ tokenIds }: NormieGridProps) {
  if (tokenIds.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full">
      {tokenIds.map((tokenId) => (
        <Link
          key={tokenId}
          href={`/agent/${tokenId}`}
          className="group border border-[#222] hover:border-[#444] transition-colors"
        >
          <img
            src={agentImageUrl(tokenId)}
            alt={`Normie #${tokenId}`}
            className="w-full aspect-square object-cover"
          />
          <div className="p-2 text-xs text-[#888] group-hover:text-[#e3e5e4]">
            #{tokenId}
          </div>
        </Link>
      ))}
    </div>
  );
}

interface ArtworkGalleryProps {
  artworks: Artwork[];
}

export function TokenIdInput() {
  const [tokenId, setTokenId] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenId.trim()) return;
    router.push(`/agent/${tokenId.trim()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 justify-center mt-4">
      <input
        type="text"
        value={tokenId}
        onChange={(e) => setTokenId(e.target.value)}
        placeholder="Token ID"
        className="w-24 bg-transparent border border-[#333] px-3 py-2 text-sm text-center focus:outline-none focus:border-[#555]"
      />
      <button
        type="submit"
        className="border border-[#333] px-4 py-2 text-sm hover:border-[#555]"
      >
        Go
      </button>
    </form>
  );
}

export function ArtworkGallery({ artworks }: ArtworkGalleryProps) {
  if (artworks.length === 0) {
    return (
      <div className="text-[#666] text-sm py-16 text-center">
        <p>No artworks yet.</p>
        <p className="mt-2">Enter a token ID to summon the first one.</p>
        <TokenIdInput />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full">
      {artworks.map((artwork) => (
        <Link
          key={artwork.tokenId}
          href={`/artwork/${artwork.tokenId}`}
          className="group border border-[#222] hover:border-[#444] transition-colors"
        >
          <img
            src={artwork.imageUrl}
            alt={artwork.title || artwork.agentName}
            className="w-full aspect-square object-cover"
          />
          <div className="p-2">
            <div className="text-sm">{artwork.title || artwork.agentName}</div>
            <div className="text-xs text-[#666]">#{artwork.tokenId}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
