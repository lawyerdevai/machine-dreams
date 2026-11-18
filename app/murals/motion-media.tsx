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
/**
 * Swap before EOF. One frame (~1/30) is too tight — RVFC can miss and the
 * element fires `ended`/pauses. ~2 frames at 24fps keeps continuity.
 */
const LOOP_LEAD_S = 2 / 24;

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
  /**
   * Mount and buffer the double-buffer pair without showing them (grid hover
   * prefetch). Overlay still only appears after `playing` + first frame.
   */
  warm?: boolean;
};

type VideoFrameCb = (
  now: number,
  metadata: { mediaTime: number; presentedFrames: number }
) => void;

type VideoWithFrameCb = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: VideoFrameCb) => number;
  cancelVideoFrameCallback?: (id: number) => void;
};

/**
 * Still always mounted (layout owner). Two stacked videos mount only while
 * playing and alternate at EOF for a gapless loop — native `loop` hitches.
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
  warm = false,
}: MediaProps) {
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const labelId = useId();
  const [videoReady, setVideoReady] = useState(false);
  const [videoMounted, setVideoMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const shouldPlay = Boolean(playing && hasMotion && motion?.url);
  const shouldWarm = Boolean(warm && !shouldPlay && hasMotion && motion?.url);
  const shouldMount = shouldPlay || shouldWarm;
  // Sync mount/ready when play intent flips (avoid stale ready flash).
  const [playEpoch, setPlayEpoch] = useState(shouldPlay);
  if (shouldPlay !== playEpoch) {
    setPlayEpoch(shouldPlay);
    if (shouldPlay) {
      // Keep ready if we already warmed a frame; otherwise wait for onPlaying.
      if (!videoMounted) setVideoReady(false);
      setVideoMounted(true);
      setActiveIndex(0);
    } else {
      setVideoReady(false);
    }
  }
  const [warmEpoch, setWarmEpoch] = useState(shouldWarm);
  if (shouldWarm !== warmEpoch) {
    setWarmEpoch(shouldWarm);
    if (shouldWarm) setVideoMounted(true);
  }
  const showOverlay = shouldPlay && videoReady;

  // After stop fade-out (and no warm), unmount the videos — still stays mounted.
  useEffect(() => {
    if (shouldMount || !videoMounted) return;
    const t = window.setTimeout(() => setVideoMounted(false), VIDEO_FADE_MS);
    return () => window.clearTimeout(t);
  }, [shouldMount, videoMounted]);

  // Prefetch / warm decoder without showing the overlay.
  useEffect(() => {
    if (!shouldWarm || !videoMounted || !motion?.url) return;
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;
    let cancelled = false;
    for (const el of [a, b]) {
      el.muted = true;
      try {
        el.preload = "auto";
        el.load();
      } catch {
        /* ignore */
      }
    }
    const warmPlay = a.play();
    if (warmPlay && typeof warmPlay.then === "function") {
      void warmPlay
        .then(() => {
          if (cancelled) return;
          a.pause();
          try {
            a.currentTime = 0;
          } catch {
            /* ignore */
          }
        })
        .catch(() => {
          /* warm-up is best-effort */
        });
    }
    return () => {
      cancelled = true;
      try {
        a.pause();
        b.pause();
      } catch {
        /* ignore */
      }
    };
  }, [shouldWarm, videoMounted, motion?.url]);

  // Play / gapless double-buffer loop. Native `loop` stalls a frame on restart.
  useEffect(() => {
    if (!shouldPlay || !videoMounted || !motion?.url) return;

    const a = videoARef.current as VideoWithFrameCb | null;
    const b = videoBRef.current as VideoWithFrameCb | null;
    if (!a || !b) return;

    const pair: [VideoWithFrameCb, VideoWithFrameCb] = [a, b];
    let cancelled = false;
    let active = 0;
    let swapping = false;
    let rafId = 0;
    let rvfcId: number | undefined;
    let watching: VideoWithFrameCb | null = null;
    let listened: HTMLVideoElement | null = null;
    let onTimeUpdate: (() => void) | null = null;
    let onEnded: (() => void) | null = null;

    const clearWatch = () => {
      if (watching && rvfcId != null && watching.cancelVideoFrameCallback) {
        try {
          watching.cancelVideoFrameCallback(rvfcId);
        } catch {
          /* ignore */
        }
      }
      rvfcId = undefined;
      watching = null;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
      if (listened) {
        if (onTimeUpdate) listened.removeEventListener("timeupdate", onTimeUpdate);
        if (onEnded) listened.removeEventListener("ended", onEnded);
      }
      listened = null;
      onTimeUpdate = null;
      onEnded = null;
    };

    const nearEnd = (el: HTMLVideoElement, mediaTime: number) => {
      const d = el.duration;
      if (!Number.isFinite(d) || d <= 0) return false;
      return mediaTime >= d - LOOP_LEAD_S;
    };

    const prepareStandby = (el: HTMLVideoElement) => {
      el.muted = true;
      try {
        if (el.currentTime !== 0) el.currentTime = 0;
      } catch {
        /* ignore seek errors before metadata */
      }
    };

    const swap = () => {
      if (cancelled || swapping) return;
      swapping = true;
      clearWatch();

      const from = pair[active]!;
      const to = pair[1 - active]!;
      to.muted = true;
      try {
        to.currentTime = 0;
      } catch {
        /* ignore */
      }
      const playP = to.play();
      if (playP && typeof playP.catch === "function") {
        void playP.catch(() => {
          if (!cancelled) onVideoError();
        });
      }

      active = 1 - active;
      setActiveIndex(active);

      from.pause();
      prepareStandby(from);
      swapping = false;
      armWatch(to);
    };

    const armWatch = (el: VideoWithFrameCb) => {
      clearWatch();
      if (cancelled) return;
      watching = el;
      listened = el;

      const trySwap = (mediaTime: number) => {
        if (cancelled || watching !== el || swapping) return false;
        if (!nearEnd(el, mediaTime)) return false;
        swap();
        return true;
      };

      // timeupdate + ended: catch EOF if RVFC misses the lead window.
      onTimeUpdate = () => {
        trySwap(el.currentTime);
      };
      onEnded = () => {
        if (cancelled || watching !== el || swapping) return;
        swap();
      };
      el.addEventListener("timeupdate", onTimeUpdate);
      el.addEventListener("ended", onEnded);

      if (typeof el.requestVideoFrameCallback === "function") {
        const onFrame: VideoFrameCb = (_now, meta) => {
          if (cancelled || watching !== el) return;
          if (trySwap(meta.mediaTime)) return;
          rvfcId = el.requestVideoFrameCallback!(onFrame);
        };
        rvfcId = el.requestVideoFrameCallback(onFrame);
        return;
      }

      // Older Safari / Firefox: rAF + timeupdate/ended above.
      const tick = () => {
        if (cancelled || watching !== el) return;
        if (trySwap(el.currentTime)) return;
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    };

    for (const el of pair) {
      el.muted = true;
    }
    prepareStandby(b);

    const start = a.play();
    if (start && typeof start.catch === "function") {
      void start.catch(() => {
        if (!cancelled) onVideoError();
      });
    }

    // Warm the standby decoder without showing it.
    const warm = b.play();
    if (warm && typeof warm.then === "function") {
      void warm
        .then(() => {
          if (cancelled) return;
          b.pause();
          prepareStandby(b);
        })
        .catch(() => {
          /* standby warm-up is best-effort */
        });
    }

    armWatch(a);

    return () => {
      cancelled = true;
      clearWatch();
      for (const el of pair) {
        try {
          el.pause();
        } catch {
          /* ignore */
        }
      }
    };
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
          <div
            className={`murals-motion__loop${showOverlay ? " is-ready" : ""}`}
          >
            <video
              key={`a-${motion.url}`}
              ref={videoARef}
              className={`murals-motion__video${activeIndex === 0 ? " is-active" : ""}`}
              src={motion.url}
              poster={imageUrl}
              muted
              playsInline
              preload="none"
              aria-labelledby={labelId}
              onPlaying={activeIndex === 0 ? markReady : undefined}
              onLoadedData={activeIndex === 0 ? markReady : undefined}
              onError={handleError}
            />
            <video
              key={`b-${motion.url}`}
              ref={videoBRef}
              className={`murals-motion__video${activeIndex === 1 ? " is-active" : ""}`}
              src={motion.url}
              poster={imageUrl}
              muted
              playsInline
              preload="none"
              aria-hidden
              onError={handleError}
            />
          </div>
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
