"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();
  const onGallery = pathname === "/gallery";

  if (pathname === "/") {
    return null;
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white">
      <Link
        href="/"
        className="nav-brand text-lg uppercase text-[#0a0a0a] hover:opacity-70 transition-opacity"
      >
        Machine Dreams
      </Link>
      {!onGallery && (
        <Link href="/gallery" className="btn-nav">
          Gallery
        </Link>
      )}
    </header>
  );
}
