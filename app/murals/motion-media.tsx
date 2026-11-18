"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { MuralMotion } from "@/lib/murals/types";
import { MuralFrame } from "./mural-frame";

type Props = {
  imageUrl: string;
  alt: string;
  motion?: MuralMotion;
  sizes: string;
  priority?: boolean;
  /** When set, still image click opens lightbox (room). */
  onOpenLightbox?: () => void;
  openLabel?: string;
  /** Fill the lightbox stage instead of the hanging frame. */
  variant?: "frame" | "lightbox";
};

/**
 * Still image by default. Optional motion toggle plays muted looping video
 * in place. Never autoplays (including under prefers-reduced-motion).
 */
export function MotionMedia({
  imageUrl,
  alt,
  motion,
  sizes,
  priority = false,
  onOpenLightbox,
  openLabel,
  variant = "frame",
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const labelId = useId();

  const hasMotion = Boolean(motion?.url) && !failed;

  useEffect(() => {
    setPlaying(false);
    setFailed(false);
  }, [motion?.url, imageUrl]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) {
      el.muted = true;
      const p = el.play();
      if (p && typeof p.catch === "function") {
        void p.catch(() => {
          setFailed(true);
          setPlaying(false);
        });
      }
    } else {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        /* ignore */
      }
    }
  }, [playing]);

  const toggle = useCallback(
    (e?: ReactMouseEvent | ReactKeyboardEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      if (!hasMotion) return;
      setPlaying((prev) => !prev);
    },
    [hasMotion]
  );

  const onVideoError = useCallback(() => {
    setFailed(true);
    setPlaying(false);
  }, []);

  const frameStill = (
    <MuralFrame
      imageUrl={imageUrl}
      alt={alt}
      sizes={sizes}
      priority={priority}
    />
  );

  const lightboxStill = (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      sizes="100vw"
      quality={90}
      priority
      className="object-contain"
      draggable={false}
    />
  );

  const still = variant === "lightbox" ? lightboxStill : frameStill;

  return (
    <div
      className={`murals-motion murals-motion--${variant}${playing ? " is-playing" : ""}`}
    >
      {playing && hasMotion ? (
        <video
          ref={videoRef}
          className="murals-motion__video"
          src={motion!.url}
          poster={imageUrl}
          muted
          loop
          playsInline
          preload="none"
          aria-labelledby={labelId}
          onError={onVideoError}
        />
      ) : onOpenLightbox ? (
        <button
          type="button"
          className="murals-room__open murals-motion__open"
          onClick={onOpenLightbox}
          aria-label={openLabel ?? `View ${alt} full screen`}
        >
          {still}
        </button>
      ) : (
        <div className="murals-motion__still">{still}</div>
      )}

      {hasMotion ? (
        <button
          type="button"
          className="murals-motion__toggle"
          aria-pressed={playing}
          aria-label={playing ? "Stop animation" : "Play animation"}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              toggle(e);
            }
          }}
        >
          <span className="murals-motion__icon" aria-hidden="true">
            {playing ? (
              <span className="murals-motion__icon-stop" />
            ) : (
              <span className="murals-motion__icon-play" />
            )}
          </span>
        </button>
      ) : null}
      <span id={labelId} className="sr-only">
        {alt}
      </span>
    </div>
  );
}

/** Tiny decorative mark for gallery tiles that have motion (no video load). */
export function MotionMark() {
  return (
    <span
      className="murals-motion-mark"
      aria-hidden="true"
      title="Has animation"
    >
      <span className="murals-motion-mark__play" />
    </span>
  );
}
