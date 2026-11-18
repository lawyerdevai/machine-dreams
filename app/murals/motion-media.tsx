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

type Playback = {
  playing: boolean;
  hasMotion: boolean;
  toggle: (e?: ReactMouseEvent | ReactKeyboardEvent) => void;
  onVideoError: () => void;
};

/** Shared play/stop state for muted looping motion (never autoplays). */
export function useMotionPlayback(
  motion: MuralMotion | undefined,
  imageUrl: string
): Playback {
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const hasMotion = Boolean(motion?.url) && !failed;

  useEffect(() => {
    setPlaying(false);
    setFailed(false);
  }, [motion?.url, imageUrl]);

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

  return { playing, hasMotion, toggle, onVideoError };
}

type MediaProps = {
  imageUrl: string;
  alt: string;
  motion?: MuralMotion;
  sizes: string;
  priority?: boolean;
  onOpenLightbox?: () => void;
  openLabel?: string;
  variant?: "frame" | "lightbox";
  playing: boolean;
  hasMotion: boolean;
  onVideoError: () => void;
};

/**
 * Still image by default; optional muted looping video in place.
 * Toggle lives outside this component so nothing overlays the artwork.
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
  playing,
  hasMotion,
  onVideoError,
}: MediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const labelId = useId();

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (playing && hasMotion) {
      el.muted = true;
      const p = el.play();
      if (p && typeof p.catch === "function") {
        void p.catch(() => {
          onVideoError();
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
  }, [playing, hasMotion, onVideoError]);

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
      className={`murals-motion murals-motion--${variant}${playing && hasMotion ? " is-playing" : ""}`}
    >
      {playing && hasMotion && motion?.url ? (
        <video
          ref={videoRef}
          className="murals-motion__video"
          src={motion.url}
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
      <span id={labelId} className="sr-only">
        {alt}
      </span>
    </div>
  );
}

/** Quiet text control under captions / in the lightbox bar. */
export function MotionLoopToggle({
  playing,
  hasMotion,
  onToggle,
  className = "",
}: {
  playing: boolean;
  hasMotion: boolean;
  onToggle: (e?: ReactMouseEvent | ReactKeyboardEvent) => void;
  className?: string;
}) {
  if (!hasMotion) return null;
  return (
    <button
      type="button"
      className={`murals-motion__loop-toggle ${className}`.trim()}
      aria-pressed={playing}
      aria-label={playing ? "Stop animation" : "Play animation"}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onToggle(e);
        }
      }}
    >
      {playing ? "Stop loop" : "Play loop"}
    </button>
  );
}

