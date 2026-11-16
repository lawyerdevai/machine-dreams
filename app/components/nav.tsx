"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectWalletButton } from "@/app/components/connect-wallet-button";

/** Same caption language as artwork plate eyebrows */
const NAV_CAPTION =
  "font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#666]";

/**
 * Right-side nav cluster:
 *   /murals, /murals/[id] — Murals link; no Connect / Delegate
 *   /gallery              — Connect + Home + Delegate caption
 *   elsewhere             — Connect + Gallery + Delegate caption
 *
 * On public /murals*: dark museum bar; Machine Dreams + Murals.
 */
export function Nav() {
  const pathname = usePathname();
  const onGallery = pathname === "/gallery";
  const onMuralsPublic =
    pathname === "/murals" ||
    (pathname.startsWith("/murals/") &&
      !pathname.startsWith("/murals/admin") &&
      !pathname.startsWith("/murals/lab"));
  const onMuralsRoom = onMuralsPublic && pathname !== "/murals";

  if (pathname === "/") {
    return null;
  }

  let right: ReactNode = null;
  if (onMuralsRoom) {
    right = (
      <div className="flex items-center self-center">
        <Link
          href="/murals"
          className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-[#9a9286] hover:text-[#e8e2d6] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7ec8e3]"
        >
          Gallery
        </Link>
      </div>
    );
  } else if (onMuralsPublic) {
    right = null;
  } else {
    right = (
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
    );
  }

  return (
    <header
      className={`flex items-start px-6 ${
        onMuralsPublic ? "bg-[#141210]" : "bg-white"
      } ${onGallery ? "justify-end py-2" : "justify-between py-4"}`}
    >
      {!onGallery && (
        <div className="flex min-w-0 items-baseline gap-2 self-center">
          <Link
            href="/"
            className={`nav-brand shrink-0 text-lg uppercase hover:opacity-70 transition-opacity ${
              onMuralsPublic ? "text-[#e8e2d6]" : "text-[#0a0a0a]"
            }`}
          >
            Machine Dreams
          </Link>
          {onMuralsPublic && (
            <span className="font-serif text-[0.6875rem] uppercase tracking-[0.14em] text-[#6a645c] whitespace-nowrap">
              <span aria-hidden="true">/ </span>
              <Link
                href="/murals"
                className="hover:opacity-70 transition-opacity text-[#9a9286]"
              >
                Murals
              </Link>
            </span>
          )}
        </div>
      )}

      {right}
    </header>
  );
}
