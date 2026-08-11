/**
 * Ethereum mainnet deploy: thirdweb TokenERC721 (NFT Collection / ERC-721).
 *
 * ALWAYS runs a gas estimate first. Deploy only with an explicit flag after you confirm.
 *
 * Estimate only (default — safe, no deploy tx):
 *   npx tsx --env-file=.env.local scripts/deploy-nft-collection-mainnet.ts
 *
 * Deploy (REAL ETH — only after confirming the estimate):
 *   npx tsx --env-file=.env.local scripts/deploy-nft-collection-mainnet.ts --deploy
 *
 * Requires: THIRDWEB_SECRET_KEY, MAINNET_MINTER_PRIVATE_KEY
 */
import { createRequire } from "node:module";
import path from "node:path";
import {
  createThirdwebClient,
  estimateGasCost,
  getContract,
  readContract,
} from "thirdweb";
import { ethereum } from "thirdweb/chains";
import {
  deployViaAutoFactory,
  getOrDeployInfraForPublishedContract,
  prepareAutoFactoryDeployTransaction,
} from "thirdweb/deploys";
import { upload } from "thirdweb/storage";
import { getWalletBalance, privateKeyToAccount } from "thirdweb/wallets";

const require = createRequire(import.meta.url);
const thirdwebRoot = path.dirname(require.resolve("thirdweb/package.json"));

const { initialize: initTokenERC721 } = require(
  path.join(
    thirdwebRoot,
    "dist/esm/extensions/prebuilts/__generated__/TokenERC721/write/initialize.js"
  )
);
const { getDeployedCloneFactoryContract } = require(
  path.join(
    thirdwebRoot,
    "dist/esm/contract/deployment/utils/clone-factory.js"
  )
);
const { getDeployedInfraContract } = require(
  path.join(thirdwebRoot, "dist/esm/contract/deployment/utils/infra.js")
);

const ERC721_INTERFACE_ID = "0x80ac58cd";
const ERC1155_INTERFACE_ID = "0xd9b67a26";

const CONTRACT_PARAMS = {
  name: "Machine Dreams",
  symbol: "MDREAM",
  description: "Art by awakened Normies — Machine Dreams NFT Collection",
  royaltyBps: BigInt(500), // 5%
} as const;

function wantsDeploy() {
  return process.argv.includes("--deploy");
}

