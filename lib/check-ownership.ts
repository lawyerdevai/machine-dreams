import { getHolderTokenIds } from "@/lib/normies";
import { checkDelegatedOwnership } from "@/lib/delegate-ownership";

/**
 * Whether `walletAddress` may mint for Normie `tokenId`.
 *
 * 1. Direct hold via Normies holders API (unchanged).
 * 2. Else Delegate Registry v2 on Ethereum mainnet — incoming ALL /
 *    Normies-contract / specific-token delegation from a vault that still
 *    holds the token (read-only; no transactions).
 */
export async function checkOwnership(
  walletAddress: string,
  tokenId: string
): Promise<boolean> {
  const normalizedTokenId = tokenId.trim();
  const wallet = walletAddress.trim();

  const held = await getHolderTokenIds(wallet);
  if (held.some((id) => id.trim() === normalizedTokenId)) {
    return true;
  }

  return checkDelegatedOwnership(wallet, normalizedTokenId);
}
