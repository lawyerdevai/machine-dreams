"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type FrameBox = {
  left: string;
  top: string;
  width: string;
  height: string;
};

type SceneGrade = {
  /** CSS filter on the artwork image */
  filter: string;
  /** Ambient color cast over the artwork */
  cast: string;
  castMix: "multiply" | "soft-light" | "color";
};

type HeroScene = {
  id: string;
  label: string;
  src: string;
  left: FrameBox;
  right: FrameBox;
  grade: SceneGrade;
  /** Optional override for frame box-shadow (defaults to FRAME_SHADOW) */
  frameShadow?: string;
};

/**
 * Per-scene canvas boxes (inner blank area), measured from the 2172×724 sources.
 * Filenames kept for stability; labels match the redesigned themes.
 */
const SCENES: HeroScene[] = [
  {
    id: "gatsby",
    label: "Great Gatsby",
    src: "/images/hero-scenes/gallery-1920s.png",
    left: { left: "25.35%", top: "15.31%", width: "16.56%", height: "43.83%" },
    right: { left: "60.53%", top: "15.03%", width: "16.65%", height: "44.11%" },
    grade: {
      filter: "brightness(0.8) contrast(0.86) saturate(0.58) sepia(0.34)",
      cast: "linear-gradient(180deg, rgba(220, 170, 80, 0.3) 0%, rgba(100, 60, 25, 0.24) 100%)",
      castMix: "multiply",
    },
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    src: "/images/hero-scenes/gallery-cyberpunk.png",
    left: { left: "25.21%", top: "18.76%", width: "17.02%", height: "42.31%" },
    right: { left: "61.03%", top: "18.76%", width: "17.02%", height: "42.45%" },
    grade: {
      filter: "brightness(0.78) contrast(0.88) saturate(0.55) hue-rotate(-10deg)",
      cast: "linear-gradient(155deg, rgba(200, 50, 150, 0.34) 0%, rgba(30, 70, 140, 0.3) 100%)",
      castMix: "soft-light",
    },
  },
  {
    id: "mahogany",
    label: "Old Mahogany Office",
    src: "/images/hero-scenes/gallery-renaissance.png",
    left: { left: "25.63%", top: "19.18%", width: "16.15%", height: "41.35%" },
    right: { left: "59.24%", top: "19.18%", width: "16.1%", height: "41.35%" },
    grade: {
      filter: "brightness(0.8) contrast(0.87) saturate(0.6) sepia(0.38)",
      cast: "linear-gradient(180deg, rgba(210, 150, 70, 0.34) 0%, rgba(70, 40, 18, 0.28) 100%)",
      castMix: "multiply",
    },
  },
  {
    id: "minimal",
    label: "Minimalist Modern",
    src: "/images/hero-scenes/gallery-japanese.png",
    left: { left: "25.95%", top: "21.39%", width: "16.61%", height: "41.9%" },
    right: { left: "58.32%", top: "22.49%", width: "16.19%", height: "40.79%" },
    grade: {
      filter: "brightness(0.92) contrast(0.9) saturate(0.7) sepia(0.06)",
      cast: "linear-gradient(180deg, rgba(220, 225, 230, 0.12) 0%, rgba(170, 165, 155, 0.14) 100%)",
      castMix: "multiply",
    },
    frameShadow:
      "inset 0 0 0 1.5px rgba(40, 40, 40, 0.7), 0 10px 22px rgba(0, 0, 0, 0.28), 0 3px 6px rgba(0, 0, 0, 0.18)",
  },
];

const LEFT_ROTATE_MS = 5600;
const RIGHT_ROTATE_MS = 7800;
const SCENE_ROTATE_MS = 3 * 60 * 1000;
const CROSSFADE_MS = 1000;
/** Fade out → swap → fade in for theme changes (avoids overlay position jump) */
const SCENE_FADE_MS = 450;

const FRAME_SHADOW =
  "inset 0 0 0 1.5px rgba(18, 14, 12, 0.88), 0 14px 28px rgba(0, 0, 0, 0.58), 0 6px 10px rgba(0, 0, 0, 0.4), 0 2px 3px rgba(0, 0, 0, 0.3)";

const VIGNETTE =
  "radial-gradient(ellipse at center, transparent 38%, rgba(0, 0, 0, 0.18) 68%, rgba(0, 0, 0, 0.52) 100%)";

function LandingNav() {
  return (
    <header className="flex items-center justify-between gap-3 px-6 py-3 max-md:gap-2 max-md:px-3 max-md:py-2.5 bg-white">
      <Link
        href="/"
        className="nav-brand min-w-0 shrink text-2xl max-md:text-sm max-md:tracking-[0.06em] max-md:whitespace-nowrap md:text-3xl leading-none uppercase text-[#0a0a0a] hover:opacity-70 transition-opacity"
      >
        Machine Dreams
      </Link>
      <div className="flex shrink-0 items-center gap-3 max-md:gap-1.5">
        <Link
          href="/gallery"
          className="btn-nav max-md:px-2 max-md:py-1 max-md:text-[10px] max-md:leading-none max-md:tracking-[0.04em]"
        >
          Gallery
        </Link>
        <Link
          href="/about"
          className="btn-nav max-md:px-2 max-md:py-1 max-md:text-[10px] max-md:leading-none max-md:tracking-[0.04em]"
        >
          About
        </Link>
      </div>
    </header>
  );
}

