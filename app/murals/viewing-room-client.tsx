"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import type { PublicMural } from "./public-types";
import { MuralFrame, muralAlt } from "./mural-frame";
import { WallLabel, publicKindLabel } from "./wall-label";

type Props = {
  item: PublicMural;
  newerId: string | null;
  olderId: string | null;
  galleryHref: string;
};

const LIGHTBOX_PARAM = "lightbox";
const emptySubscribe = () => () => {};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function ViewingRoomClient({
  item,
  newerId,
  olderId,
  galleryHref,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const lightboxTitleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const canPortal = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const lightboxOpen = searchParams.get(LIGHTBOX_PARAM) === "1";
  const [browserFullscreen, setBrowserFullscreen] = useState(false);

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

  const roomPath = useCallback(
    (id: string, lightbox: boolean) =>
      lightbox ? `/murals/${id}?${LIGHTBOX_PARAM}=1` : `/murals/${id}`,
    []
  );

  const openLightbox = useCallback(() => {
    router.replace(roomPath(item.id, true), { scroll: false });
  }, [item.id, roomPath, router]);

  const closeLightbox = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    router.replace(roomPath(item.id, false), { scroll: false });
  }, [item.id, roomPath, router]);

  const goPrev = useCallback(() => {
    if (!newerId) return;
    router.push(roomPath(newerId, lightboxOpen), { scroll: false });
  }, [lightboxOpen, newerId, roomPath, router]);

  const goNext = useCallback(() => {
    if (!olderId) return;
    router.push(roomPath(olderId, lightboxOpen), { scroll: false });
  }, [lightboxOpen, olderId, roomPath, router]);

  const toggleBrowserFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* ignore — browser may deny */
    }
  }, []);

  useEffect(() => {
    const onFs = () => setBrowserFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    onFs();
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) {
      document.body.style.paddingRight = `${scrollbar}px`;
    }
    closeBtnRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [lightboxOpen]);

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (isTypingTarget(e.target)) return;

    if (e.key === "Escape" && lightboxOpen) {
      e.preventDefault();
      closeLightbox();
      return;
    }

    if ((e.key === "f" || e.key === "F") && lightboxOpen && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      void toggleBrowserFullscreen();
      return;
    }

    if (e.key === "ArrowLeft") {
      if (!newerId) return;
      e.preventDefault();
      goPrev();
      return;
    }
    if (e.key === "ArrowRight") {
      if (!olderId) return;
      e.preventDefault();
      goNext();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const dayOrSeason = publicKindLabel(item.kind, item.seasonNumber, item.day);
  const alt = muralAlt(item.title, item.caption);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = e.changedTouches[0]?.clientX;
    if (end == null) return;
    const delta = end - start;
    if (Math.abs(delta) < 56) return;
    if (delta > 0) goPrev();
    else goNext();
  };

  const lightbox =
    canPortal && lightboxOpen
      ? createPortal(
          <div
            className="murals-lightbox"
            role="dialog"
            aria-modal="true"
            aria-labelledby={lightboxTitleId}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="murals-lightbox__stage">
              <button
                type="button"
                className="murals-lightbox__nav murals-lightbox__nav--prev"
                disabled={!newerId}
                aria-label="Previous mural"
                onClick={goPrev}
              >
                ←
              </button>
              <div className="murals-lightbox__image">
                <Image
                  src={item.imageUrl}
                  alt={alt}
                  fill
                  sizes="100vw"
                  quality={90}
                  priority
                  className="object-contain"
                  draggable={false}
                />
              </div>
              <button
                type="button"
                className="murals-lightbox__nav murals-lightbox__nav--next"
                disabled={!olderId}
                aria-label="Next mural"
                onClick={goNext}
              >
                →
              </button>
            </div>

            <div className="murals-lightbox__bar">
              <div className="murals-lightbox__caption">
                <p id={lightboxTitleId} className="murals-lightbox__title">
                  {item.title}
                </p>
                {dayOrSeason ? (
                  <p className="murals-lightbox__meta">{dayOrSeason}</p>
                ) : null}
              </div>
              <div className="murals-lightbox__actions">
                <button
                  type="button"
                  className="murals-lightbox__action"
                  onClick={() => void toggleBrowserFullscreen()}
                  aria-pressed={browserFullscreen}
                >
                  {browserFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  <span className="murals-lightbox__kbd">F</span>
                </button>
                <button
                  ref={closeBtnRef}
                  type="button"
                  className="murals-lightbox__action murals-lightbox__action--close"
                  onClick={closeLightbox}
                >
                  Close
                  <span className="murals-lightbox__kbd">Esc</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="murals-room">
      <div className="murals-room__nav">
        <button
          type="button"
          disabled={!newerId}
          onClick={goPrev}
        >
          ← Previous
        </button>
        <button
          type="button"
          disabled={!olderId}
          onClick={goNext}
        >
          Next →
        </button>
      </div>

      <div className="murals-room__work">
        <div className="murals-hang murals-room__hang">
          <div className="murals-hang__spot" aria-hidden="true" />
          <div className="murals-hang__body">
            <button
              type="button"
              className="murals-room__open"
              onClick={openLightbox}
              aria-label={`View ${item.title} full screen`}
            >
              <div className="murals-hang__shadow w-full">
                <MuralFrame
                  imageUrl={item.imageUrl}
                  alt={alt}
                  sizes="(max-width: 768px) 96vw, min(96vw, 56rem)"
                  priority
                />
              </div>
            </button>
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
      {lightbox}
    </div>
  );
}
