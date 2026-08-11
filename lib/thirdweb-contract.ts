import { getContract, type ThirdwebClient } from "thirdweb";
import {
  machineDreamsChain,
  thirdwebClient,
} from "@/lib/thirdweb-client";

export type NftDeployment = {
  address: string;
  chainId: number;
};

/**
 * Currently configured Machine Dreams NFT deployment (env contract + active chain).
 * Returns null if contract address is not configured.
 */
export function getCurrentNftDeployment(): NftDeployment | null {
  const address = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS?.trim();
  if (!address) return null;
  return {
    address,
    chainId: machineDreamsChain.id,
  };
}

/**
 * Machine Dreams NFT Collection for the configured chain (Ethereum mainnet).
 * Safe for client components when using the browser thirdwebClient.
 */
export function getNftContract(client: ThirdwebClient = thirdwebClient) {
  const deployment = getCurrentNftDeployment();
  if (!deployment) {
    throw new Error("NEXT_PUBLIC_NFT_CONTRACT_ADDRESS is not set");
  }

  return getContract({
    client,
    chain: machineDreamsChain,
    address: deployment.address,
  });
}

/** Etherscan tx URL for the active mint chain (Ethereum mainnet). */
export function etherscanTxUrl(txHash: string) {
  return `https://etherscan.io/tx/${txHash}`;
}
