export interface Artwork {
  tokenId: string;
  agentName: string;
  title: string;
  artistStatement: string;
  imageUrl: string;
  createdAt: string;
  mintedAt: string | null;
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
  [key: string]: unknown;
}

export interface AwakenedAgent {
  tokenId: string;
  agentId: string;
}

export interface CreationPayload {
  title: string;
  streamingDescription: string;
  imagePrompt: string;
  artistStatement: string;
}
