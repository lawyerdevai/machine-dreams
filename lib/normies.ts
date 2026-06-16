import type { AgentInfo, AwakenedAgent } from "./types";

const BASE = "https://api.normies.art";

export function agentImageUrl(tokenId: string) {
  return `${BASE}/agents/image/${tokenId}`;
}

export async function getHolderTokenIds(address: string): Promise<string[]> {
  const res = await fetch(`${BASE}/holders/${address}`);
  if (!res.ok) throw new Error("Failed to fetch holder tokens");
  const data = await res.json();
  return data.tokenIds ?? [];
}

export async function getAgentBinding(
  tokenId: string
): Promise<AwakenedAgent | null> {
  const res = await fetch(`${BASE}/agents/binding/${tokenId}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.binding) return null;
  return {
    tokenId: data.binding.tokenId,
    agentId: data.binding.agentId,
  };
}

export async function getAgentInfo(tokenId: string): Promise<AgentInfo | null> {
  const res = await fetch(`${BASE}/agents/info/${tokenId}`);
  if (!res.ok) return null;
  return res.json();
}

export async function getBurnHistory(tokenId: string): Promise<unknown[]> {
  const res = await fetch(`${BASE}/history/burns/receiver/${tokenId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getAwakenedAgents(
  tokenIds: string[]
): Promise<AwakenedAgent[]> {
  const results = await Promise.all(
    tokenIds.map((id) => getAgentBinding(id))
  );
  return results.filter((a): a is AwakenedAgent => a !== null);
}
