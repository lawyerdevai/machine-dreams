import "server-only";

import { createThirdwebClient, readContract } from "thirdweb";
import { generateMintSignature } from "thirdweb/extensions/erc721";
import { privateKeyToAccount } from "thirdweb/wallets";
import { claimUidForNormie } from "@/lib/mint-uid";
import { getNftContract } from "@/lib/thirdweb-contract";

function getServerClient() {
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  if (!secretKey) {
    throw new Error("THIRDWEB_SECRET_KEY is not set");
  }
  return createThirdwebClient({ secretKey });
}

function getMinterAccount(client: ReturnType<typeof createThirdwebClient>) {
  const privateKey = process.env.MAINNET_MINTER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("MAINNET_MINTER_PRIVATE_KEY is not set");
  }
  return privateKeyToAccount({
    client,
    privateKey: privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
  });
}

/**
 * On-chain check: has this Normie's deterministic claim uid already been used?
 *
 * TokenERC721.verify() returns (false, signer) when the uid is consumed —
 * even with a cryptographically valid signature — which is why mintWithSignature
 * surfaces a misleading "invalid signature" on remint attempts.
 *
 * Uses a placeholder URI signature that is never returned to the client.
 */
export async function isNormieClaimAlreadyMinted(
  tokenId: string
): Promise<boolean> {
  const client = getServerClient();
  const account = getMinterAccount(client);
  const contract = getNftContract(client);
  const uid = claimUidForNormie(tokenId);

  const signed = await generateMintSignature({
    account,
    contract,
    mintRequest: {
      to: account.address,
      // string metadata skips IPFS upload — check-only, not returned to clients
      metadata: "ipfs://machine-dreams/already-minted-check",
      uid,
      price: "0",
    },
  });

  const p = signed.payload;
  const [success] = await readContract({
    contract,
    method:
      "function verify((address to,address royaltyRecipient,uint256 royaltyBps,address primarySaleRecipient,string uri,uint256 price,address currency,uint128 validityStartTimestamp,uint128 validityEndTimestamp,bytes32 uid) req, bytes signature) view returns (bool success, address signer)",
    params: [
      {
        to: p.to,
        royaltyRecipient: p.royaltyRecipient,
        royaltyBps: p.royaltyBps,
        primarySaleRecipient: p.primarySaleRecipient,
        uri: p.uri,
        price: p.price,
        currency: p.currency,
        validityStartTimestamp: p.validityStartTimestamp,
        validityEndTimestamp: p.validityEndTimestamp,
        uid: p.uid,
      },
      signed.signature,
    ],
  });

  // success === false with a known-good minter signature ⇒ uid already consumed
  return success === false;
}
