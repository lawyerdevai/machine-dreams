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

const VIDEO_FADE_MS = 150;

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
  loading?: "lazy" | "eager";
  quality?: number;
  onOpenLightbox?: () => void;
  openLabel?: string;
  variant?: "frame" | "lightbox";
  playing: boolean;
  hasMotion: boolean;
  onVideoError: () => void;
};

/**
 * Still always mounted (layout owner). Video mounts only while playing, as an
 * absolute overlay that fades in after the first frame — pixel-seamless.
 */
export function MotionMedia({
  imageUrl,
  alt,
  motion,
  sizes,
  priority = false,
  loading,
  quality,
  onOpenLightbox,
  openLabel,
  variant = "frame",
  playing,
  hasMotion,
  onVideoError,
}: MediaProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const labelId = useId();
  const [videoReady, setVideoReady] = useState(false);
  const [videoMounted, setVideoMounted] = useState(false);
  const shouldPlay = Boolean(playing && hasMotion && motion?.url);
  // Sync mount/ready when play intent flips (avoid stale ready flash).
  const [playEpoch, setPlayEpoch] = useState(shouldPlay);
  if (shouldPlay !== playEpoch) {
    setPlayEpoch(shouldPlay);
    if (shouldPlay) {
      setVideoReady(false);
      setVideoMounted(true);
    } else {
      setVideoReady(false);
    }
  }
  const showOverlay = shouldPlay && videoReady;

  // After stop fade-out, unmount the video — still stays mounted.
  useEffect(() => {
    if (shouldPlay || !videoMounted) return;
    const t = window.setTimeout(() => setVideoMounted(false), VIDEO_FADE_MS);
    return () => window.clearTimeout(t);
  }, [shouldPlay, videoMounted]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !shouldPlay || !motion?.url) return;
    el.muted = true;
    const p = el.play();
    if (p && typeof p.catch === "function") {
      void p.catch(() => onVideoError());
    }
  }, [shouldPlay, videoMounted, motion?.url, onVideoError]);

  const markReady = useCallback(() => {
    setVideoReady(true);
  }, []);

  const handleError = useCallback(() => {
    setVideoReady(false);
    setVideoMounted(false);
    onVideoError();
  }, [onVideoError]);

  const frameStill = (
    <MuralFrame
      imageUrl={imageUrl}
      alt={alt}
      sizes={sizes}
      priority={priority}
      loading={loading}
      quality={quality}
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
      className={`murals-motion murals-motion--${variant}${showOverlay ? " is-playing" : ""}`}
    >
      <div className="murals-motion__stage">
        {onOpenLightbox ? (
          <button
            type="button"
            className="murals-room__open murals-motion__base"
            onClick={onOpenLightbox}
            aria-label={openLabel ?? `View ${alt} full screen`}
          >
            {still}
          </button>
        ) : (
          <div className="murals-motion__base">{still}</div>
        )}

        {videoMounted && motion?.url ? (
          <video
            ref={videoRef}
            className={`murals-motion__video${showOverlay ? " is-ready" : ""}`}
            src={motion.url}
            poster={imageUrl}
            muted
            loop
            playsInline
            preload="none"
            aria-labelledby={labelId}
            onPlaying={markReady}
            onLoadedData={markReady}
            onError={handleError}
          />
        ) : null}
      </div>
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
