export type ArtworkCategory = "normie" | "data-medium" | "agentic";

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
