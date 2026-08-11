/**
 * One-time Sepolia deploy: thirdweb TokenERC721 (NFT Collection / ERC-721).
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/deploy-nft-collection.ts
 *
 * Requires: THIRDWEB_SECRET_KEY, NFT_MINTER_PRIVATE_KEY
 * Optional: NEXT_PUBLIC_THIRDWEB_CLIENT_ID (fallback client auth)
 */
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { sepolia } from "thirdweb/chains";
import { deployERC721Contract } from "thirdweb/deploys";
import { privateKeyToAccount } from "thirdweb/wallets";

const ERC721_INTERFACE_ID = "0x80ac58cd";
const ERC1155_INTERFACE_ID = "0xd9b67a26";

async function main() {
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  const privateKey = process.env.NFT_MINTER_PRIVATE_KEY;

  if (!secretKey) {
    throw new Error("THIRDWEB_SECRET_KEY is not set");
  }
  if (!privateKey) {
    throw new Error("NFT_MINTER_PRIVATE_KEY is not set");
  }

  const client = createThirdwebClient({ secretKey });
  const account = privateKeyToAccount({
    client,
    privateKey: privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
  });

  console.log("Deployer / default admin:", account.address);
  console.log("Chain: Sepolia (11155111)");
  console.log("Type: TokenERC721 (NFT Collection)");

  const contractAddress = await deployERC721Contract({
    client,
    chain: sepolia,
    account,
    type: "TokenERC721",
    params: {
      name: "Machine Dreams",
      symbol: "MDREAM",
      description: "Art by awakened Normies — Machine Dreams NFT Collection",
      defaultAdmin: account.address,
      saleRecipient: account.address,
      royaltyRecipient: account.address,
      royaltyBps: BigInt(0),
    },
  });

  console.log("Deployed address (unverified):", contractAddress);

  const contract = getContract({
    client,
    chain: sepolia,
    address: contractAddress,
  });

  const supportsInterface =
    "function supportsInterface(bytes4 interfaceId) view returns (bool)";

  const supportsERC721 = await readContract({
    contract,
    method: supportsInterface,
    params: [ERC721_INTERFACE_ID],
  });
  const supportsERC1155 = await readContract({
    contract,
    method: supportsInterface,
    params: [ERC1155_INTERFACE_ID],
  });

  let contractType = "(n/a)";
  try {
    const ct = await readContract({
      contract,
      method: "function contractType() view returns (bytes32)",
      params: [],
    });
    contractType = Buffer.from(ct.slice(2), "hex")
      .toString("utf8")
      .replace(/\0+$/, "");
  } catch {
    // optional
  }

  console.log("supportsInterface(ERC-721 0x80ac58cd):", supportsERC721);
  console.log("supportsInterface(ERC-1155 0xd9b67a26):", supportsERC1155);
  console.log("contractType():", contractType);

  if (!supportsERC721) {
    throw new Error(
      `Deployed contract ${contractAddress} is NOT ERC-721 (supportsInterface failed). Aborting.`
    );
  }
  if (supportsERC1155) {
    throw new Error(
      `Deployed contract ${contractAddress} unexpectedly reports ERC-1155 support.`
    );
  }

  console.log("\n========================================");
  console.log("SUCCESS — verified ERC-721 NFT Collection");
  console.log("CONTRACT ADDRESS:", contractAddress);
  console.log("========================================\n");
  console.log(
    "Next: set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=" + contractAddress
  );
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
