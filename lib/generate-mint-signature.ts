import "server-only";

import { createThirdwebClient } from "thirdweb";
import { generateMintSignature } from "thirdweb/extensions/erc721";
import { privateKeyToAccount } from "thirdweb/wallets";
import { isNormieClaimAlreadyMinted } from "@/lib/check-already-minted";
import { checkOwnership } from "@/lib/check-ownership";
import { claimUidForNormie } from "@/lib/mint-uid";
import { getArtwork } from "@/lib/redis";
import { getNftContract } from "@/lib/thirdweb-contract";

export class MintSignatureError extends Error {
  constructor(
    message: string,
    readonly code:
      | "not_eligible"
      | "already_minted"
      | "missing_config"
      | "signature_failed" = "signature_failed"
  ) {
    super(message);
    this.name = "MintSignatureError";
  }
}

function getServerClient() {
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  if (!secretKey) {
    throw new MintSignatureError(
      "THIRDWEB_SECRET_KEY is not set",
      "missing_config"
    );
  }
  return createThirdwebClient({ secretKey });
}

function getMinterAccount(client: ReturnType<typeof createThirdwebClient>) {
  const privateKey = process.env.MAINNET_MINTER_PRIVATE_KEY;
  if (!privateKey) {
    throw new MintSignatureError(
      "MAINNET_MINTER_PRIVATE_KEY is not set (admin wallet that can signature-mint on the mainnet collection)",
      "missing_config"
    );
  }
  return privateKeyToAccount({
    client,
    privateKey: privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
  });
}

/** JSON-safe mint signature (bigints → strings). */
export type SerializedMintSignature = {
  payload: Record<string, string>;
  signature: `0x${string}`;
};

function serializeMintSignature(result: {
  payload: Record<string, unknown>;
  signature: string;
}): SerializedMintSignature {
  const payload: Record<string, string> = {};
  for (const [key, value] of Object.entries(result.payload)) {
    payload[key] = typeof value === "bigint" ? value.toString() : String(value);
  }
  return {
    payload,
    signature: result.signature as `0x${string}`,
  };
}

/**
 * Verify Normie ownership + not-yet-minted, then sign a mainnet mint payload.
 * Deterministic uid per tokenId — one successful mint forever (per contract).
 */
export async function generateMintSignatureForNormie(
  walletAddress: string,
  tokenId: string
): Promise<SerializedMintSignature> {
  const trimmedId = tokenId.trim();

  const alreadyMinted = await isNormieClaimAlreadyMinted(trimmedId);
  if (alreadyMinted) {
    throw new MintSignatureError(
      "This artwork has already been minted",
      "already_minted"
    );
  }

  const eligible = await checkOwnership(walletAddress, trimmedId);
  if (!eligible) {
    throw new MintSignatureError(
      "Wallet does not hold this Normie",
      "not_eligible"
    );
  }

  const client = getServerClient();
  const account = getMinterAccount(client);
  const contract = getNftContract(client);

  const artwork = await getArtwork(trimmedId);
  const mintDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const metadata = {
    name: artwork?.title?.trim() || `Machine Dreams — Normie #${trimmedId}`,
    description:
      artwork?.artistStatement?.trim() ||
      `Artwork claim for Normie #${trimmedId}`,
    image: artwork?.imageUrl || undefined,
    attributes: [
      { trait_type: "Normie Token ID", value: trimmedId },
      ...(artwork?.agentName
        ? [{ trait_type: "Agent", value: artwork.agentName }]
        : []),
      { trait_type: "Collection", value: "Machine Dreams" },
      { trait_type: "Mint Date", value: mintDate },
    ],
  };

  try {
    const signed = await generateMintSignature({
      account,
      contract,
      mintRequest: {
        to: walletAddress.trim(),
        metadata,
        uid: claimUidForNormie(trimmedId),
        price: "0",
      },
    });
    return serializeMintSignature(
      signed as { payload: Record<string, unknown>; signature: string }
    );
  } catch (err) {
    if (err instanceof MintSignatureError) throw err;
    const message =
      err instanceof Error ? err.message : "Failed to generate mint signature";
    // Defensive: contract-level uid reuse still surfaces as invalid signature
    if (/invalid signature/i.test(message)) {
      throw new MintSignatureError(
        "This artwork has already been minted",
        "already_minted"
      );
    }
    throw new MintSignatureError(message, "signature_failed");
  }
}
