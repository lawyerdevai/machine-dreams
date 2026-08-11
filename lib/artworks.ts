import type { Artwork, MintStatus } from "./types";
import type { GalleryCategory } from "./gallery";
import { getAgentInfo } from "./normies";
import {
  getCurrentNftDeployment,
  type NftDeployment,
} from "./thirdweb-contract";

export type SortOption = "newest" | "oldest";
export type TypeFilter = "ALL" | "HUMAN" | "CAT" | "ALIEN" | "AGENT";

export interface EnrichedArtwork extends Artwork {
  agentType: string;
  agentLevel: number;
}

function normalizeAddress(address: string) {
  return address.trim().toLowerCase();
}

/**
 * True when Redis mint fields are scoped to the currently configured
 * NEXT_PUBLIC_NFT_CONTRACT_ADDRESS + machineDreamsChain.
 * Legacy records without mintedOnContract / mintedOnChainId do NOT match
 * (forces on-chain check / reconcile rather than trusting a flat "minted").
 */
export function isMintRecordForDeployment(
  artwork: Artwork,
  deployment: NftDeployment | null = getCurrentNftDeployment()
): boolean {
  if (!deployment) return false;
  if (!artwork.mintedOnContract || artwork.mintedOnChainId == null) {
    return false;
  }
  return (
    normalizeAddress(artwork.mintedOnContract) ===
      normalizeAddress(deployment.address) &&
    artwork.mintedOnChainId === deployment.chainId
  );
}

/** Raw Redis flag / mintedAt, ignoring contract scope. */
function hasUnscopedMintFlag(artwork: Artwork): boolean {
  if (artwork.mintStatus === "minted") return true;
  if (artwork.mintStatus === "not-minted") return false;
  return Boolean(artwork.mintedAt);
}

/**
 * Mint status for the *current* deployment only.
 * A Sepolia mint record does not count as minted on a mainnet contract.
 */
export function resolveMintStatus(artwork: Artwork): MintStatus {
  if (!hasUnscopedMintFlag(artwork)) return "not-minted";
  if (!isMintRecordForDeployment(artwork)) return "not-minted";
  return "minted";
}

export function isArtworkMinted(artwork: Artwork): boolean {
  return resolveMintStatus(artwork) === "minted";
}

/** Read-time defaults for legacy Redis records (no data migration). */
export function withArtworkDefaults(artwork: Artwork): Artwork {
  return {
    ...artwork,
    category: artwork.category ?? "normie",
    mintStatus: resolveMintStatus(artwork),
  };
}

export type RecordArtworkMintInput = {
  tokenId: string;
  mintedBy: string;
  mintTxHash: string;
  mintedAt?: string;
  mintedOnContract: string;
  mintedOnChainId: number;
};

/** Pure merge — callers persist via redis.saveArtwork / recordArtworkMint. */
export function withRecordedMint(
  artwork: Artwork,
  input: Omit<RecordArtworkMintInput, "tokenId">
): Artwork {
  return {
    ...artwork,
    mintStatus: "minted",
    mintedAt: input.mintedAt ?? new Date().toISOString(),
    mintedBy: input.mintedBy.trim(),
    mintTxHash: input.mintTxHash.trim(),
    mintedOnContract: input.mintedOnContract.trim(),
    mintedOnChainId: input.mintedOnChainId,
  };
}

/**
 * Mark minted from on-chain reconcile when wallet/tx may be unknown.
 * Always stamps the deployment being reconciled.
 */
export function withOnChainMintReconcile(
  artwork: Artwork,
  deployment: NftDeployment
): Artwork {
  if (isArtworkMinted(artwork)) return artwork;
  return {
    ...artwork,
    mintStatus: "minted",
    mintedAt: artwork.mintedAt ?? new Date().toISOString(),
    mintedOnContract: deployment.address,
    mintedOnChainId: deployment.chainId,
  };
}

export function matchesArtworkCategory(
  artwork: Artwork,
  category: GalleryCategory
): boolean {
  if (category === "all") return true;
  return (artwork.category ?? "normie") === category;
}

export async function enrichArtwork(artwork: Artwork): Promise<EnrichedArtwork> {
  const base = withArtworkDefaults(artwork);

  if (base.agentType) {
    return {
      ...base,
      agentType: base.agentType,
      agentLevel: base.agentLevel ?? 1,
    };
  }

  const info = await getAgentInfo(base.tokenId);
  const canvas = info?.canvas as { level?: number } | undefined;

  return {
    ...base,
    agentType: info?.type ?? "Unknown",
    agentLevel: canvas?.level ?? 1,
  };
}

export async function enrichArtworks(
  artworks: Artwork[]
): Promise<EnrichedArtwork[]> {
  return Promise.all(artworks.map(enrichArtwork));
}

export function filterArtworks(
  artworks: EnrichedArtwork[],
  {
    search,
    category = "all",
  }: { search: string; category?: GalleryCategory }
): EnrichedArtwork[] {
  let result = artworks;

  if (category !== "all") {
    result = result.filter((a) => matchesArtworkCategory(a, category));
  }

  if (!search.trim()) return result;

  const q = search.trim().toLowerCase();
  const tokenQuery = q.replace(/^#/, "");
  return result.filter(
    (a) =>
      (a.agentName ?? "").toLowerCase().includes(q) ||
      a.tokenId.toLowerCase().includes(tokenQuery)
  );
}

export function sortArtworks(
  artworks: EnrichedArtwork[],
  sort: SortOption
): EnrichedArtwork[] {
  return [...artworks].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return sort === "newest" ? bTime - aTime : aTime - bTime;
  });
}

export function paginate<T>(items: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    currentPage,
    totalPages,
    total: items.length,
  };
}
