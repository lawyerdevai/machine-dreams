"use client";

import { useState } from "react";
import {
  useActiveAccount,
  useActiveWallet,
  useConnectModal,
  useDisconnect,
} from "thirdweb/react";
import {
  machineDreamsChain,
  thirdwebClient,
} from "@/lib/thirdweb-client";
import {
  machineDreamsConnectTheme,
  machineDreamsWallets,
} from "@/app/components/wallet-connect-config";

/** Match btn-nav / Connect styling used elsewhere in the nav */
const BTN =
  "font-mono text-sm uppercase tracking-wider border border-[#0a0a0a] bg-transparent text-[#0a0a0a] px-4 py-2 min-h-9 transition-opacity hover:opacity-70 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a] disabled:cursor-not-allowed disabled:opacity-40";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Custom wallet control — avoids thirdweb ConnectButton's details modal
 * (known nested <button> / CopyIcon hydration warning in v5.120.1).
 * Connect uses the same modal + wallets as artwork mint.
 */
export function ConnectWalletButton() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();
  const { connect } = useConnectModal();
  const { disconnect } = useDisconnect();
  const [busy, setBusy] = useState(false);

  async function handleConnect() {
    if (busy) return;
    setBusy(true);
    try {
      await connect({
        client: thirdwebClient,
        chain: machineDreamsChain,
        chains: [machineDreamsChain],
        wallets: machineDreamsWallets,
        showAllWallets: false,
        theme: machineDreamsConnectTheme,
        size: "compact",
        title: "Connect wallet",
        titleIcon: "",
        showThirdwebBranding: false,
        appMetadata: {
          name: "Machine Dreams",
          description: "Art by awakened Normies",
        },
      });
    } catch {
      // User dismissed modal
    } finally {
      setBusy(false);
    }
  }

  function handleDisconnect() {
    if (!wallet) return;
    disconnect(wallet);
  }

  if (account?.address) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <span
            className="font-mono text-sm uppercase tracking-wider text-[#666] tabular-nums"
            title={account.address}
          >
            {shortAddress(account.address)}
          </span>
          <button type="button" onClick={handleDisconnect} className={BTN}>
            Disconnect
          </button>
        </div>
        <p className="font-mono text-[0.625rem] tracking-wide text-[#999]">
          Using a hot wallet? Delegate.xyz is supported
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleConnect}
        disabled={busy}
        className={BTN}
      >
        {busy ? "Connecting…" : "Connect"}
      </button>
      <p className="font-mono text-[0.625rem] tracking-wide text-[#999]">
        Using a hot wallet? Delegate.xyz is supported
      </p>
    </div>
  );
}