async function fetchEthUsd(): Promise<number | null> {
  try {
    const res = await fetch(
      "https://api.coinbase.com/v2/prices/ETH-USD/spot"
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { amount?: string } };
    const n = Number(data.data?.amount);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

async function buildInitializeTransaction(options: {
  client: ReturnType<typeof createThirdwebClient>;
  implementationContract: ReturnType<typeof getContract>;
  accountAddress: string;
}) {
  const { client, implementationContract, accountAddress } = options;
  const contractURI = await upload({
    client,
    files: [
      {
        name: CONTRACT_PARAMS.name,
        description: CONTRACT_PARAMS.description,
        symbol: CONTRACT_PARAMS.symbol,
        seller_fee_basis_points: Number(CONTRACT_PARAMS.royaltyBps),
        fee_recipient: accountAddress,
      },
    ],
  });

  return initTokenERC721({
    contract: implementationContract,
    contractURI: contractURI || "",
    defaultAdmin: accountAddress,
    name: CONTRACT_PARAMS.name,
    symbol: CONTRACT_PARAMS.symbol,
    platformFeeBps: 0n,
    platformFeeRecipient: accountAddress,
    royaltyBps: CONTRACT_PARAMS.royaltyBps,
    royaltyRecipient: accountAddress,
    saleRecipient: accountAddress,
    trustedForwarders: [],
  });
}

async function prepareMainnetProxyDeploy(options: {
  client: ReturnType<typeof createThirdwebClient>;
  account: ReturnType<typeof privateKeyToAccount>;
  /** If true, may deploy missing thirdweb infra (mainnet should already have it). */
  allowInfraDeploy: boolean;
}) {
  const { client, account, allowInfraDeploy } = options;
  const chain = ethereum;

  let cloneFactoryContract;
  let implementationContract;

  if (allowInfraDeploy) {
    ({ cloneFactoryContract, implementationContract } =
      await getOrDeployInfraForPublishedContract({
        account,
        chain,
        client,
        contractId: "TokenERC721",
      }));
  } else {
    cloneFactoryContract = await getDeployedCloneFactoryContract({
      chain,
      client,
    });
    implementationContract = await getDeployedInfraContract({
      chain,
      client,
      contractId: "TokenERC721",
    });
    if (!cloneFactoryContract || !implementationContract) {
      throw new Error(
        "thirdweb TokenERC721 infra not found on Ethereum mainnet. " +
          "Refusing to estimate/deploy further (would require infra deploys). " +
          "Investigate before proceeding."
      );
    }
  }

  const initializeTransaction = await buildInitializeTransaction({
    client,
    implementationContract,
    accountAddress: account.address,
  });

  const transaction = prepareAutoFactoryDeployTransaction({
    chain,
    client,
    cloneFactoryContract,
    initializeTransaction,
  });

  return {
    cloneFactoryContract,
    implementationContract,
    initializeTransaction,
    transaction,
  };
}

async function verifyErc721(
  client: ReturnType<typeof createThirdwebClient>,
  contractAddress: string
) {
  const contract = getContract({
    client,
    chain: ethereum,
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
}

async function main() {
  const secretKey = process.env.THIRDWEB_SECRET_KEY;
  const privateKey = process.env.MAINNET_MINTER_PRIVATE_KEY;
  const doDeploy = wantsDeploy();

  if (!secretKey) {
    throw new Error("THIRDWEB_SECRET_KEY is not set");
  }
  if (!privateKey) {
    throw new Error("MAINNET_MINTER_PRIVATE_KEY is not set");
  }

  const client = createThirdwebClient({ secretKey });
  const account = privateKeyToAccount({
    client,
    privateKey: privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`,
  });

  console.log("Deployer / primary sale / royalty recipient:", account.address);
  console.log("Chain: Ethereum mainnet (1)");
  console.log("Type: TokenERC721 (NFT Collection)");
  console.log("Name / Symbol:", CONTRACT_PARAMS.name, "/", CONTRACT_PARAMS.symbol);
  console.log("Royalty:", "500 bps (5%)");
  console.log("Mode:", doDeploy ? "DEPLOY (real ETH)" : "ESTIMATE ONLY");
  console.log("");

  const balance = await getWalletBalance({
    client,
    chain: ethereum,
    address: account.address,
  });
  console.log(
    "Wallet balance:",
    balance.displayValue,
    balance.symbol
  );

  console.log("\nPreparing proxy deploy transaction (no broadcast yet)…");
  const prepared = await prepareMainnetProxyDeploy({
    client,
    account,
    allowInfraDeploy: false,
  });
  console.log("Clone factory:", prepared.cloneFactoryContract.address);
  console.log("TokenERC721 implementation:", prepared.implementationContract.address);

  const gasCost = await estimateGasCost({
    transaction: prepared.transaction,
    account,
  });
  const ethUsd = await fetchEthUsd();
  const ethNum = Number(gasCost.ether);
  const usd =
    ethUsd != null && Number.isFinite(ethNum)
      ? ethNum * ethUsd
      : null;

  console.log("\n========================================");
  console.log("GAS ESTIMATE (proxy deploy only)");
  console.log("========================================");
  console.log("Estimated gas cost:", gasCost.ether, "ETH");
  console.log("Estimated gas cost (wei):", gasCost.wei.toString());
  if (usd != null && ethUsd != null) {
    console.log(
      `Approximate USD: ~$${usd.toFixed(2)} (ETH @ $${ethUsd.toFixed(2)})`
    );
  } else {
    console.log("Approximate USD: (could not fetch ETH-USD spot)");
  }
  console.log(
    "Note: estimate covers the TokenERC721 proxy deploy via TWCloneFactory."
  );
  console.log(
    "thirdweb infra already present on mainnet — not included in this estimate."
  );
  console.log("========================================\n");

  if (!doDeploy) {
    console.log(
      "Stopped before deploy. To execute after you confirm the cost, re-run with --deploy:"
    );
    console.log(
      "  npx tsx --env-file=.env.local scripts/deploy-nft-collection-mainnet.ts --deploy"
    );
    return;
  }

  console.log("Broadcasting deploy transaction (REAL ETH)…");
  const contractAddress = await deployViaAutoFactory({
    account,
    chain: ethereum,
    client,
    cloneFactoryContract: prepared.cloneFactoryContract,
    initializeTransaction: prepared.initializeTransaction,
  });

  console.log("Deployed address (unverified):", contractAddress);
  await verifyErc721(client, contractAddress);

  console.log("\n========================================");
  console.log("SUCCESS — verified ERC-721 NFT Collection (mainnet)");
  console.log("CONTRACT ADDRESS:", contractAddress);
  console.log("========================================\n");
  console.log(
    "Next: set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=" + contractAddress
  );
  console.log(
    "and point mint signing at MAINNET_MINTER_PRIVATE_KEY / Ethereum mainnet."
  );
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
