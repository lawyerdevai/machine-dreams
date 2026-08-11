"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/app/components/connect-wallet-button";

export function Nav() {
  const pathname = usePathname();
  const onGallery = pathname === "/gallery";
  if (pathname === "/") {
    return null;
  }

  return (
    <header
      className={`flex items-center px-6 bg-white ${
        onGallery ? "justify-end py-2" : "justify-between py-4"
      }`}
    >
      {!onGallery && (
        <Link
          href="/"
          className="nav-brand text-lg uppercase text-[#0a0a0a] hover:opacity-70 transition-opacity"
        >
          Machine Dreams
        </Link>
      )}
      <div className="flex items-center gap-3">
        {/* Wallet connect — remove ConnectWalletButton import to drop */}
        <ConnectWalletButton />
        {onGallery ? (
          <Link href="/" className="btn-nav">
            Home
          </Link>
        ) : (
          <Link href="/gallery" className="btn-nav">
            Gallery
          </Link>
        )}
      </div>
    </header>
  );
}
