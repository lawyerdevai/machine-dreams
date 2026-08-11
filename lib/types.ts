export type ArtworkCategory = "normie" | "data-medium" | "agentic";

/** App-persisted mint state (Redis). On-chain remains source of truth for disputes. */
export type MintStatus = "not-minted" | "minted";

export interface Artwork {
  tokenId: string;
  agentName: string;
  agentType?: string;
  agentLevel?: number;
  title: string;
  artistStatement: string;
  imagePrompt?: string;
  imageUrl: string;
  createdAt: string;
  mintedAt: string | null;
  /** Explicit mint flag; legacy records may only have mintedAt. */
  mintStatus?: MintStatus;
  /** Wallet that claimed this artwork on-chain. */
  mintedBy?: string;
  /** Mint transaction hash on mintedOnChainId. */
  mintTxHash?: string;
  /**
   * NFT contract this mint was recorded against.
   * Required to treat mintStatus as valid for the currently configured contract.
   */
  mintedOnContract?: string;
  /** Chain id for mintedOnContract (e.g. 11155111 Sepolia, 1 Ethereum). */
  mintedOnChainId?: number;
  imageExpired?: boolean;
  /** Collection bucket; missing on legacy Redis records — defaulted at read-time. */
  category?: ArtworkCategory;
}

export interface AgentInfo {
  tokenId: string;
  agentId: string;
  name: string;
  tagline: string;
  backstory: string;
  greeting: string;
  personalityTraits: string[];
  communicationStyle: string;
  systemPrompt?: string;
  type: string;
  canvas?: { level?: number };
  [key: string]: unknown;
}

export interface AwakenedAgent {
  tokenId: string;
  agentId: string;
}

export interface CreationPayload {
  title: string;
  imagePrompt: string;
  artistStatement: string;
}
