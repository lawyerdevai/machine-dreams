import "server-only";

import { DelegateV2, type V2Delegation } from "@delegatexyz/sdk";
import { http } from "viem";
import { mainnet } from "viem/chains";
import { getHolderTokenIds, NORMIES_NFT_CONTRACT } from "@/lib/normies";

function asAddress(value: string): `0x${string}` {
  const trimmed = value.trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(trimmed)) {
    throw new Error("invalid_address");
  }
  return trimmed as `0x${string}`;
}

function getDelegateV2() {
  const rpcUrl =
    process.env.ETH_RPC_URL?.trim() ||
    process.env.MAINNET_RPC_URL?.trim() ||
    "https://ethereum-rpc.publicnode.com";

  return new DelegateV2({
    userTransport: http(rpcUrl),
    chain: mainnet,
  });
}

/**
 * Whether an incoming v2 delegation could cover this Normie tokenId
 * (wallet-wide ALL, Normies contract-level, or that specific ERC-721).
 */
function delegationCoversNormie(
  delegation: V2Delegation,
  tokenId: number
): boolean {
  const type = String(delegation.type).toUpperCase();
  if (type === "ALL") return true;

  const contract = String(delegation.contract || "").toLowerCase();
  if (contract !== NORMIES_NFT_CONTRACT.toLowerCase()) return false;

  if (type === "CONTRACT") return true;
  if (type === "ERC721") {
    return Number(delegation.tokenId) === tokenId;
  }
  return false;
}

/**
 * Read-only Delegate Registry v2 check on Ethereum mainnet.
 * Returns true if `walletAddress` is a delegate for a vault that currently
 * holds Normie `tokenId` (ALL / contract / ERC-721 levels).
 */
export async function checkDelegatedOwnership(
  walletAddress: string,
  tokenId: string
): Promise<boolean> {
  const normalizedTokenId = tokenId.trim();
  const tokenNum = Number(normalizedTokenId);
  if (!/^\d+$/.test(normalizedTokenId) || !Number.isInteger(tokenNum)) {
    return false;
  }

  let to: `0x${string}`;
  try {
    to = asAddress(walletAddress);
  } catch {
    return false;
  }

  const v2 = getDelegateV2();
  let incoming: V2Delegation[];
  try {
    incoming = await v2.getIncomingDelegations(to);
  } catch (err) {
    console.error("[delegate] getIncomingDelegations failed", err);
    return false;
  }

  const vaults = new Set<`0x${string}`>();
  for (const delegation of incoming) {
    if (!delegationCoversNormie(delegation, tokenNum)) continue;
    vaults.add(asAddress(delegation.from));
  }

  if (vaults.size === 0) return false;

  const normies = asAddress(NORMIES_NFT_CONTRACT);

  for (const vault of vaults) {
    try {
      // Hierarchical: ALL / contract / token — view call only
      const delegated = await v2.checkDelegateForERC721(
        to,
        vault,
        normies,
        tokenNum
      );
      if (!delegated) continue;

      const held = await getHolderTokenIds(vault);
      if (held.some((id) => id.trim() === normalizedTokenId)) {
        return true;
      }
    } catch (err) {
      console.error("[delegate] vault check failed", { vault, err });
    }
  }

  return false;
}
