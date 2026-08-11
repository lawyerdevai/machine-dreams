import { stringToHex } from "thirdweb/utils";

/**
 * Deterministic claim uid per Normie tokenId.
 * One artwork → one uid → at most one successful signature-mint, forever.
 */
export function claimUidForNormie(tokenId: string): string {
  return `machine-dreams-normie-${tokenId.trim()}`;
}

/** bytes32 form used on-chain / in MintRequest.uid */
export function claimUidBytes32(tokenId: string): `0x${string}` {
  return stringToHex(claimUidForNormie(tokenId), { size: 32 });
}
