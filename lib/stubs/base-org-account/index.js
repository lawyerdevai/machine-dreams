/**
 * Local stub replacing @base-org/account.
 * Machine Dreams does not use Base Account; this keeps Next from bundling
 * @coinbase/cdp-sdk → @x402/* through thirdweb's createWallet import graph.
 */
export function createBaseAccountSDK() {
  throw new Error(
    "Base Account is disabled in Machine Dreams. Use MetaMask, Coinbase Wallet, or WalletConnect."
  );
}

export default { createBaseAccountSDK };
