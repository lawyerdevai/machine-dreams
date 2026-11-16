"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { PublicMural } from "./public-types";
import { MuralFrame, muralAlt } from "./mural-frame";
import { WallLabel } from "./wall-label";

type Props = {
  item: PublicMural;
  newerId: string | null;
  olderId: string | null;
  galleryHref: string;
};

export function ViewingRoomClient({
  item,
  newerId,
  olderId,
  galleryHref,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === "ArrowLeft" && newerId) {
        e.preventDefault();
        router.push(`/murals/${newerId}`);
      } else if (e.key === "ArrowRight" && olderId) {
        e.preventDefault();
        router.push(`/murals/${olderId}`);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newerId, olderId, router]);

  // Site header Gallery lives outside app/murals; point it at the matching tab.
  useEffect(() => {
    try {
      const tab = galleryHref.includes("moments") ? "moments" : "seasons";
      sessionStorage.setItem("arena-murals-tab", tab);
    } catch {
      /* ignore */
    }
    const header = document.querySelector("header");
    if (!header) return;
    const links = header.querySelectorAll("a");
    const patched: HTMLAnchorElement[] = [];
    for (const link of links) {
      if (link.textContent?.trim() !== "Gallery") continue;
      const href = link.getAttribute("href");
      if (!href || !href.startsWith("/murals")) continue;
      link.setAttribute("href", galleryHref);
      patched.push(link);
    }
    return () => {
      for (const link of patched) {
        link.setAttribute("href", "/murals");
      }
    };
  }, [galleryHref]);

  return (
    <div className="murals-room">
      <div className="murals-room__nav">
        <button
          type="button"
          disabled={!newerId}
          onClick={() => newerId && router.push(`/murals/${newerId}`)}
        >
          ← Previous
        </button>
        <button
          type="button"
          disabled={!olderId}
          onClick={() => olderId && router.push(`/murals/${olderId}`)}
        >
          Next →
        </button>
      </div>

      <div className="murals-room__work">
        <div className="murals-hang">
          <div className="murals-hang__spot" aria-hidden="true" />
          <div className="murals-hang__body">
            <div className="murals-hang__shadow w-full">
              <MuralFrame
                imageUrl={item.imageUrl}
                alt={muralAlt(item.title, item.caption)}
                sizes="(max-width: 768px) 92vw, 52rem"
                priority
              />
            </div>
            <WallLabel
              title={item.title}
              caption={item.caption}
              kind={item.kind}
              seasonNumber={item.seasonNumber}
              day={item.day}
              titleAs="h1"
              align="left"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
