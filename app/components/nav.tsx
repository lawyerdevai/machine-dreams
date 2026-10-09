"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/app/components/connect-wallet-button";

/** Same caption language as artwork plate eyebrows */
const NAV_CAPTION =
  "font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#666]";

/**
 * Right-side nav cluster:
 *   [ wallet control ][ Gallery/Home ]  ← fixed button row, right-aligned
 *   Using a hot wallet? Delegate.xyz…  ← caption under the row, right-aligned
 *
 * Wallet control sits in a reserved min-width slot so Connect ↔ Disconnect
 * does not shift Gallery. Caption is outside the button row so it never
 * pushes buttons.
 *
 * On /datagrams*: section brand, no Connect / Delegate caption; Gallery only
 * on piece pages and links back to the Datagrams index.
 */
export function Nav() {
  const pathname = usePathname();
  const onGallery = pathname === "/gallery";
  const onDatagrams = pathname === "/datagrams" || pathname.startsWith("/datagrams/");
  const onDatagramsIndex = pathname === "/datagrams";
  const onDatagramsPiece = onDatagrams && !onDatagramsIndex;

  if (pathname === "/") {
    return null;
  }

  return (
    <header
      className={`flex items-start px-6 bg-white ${
        onGallery ? "justify-end py-2" : "justify-between py-4"
      }`}
    >
      {!onGallery && (
        <div className="flex min-w-0 items-baseline gap-2 self-center">
          <Link
            href="/"
            className="nav-brand shrink-0 text-lg uppercase text-[#0a0a0a] hover:opacity-70 transition-opacity"
          >
            Machine Dreams
          </Link>
          {onDatagrams && (
            <span className="font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#999] whitespace-nowrap">
              <span aria-hidden="true">/ </span>
              <Link href="/datagrams" className="hover:opacity-70 transition-opacity">
                Datagrams
              </Link>
            </span>
          )}
        </div>
      )}

      {onDatagrams ? (
        onDatagramsPiece ? (
          <div className="flex items-center self-center">
            <Link href="/datagrams" className="btn-nav shrink-0">
              Gallery
            </Link>
          </div>
        ) : null
      ) : (
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            {/* Reserved width keeps Gallery pinned when wallet state changes */}
            <div className="flex min-w-[15.5rem] items-center justify-end">
              <ConnectWalletButton />
            </div>
            {onGallery ? (
              <Link href="/" className="btn-nav shrink-0">
                Home
              </Link>
            ) : (
              <Link href="/gallery" className="btn-nav shrink-0">
                Gallery
              </Link>
            )}
          </div>
          <p className={`${NAV_CAPTION} text-right`}>
            Using a hot wallet? Delegate.xyz is supported
          </p>
        </div>
      )}
    </header>
  );
}
