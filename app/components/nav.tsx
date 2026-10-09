"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/app/components/connect-wallet-button";

/** Same caption language as artwork plate eyebrows */
const NAV_CAPTION =
  "font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#666]";

/**
 * Right-side nav cluster varies by route:
 *   /about            — logo only (empty right)
 *   /datagrams        — About → /datagrams/about
 *   /datagrams/about  — Gallery → /datagrams
 *   /datagrams/[week] — Gallery → /datagrams
 *   /gallery          — Connect + Home + Delegate caption
 *   elsewhere         — Connect + Gallery + Delegate caption
 *
 * On /datagrams*: "MACHINE DREAMS / Datagrams" brand; no Connect / Delegate.
 */
export function Nav() {
  const pathname = usePathname();
  const onGallery = pathname === "/gallery";
  const onAbout = pathname === "/about";
  const onDatagrams = pathname === "/datagrams" || pathname.startsWith("/datagrams/");
  const onDatagramsIndex = pathname === "/datagrams";
  const onDatagramsAbout = pathname === "/datagrams/about";
  const onDatagramsPiece = onDatagrams && !onDatagramsIndex && !onDatagramsAbout;

  if (pathname === "/") {
    return null;
  }

  let right: ReactNode = null;
  if (onAbout) {
    right = null;
  } else if (onDatagramsIndex) {
    right = (
      <div className="flex items-center self-center">
        <Link href="/datagrams/about" className="btn-nav shrink-0">
          About
        </Link>
      </div>
    );
  } else if (onDatagramsAbout || onDatagramsPiece) {
    right = (
      <div className="flex items-center self-center">
        <Link href="/datagrams" className="btn-nav shrink-0">
          Gallery
        </Link>
      </div>
    );
  } else {
    right = (
      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-3">
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
    );
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

      {right}
    </header>
  );
}