function FrameSlot({
  urls,
  intervalMs,
  box,
  grade,
  frameShadow = FRAME_SHADOW,
}: {
  urls: string[];
  intervalMs: number;
  box: FrameBox;
  grade: SceneGrade;
  frameShadow?: string;
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (urls.length === 0) return;
    setIndex(Math.floor(Math.random() * urls.length));
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % urls.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [urls, intervalMs]);

  if (urls.length === 0) return null;

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        ...box,
        boxShadow: frameShadow,
      }}
      aria-hidden="true"
    >
      {urls.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className="absolute inset-0 transition-opacity ease-in-out"
          style={{
            opacity: i === index ? 1 : 0,
            transitionDuration: `${CROSSFADE_MS}ms`,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full max-w-none object-cover object-center"
            style={{
              filter: grade.filter,
              // Slight overscan so cover never leaves subpixel gaps at the frame edge
              transform: "scale(1.02)",
              transformOrigin: "center center",
            }}
          />
          {/* Scene-specific ambient cast */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: grade.cast,
              mixBlendMode: grade.castMix,
            }}
          />
          {/* Edge vignette — frame shadow onto the canvas */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: VIGNETTE }}
          />
        </div>
      ))}
    </div>
  );
}

export function LandingHero({ imageUrls }: { imageUrls: string[] }) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [contentVisible, setContentVisible] = useState(true);
  const [dotIndex, setDotIndex] = useState(0);
  const sceneIndexRef = useRef(0);
  const transitioningRef = useRef(false);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearFadeTimers = useCallback(() => {
    fadeTimersRef.current.forEach(clearTimeout);
    fadeTimersRef.current = [];
  }, []);

  const clearAuto = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const transitionToScene = useCallback(
    (next: number) => {
      if (next === sceneIndexRef.current || transitioningRef.current) return;
      if (next < 0 || next >= SCENES.length) return;

      transitioningRef.current = true;
      setDotIndex(next);
      setContentVisible(false);

      clearFadeTimers();
      const t1 = setTimeout(() => {
        sceneIndexRef.current = next;
        setSceneIndex(next);

        // Wait a frame so new coords paint while still invisible
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setContentVisible(true);
            const t2 = setTimeout(() => {
              transitioningRef.current = false;
            }, SCENE_FADE_MS);
            fadeTimersRef.current.push(t2);
          });
        });
      }, SCENE_FADE_MS);
      fadeTimersRef.current.push(t1);
    },
    [clearFadeTimers]
  );

  const startAuto = useCallback(() => {
    clearAuto();
    autoTimerRef.current = setInterval(() => {
      const current = sceneIndexRef.current;
      if (SCENES.length <= 1) return;
      let next = Math.floor(Math.random() * SCENES.length);
      if (next === current) next = (current + 1) % SCENES.length;
      transitionToScene(next);
    }, SCENE_ROTATE_MS);
  }, [clearAuto, transitionToScene]);

  useEffect(() => {
    const initial = Math.floor(Math.random() * SCENES.length);
    sceneIndexRef.current = initial;
    setSceneIndex(initial);
    setDotIndex(initial);
    startAuto();
    return () => {
      clearAuto();
      clearFadeTimers();
    };
  }, [startAuto, clearAuto, clearFadeTimers]);

  const selectScene = (index: number) => {
    transitionToScene(index);
    startAuto();
  };

  const scene = SCENES[sceneIndex] ?? SCENES[0]!;

  const mid = Math.ceil(imageUrls.length / 2);
  const leftUrls =
    imageUrls.length <= 1
      ? imageUrls
      : imageUrls.slice(0, Math.max(1, mid));
  const rightUrls =
    imageUrls.length <= 1
      ? imageUrls
      : imageUrls.slice(mid).length > 0
        ? imageUrls.slice(mid)
        : imageUrls;

  return (
    <div className="flex flex-col w-full">
      <LandingNav />

      <section className="relative w-full overflow-hidden bg-[#1a1612]">
        <div className="relative w-full aspect-[2172/724]">
          {/* Preload all scenes so swaps stay sharp */}
          <div className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden>
            {SCENES.map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={`preload-${s.id}`} src={s.src} alt="" width={2172} height={724} />
            ))}
          </div>

          {/* Scene + overlays fade as one unit so coords never jump while visible */}
          <div
            className="absolute inset-0 transition-opacity ease-in-out"
            style={{
              opacity: contentVisible ? 1 : 0,
              transitionDuration: `${SCENE_FADE_MS}ms`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={scene.src}
              alt=""
              width={2172}
              height={724}
              className="absolute inset-0 h-full w-full object-cover"
            />

            <FrameSlot
              urls={leftUrls}
              intervalMs={LEFT_ROTATE_MS}
              box={scene.left}
              grade={scene.grade}
              frameShadow={scene.frameShadow}
            />
            <FrameSlot
              urls={rightUrls}
              intervalMs={RIGHT_ROTATE_MS}
              box={scene.right}
              grade={scene.grade}
              frameShadow={scene.frameShadow}
            />
          </div>

          {/* Minimal scene switcher — bottom-center, readable on light & dark scenes */}
          <div
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 rounded-full bg-black/40 px-3 py-2 shadow-[0_1px_6px_rgba(0,0,0,0.35)] backdrop-blur-[2px] md:bottom-4"
            role="tablist"
            aria-label="Gallery scene"
          >
            {SCENES.map((s, i) => {
              const active = i === dotIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={s.label}
                  onClick={() => selectScene(i)}
                  className={`block h-2 w-2 rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.25)] transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/70 ${
                    active
                      ? "bg-white scale-110"
                      : "bg-white/45 hover:bg-white/70"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
