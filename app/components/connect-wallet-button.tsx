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

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * Wallet control only (no caption) — layout/caption owned by Nav so
 * Connect / Gallery stay fixed while the delegate note sits below.
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
      <div className="flex items-center justify-end gap-2">
        <span
          className="font-mono text-xs uppercase tracking-[0.05em] text-[#666] tabular-nums"
          title={account.address}
        >
          {shortAddress(account.address)}
        </span>
        <button type="button" onClick={handleDisconnect} className="btn-nav">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={busy}
      className="btn-nav disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? "Connecting…" : "Connect"}
    </button>
  );
}
