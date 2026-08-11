import { createThirdwebClient } from "thirdweb";
import { ethereum } from "thirdweb/chains";

/**
 * Browser-safe thirdweb client for Machine Dreams wallet UI.
 * Uses NEXT_PUBLIC_THIRDWEB_CLIENT_ID only — never import secret keys here.
 */
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID;

if (!clientId) {
  console.warn(
    "[thirdweb] NEXT_PUBLIC_THIRDWEB_CLIENT_ID is missing — wallet connect will not work."
  );
}

export const thirdwebClient = createThirdwebClient({
  clientId: clientId ?? "",
});

/**
 * Sole chain for wallet-connect + mint.
 * Ethereum mainnet (1).
 */
export const machineDreamsChain = ethereum;
