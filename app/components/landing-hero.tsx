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
};

/**
 * Per-scene canvas boxes (inner blank area). Tuned from visual estimates —
 * tweak these when comparing against the live page.
 */
const SCENES: HeroScene[] = [
  {
    id: "1920s",
    label: "1920s gallery",
    src: "/images/hero-scenes/gallery-1920s.png",
    left: { left: "25.2%", top: "24.5%", width: "14.2%", height: "39.5%" },
    right: { left: "60.3%", top: "24.5%", width: "14.2%", height: "39.5%" },
    grade: {
      filter: "brightness(0.82) contrast(0.88) saturate(0.62) sepia(0.32)",
      cast: "linear-gradient(180deg, rgba(210, 150, 70, 0.28) 0%, rgba(90, 55, 25, 0.22) 100%)",
      castMix: "multiply",
    },
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk gallery",
    src: "/images/hero-scenes/gallery-cyberpunk.png",
    left: { left: "25.0%", top: "24.8%", width: "14.5%", height: "39.8%" },
    right: { left: "60.5%", top: "24.8%", width: "14.5%", height: "39.8%" },
    grade: {
      filter: "brightness(0.8) contrast(0.9) saturate(0.58) hue-rotate(-8deg)",
      cast: "linear-gradient(160deg, rgba(180, 60, 140, 0.32) 0%, rgba(40, 90, 160, 0.28) 100%)",
      castMix: "soft-light",
    },
  },
  {
    id: "renaissance",
    label: "Renaissance gallery",
    src: "/images/hero-scenes/gallery-renaissance.png",
    left: { left: "25.5%", top: "25.0%", width: "14.0%", height: "39.0%" },
    right: { left: "60.0%", top: "25.0%", width: "14.0%", height: "39.0%" },
    grade: {
      filter: "brightness(0.84) contrast(0.9) saturate(0.65) sepia(0.22)",
      cast: "linear-gradient(180deg, rgba(200, 160, 90, 0.24) 0%, rgba(80, 50, 30, 0.18) 100%)",
      castMix: "multiply",
    },
  },
  {
    id: "japanese",
    label: "Japanese gallery",
    src: "/images/hero-scenes/gallery-japanese.png",
    left: { left: "25.5%", top: "24.0%", width: "14.5%", height: "38.0%" },
    right: { left: "60.0%", top: "24.0%", width: "14.5%", height: "38.0%" },
    grade: {
      filter: "brightness(0.9) contrast(0.9) saturate(0.68) sepia(0.12)",
      cast: "linear-gradient(180deg, rgba(230, 215, 190, 0.2) 0%, rgba(160, 145, 120, 0.16) 100%)",
      castMix: "multiply",
    },
  },
];

const LEFT_ROTATE_MS = 5600;
const RIGHT_ROTATE_MS = 7800;
const SCENE_ROTATE_MS = 3 * 60 * 1000;
const CROSSFADE_MS = 1000;
const SCENE_CROSSFADE_MS = 1400;

const FRAME_SHADOW =
  "inset 0 0 0 2.5px rgba(18, 14, 12, 0.92), 0 14px 28px rgba(0, 0, 0, 0.58), 0 6px 10px rgba(0, 0, 0, 0.4), 0 2px 3px rgba(0, 0, 0, 0.3)";

const VIGNETTE =
  "radial-gradient(ellipse at center, transparent 38%, rgba(0, 0, 0, 0.18) 68%, rgba(0, 0, 0, 0.52) 100%)";

function LandingNav() {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white">
      <Link
        href="/"
        className="nav-brand text-2xl md:text-3xl leading-none uppercase text-[#0a0a0a] hover:opacity-70 transition-opacity"
      >
        Machine Dreams
      </Link>
      <div className="flex items-center gap-3">
        <Link href="/gallery" className="btn-nav">
          Gallery
        </Link>
        <Link href="/about" className="btn-nav">
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
}: {
  urls: string[];
  intervalMs: number;
  box: FrameBox;
  grade: SceneGrade;
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
        boxShadow: FRAME_SHADOW,
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
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: grade.filter }}
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
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAuto = useCallback(() => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
  }, []);

  const startAuto = useCallback(() => {
    clearAuto();
    autoTimerRef.current = setInterval(() => {
      setSceneIndex((current) => {
        if (SCENES.length <= 1) return current;
        let next = Math.floor(Math.random() * SCENES.length);
        if (next === current) next = (current + 1) % SCENES.length;
        return next;
      });
    }, SCENE_ROTATE_MS);
  }, [clearAuto]);

  useEffect(() => {
    setSceneIndex(Math.floor(Math.random() * SCENES.length));
    startAuto();
    return clearAuto;
  }, [startAuto, clearAuto]);

  const selectScene = (index: number) => {
    setSceneIndex(index);
    // Restart auto-rotate so a manual pick isn't immediately overwritten
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
        <div className="relative w-full aspect-[1024/341]">
          {SCENES.map((s, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={s.id}
              src={s.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity ease-in-out"
              style={{
                opacity: i === sceneIndex ? 1 : 0,
                transitionDuration: `${SCENE_CROSSFADE_MS}ms`,
              }}
            />
          ))}

          <FrameSlot
            urls={leftUrls}
            intervalMs={LEFT_ROTATE_MS}
            box={scene.left}
            grade={scene.grade}
          />
          <FrameSlot
            urls={rightUrls}
            intervalMs={RIGHT_ROTATE_MS}
            box={scene.right}
            grade={scene.grade}
          />

          {/* Minimal scene switcher — bottom-left, away from nav */}
          <div
            className="absolute bottom-3 left-3 z-10 flex items-center gap-2 md:bottom-4 md:left-4"
            role="tablist"
            aria-label="Gallery scene"
          >
            {SCENES.map((s, i) => {
              const active = i === sceneIndex;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={s.label}
                  onClick={() => selectScene(i)}
                  className={`block h-1.5 w-1.5 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60 ${
                    active
                      ? "bg-white/80 scale-125"
                      : "bg-white/35 hover:bg-white/55"
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
