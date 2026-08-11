"use client";

import type { CSSProperties } from "react";
import { lightTheme } from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";

/**
 * Shared mainnet wallet list + Connect UI theme.
 * Used by nav ConnectWalletButton and artwork-page mint connect modal.
 */
export const machineDreamsWallets = [
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet", {
    walletConfig: { options: "eoaOnly" },
  }),
  createWallet("io.rabby"),
  createWallet("com.trustwallet.app"),
  createWallet("me.rainbow"),
  createWallet("walletConnect"),
];

export const machineDreamsConnectTheme = lightTheme({
  colors: {
    primaryText: "#0a0a0a",
    secondaryText: "#666666",
    accentText: "#0a0a0a",
    accentButtonBg: "#0a0a0a",
    accentButtonText: "#ffffff",
    primaryButtonBg: "#0a0a0a",
    primaryButtonText: "#ffffff",
    secondaryButtonBg: "#ffffff",
    secondaryButtonText: "#0a0a0a",
    secondaryButtonHoverBg: "#f5f5f5",
    modalBg: "#ffffff",
    modalOverlayBg: "rgba(10, 10, 10, 0.55)",
    borderColor: "#0a0a0a",
    separatorLine: "#e5e5e5",
    tertiaryBg: "#f7f7f5",
    connectedButtonBg: "#ffffff",
    connectedButtonBgHover: "#f5f5f5",
    skeletonBg: "#e8e8e8",
    tooltipBg: "#0a0a0a",
    tooltipText: "#ffffff",
  },
  fontFamily: "var(--font-space-mono), ui-monospace, monospace",
});

export const machineDreamsConnectButtonStyle: CSSProperties = {
  fontFamily: "var(--font-space-mono), ui-monospace, monospace",
  fontSize: "0.875rem",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  borderRadius: 0,
  border: "1px solid #0a0a0a",
  backgroundColor: "transparent",
  color: "#0a0a0a",
  minHeight: "2.25rem",
  padding: "0.5rem 1rem",
  height: "auto",
};
