"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type { MuralPublicItem } from "@/lib/murals/types";
import { MuralFrame, muralAlt } from "./mural-frame";
import { WallLabel } from "./wall-label";

type ViewMode = "wall" | "grid";

const STORAGE_KEY = "arena-murals-view";

function readStoredView(): ViewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "wall" || v === "grid") return v;
  } catch {
    /* ignore */
  }
  return "wall";
}

function writeStoredView(mode: ViewMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

function Hang({
  item,
  sizes,
  showFullLabel,
}: {
  item: MuralPublicItem;
  sizes: string;
  showFullLabel: boolean;
}) {
  const alt = muralAlt(item.title, item.caption);
  return (
    <div className="murals-hang">
      <div className="murals-hang__spot" aria-hidden="true" />
      <div className="murals-hang__body">
        <div className="murals-hang__shadow w-full">
          <MuralFrame
            frameKind={item.frameKind}
            imageUrl={item.imageUrl}
            alt={alt}
            sizes={sizes}
          />
        </div>
        {showFullLabel ? (
          <WallLabel
            title={item.title}
            caption={item.caption}
            seasonName={item.seasonName}
            titleAs="h2"
          />
        ) : (
          <h2 className="murals-grid__title">{item.title}</h2>
        )}
      </div>
    </div>
  );
}

export function MuralsGalleryClient({ items }: { items: MuralPublicItem[] }) {
  const [view, setView] = useState<ViewMode>("wall");
  const wallRef = useRef<HTMLDivElement>(null);

  const onHydrateView = useEffectEvent(() => {
    setView(readStoredView());
  });

  useEffect(() => {
    onHydrateView();
  }, []);

  const setMode = useCallback((mode: ViewMode) => {
    setView(mode);
    writeStoredView(mode);
  }, []);

  useEffect(() => {
    if (view !== "wall") return;
    const el = wallRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (window.matchMedia("(max-width: 767px)").matches) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    const onKey = (e: KeyboardEvent) => {
      if (window.matchMedia("(max-width: 767px)").matches) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const step = Math.max(el.clientWidth * 0.72, 280);
      const reduced = prefersReducedMotion();
      el.scrollBy({
        left: e.key === "ArrowRight" ? step : -step,
        behavior: reduced ? "auto" : "smooth",
      });
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [view]);

  if (items.length === 0) {
    return (
      <p className="murals-empty">
        No murals yet. The first one is made when a season ends.
      </p>
    );
  }

  return (
    <div>
      <div className="flex justify-center px-5 pb-6 pt-2">
        <div className="murals-view-toggle" role="group" aria-label="Gallery view">
          <button
            type="button"
            aria-pressed={view === "wall"}
            onClick={() => setMode("wall")}
          >
            Wall
          </button>
          <button
            type="button"
            aria-pressed={view === "grid"}
            onClick={() => setMode("grid")}
          >
            Grid
          </button>
        </div>
      </div>

      {view === "wall" ? (
        <div
          ref={wallRef}
          className="murals-wall"
          role="list"
          aria-label="Arena Murals wall"
        >
          {items.map((item) => (
            <div key={item.id} className="murals-wall__item" role="listitem">
              <Link
                href={`/murals/${item.id}`}
                className="murals-link-reset"
              >
                <Hang
                  item={item}
                  sizes="(max-width: 767px) 90vw, min(52vw, 34rem)"
                  showFullLabel
                />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="murals-grid" role="list" aria-label="Arena Murals grid">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/murals/${item.id}`}
              className="murals-grid__item"
              role="listitem"
            >
              <Hang
                item={item}
                sizes="(max-width: 639px) 90vw, (max-width: 1023px) 45vw, 22rem"
                showFullLabel={false}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
