"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import type { PublicMural } from "./public-types";
import { MuralFrame, muralAlt } from "./mural-frame";
import { WallLabel } from "./wall-label";

type ViewMode = "timeline" | "grid";

const STORAGE_KEY = "arena-murals-view";
const GRID_PAGE = 24;
const THUMB_W = 72;
const THUMB_GAP = 8;
const STRIP_STEP = THUMB_W + THUMB_GAP;
const DOCK_MAX = 1.8;
const DOCK_RADIUS = 110;
const DRAG_THRESHOLD = 5;

function readStoredView(): ViewMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "timeline" || v === "grid") return v;
    if (v === "wall") return "timeline";
  } catch {
    /* ignore */
  }
  return "timeline";
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

function hasFinePointer(): boolean {
  try {
    return window.matchMedia("(pointer: fine)").matches;
  } catch {
    return false;
  }
}

function seasonShort(seasonNumber?: number): string {
  if (typeof seasonNumber !== "number" || !Number.isFinite(seasonNumber)) {
    return "S—";
  }
  return `S${Math.trunc(seasonNumber)}`;
}

function thumbAriaLabel(item: PublicMural): string {
  const season =
    typeof item.seasonNumber === "number"
      ? `Season ${Math.trunc(item.seasonNumber)}`
      : "Season";
  return `${season}: ${item.title}`;
}

function readQueryParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function replaceSelectionInUrl(id: string) {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("s", id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  } catch {
    /* ignore */
  }
}

/** Dev-only layout stress data. Never used in production. */
function expandFakeItems(items: PublicMural[], count: number): PublicMural[] {
  if (process.env.NODE_ENV !== "development") return items;
  if (!Number.isFinite(count) || count < 1 || items.length === 0) return items;
  const n = Math.min(Math.floor(count), 2000);
  const baseMax = items.reduce((max, item) => {
    const s =
      typeof item.seasonNumber === "number" ? item.seasonNumber : items.length;
    return Math.max(max, s);
  }, items.length);
  const out: PublicMural[] = [];
  for (let i = 0; i < n; i++) {
    const src = items[i % items.length]!;
    out.push({
      ...src,
      id: `fake-${i}-${src.id}`,
      seasonNumber: baseMax + n - i,
      title: src.title,
      caption: src.caption,
    });
  }
  return out;
}

function SeasonLine({ seasonNumber }: { seasonNumber?: number }) {
  const show =
    typeof seasonNumber === "number" && Number.isFinite(seasonNumber);
  return (
    <p className="murals-season-line">
      {show ? `Season ${Math.trunc(seasonNumber)}` : null}
    </p>
  );
}

function StageWork({ item }: { item: PublicMural }) {
  return (
    <div className="murals-hang murals-stage__hang">
      <div className="murals-hang__spot" aria-hidden="true" />
      <div className="murals-hang__body">
        <SeasonLine seasonNumber={item.seasonNumber} />
        <Link
          href={`/murals/${item.id}`}
          className="murals-link-reset murals-stage__media murals-hang__shadow"
          aria-label={`Open ${item.title}`}
        >
          <MuralFrame
            frameKind={item.frameKind}
            imageUrl={item.imageUrl}
            alt={muralAlt(item.title, item.caption)}
            sizes="(max-width: 768px) 92vw, min(42rem, 70vw)"
            priority
            loading="eager"
            quality={85}
          />
        </Link>
        <WallLabel
          title={item.title}
          caption={item.caption}
          seasonNumber={item.seasonNumber}
          includeSeason={false}
          titleAs="h2"
          align="left"
          viewHref={`/murals/${item.id}`}
        />
      </div>
    </div>
  );
}

function GridTile({ item }: { item: PublicMural }) {
  return (
    <Link
      href={`/murals/${item.id}`}
      className="murals-grid__item"
      role="listitem"
    >
      <div className="murals-hang">
        <div className="murals-hang__spot" aria-hidden="true" />
        <div className="murals-hang__body">
          <div className="murals-hang__shadow w-full">
            <MuralFrame
              frameKind={item.frameKind}
              imageUrl={item.imageUrl}
              alt={muralAlt(item.title, item.caption)}
              sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 220px"
              loading="lazy"
              quality={60}
            />
          </div>
          <WallLabel
            title={item.title}
            caption=""
            seasonNumber={item.seasonNumber}
            titleAs="h2"
            align="center"
          />
        </div>
      </div>
    </Link>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="murals-view-toggle" role="group" aria-label="Gallery view">
      <button
        type="button"
        aria-pressed={view === "timeline"}
        onClick={() => onChange("timeline")}
      >
        Timeline
      </button>
      <button
        type="button"
        aria-pressed={view === "grid"}
        onClick={() => onChange("grid")}
      >
        Grid
      </button>
    </div>
  );
}

export function MuralsGalleryClient({ items }: { items: PublicMural[] }) {
  const [view, setView] = useState<ViewMode>("timeline");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [gridCount, setGridCount] = useState(GRID_PAGE);
  const [jumpValue, setJumpValue] = useState("");
  const [jumpError, setJumpError] = useState<string | null>(null);
  const [displayItems, setDisplayItems] = useState(items);
  const [ready, setReady] = useState(false);
  const [stripOverflow, setStripOverflow] = useState({
    left: false,
    right: false,
    any: false,
  });

  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dragRef = useRef<{
    pointerId: number | null;
    startX: number;
    startLeft: number;
    moved: boolean;
    capturing: boolean;
  }>({
    pointerId: null,
    startX: 0,
    startLeft: 0,
    moved: false,
    capturing: false,
  });

  const selected = useMemo(
    () => displayItems.find((item) => item.id === selectedId) ?? null,
    [displayItems, selectedId]
  );

  const selectedIndex = useMemo(() => {
    if (!selectedId) return -1;
    return displayItems.findIndex((item) => item.id === selectedId);
  }, [displayItems, selectedId]);

  const updateStripOverflow = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) {
      setStripOverflow({ left: false, right: false, any: false });
      return;
    }
    const max = strip.scrollWidth - strip.clientWidth;
    const any = max > 2;
    setStripOverflow({
      any,
      left: any && strip.scrollLeft > 2,
      right: any && strip.scrollLeft < max - 2,
    });
  }, []);

  const onHydrate = useEffectEvent(() => {
    setView(readStoredView());

    let list = items;
    if (process.env.NODE_ENV === "development") {
      const fakeRaw = readQueryParam("fake");
      const fakeN = fakeRaw ? Number(fakeRaw) : NaN;
      if (Number.isFinite(fakeN) && fakeN > 0) {
        list = expandFakeItems(items, fakeN);
      }
    }
    setDisplayItems(list);

    const fromUrl = readQueryParam("s");
    const initial =
      (fromUrl && list.find((item) => item.id === fromUrl)?.id) ||
      list[0]?.id ||
      null;
    setSelectedId(initial);
    setReady(true);
  });

  useEffect(() => {
    onHydrate();
  }, [items]);

  const selectId = useCallback(
    (id: string, opts?: { syncUrl?: boolean; scrollStrip?: boolean }) => {
      setSelectedId(id);
      setJumpError(null);
      if (opts?.syncUrl !== false) replaceSelectionInUrl(id);
      if (opts?.scrollStrip !== false) {
        requestAnimationFrame(() => {
          const strip = stripRef.current;
          const thumb = thumbRefs.current.get(id);
          if (!strip || !thumb) return;
          const left =
            thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2;
          strip.scrollTo({
            left: Math.max(0, left),
            behavior: prefersReducedMotion() ? "auto" : "smooth",
          });
          updateStripOverflow();
        });
      }
    },
    [updateStripOverflow]
  );

  const setMode = useCallback((mode: ViewMode) => {
    setView(mode);
    writeStoredView(mode);
  }, []);

  const applyDockScales = useCallback((clientX: number | null) => {
    if (!hasFinePointer()) {
      for (const [, el] of thumbRefs.current) {
        el.style.setProperty("--dock-scale", "1");
      }
      return;
    }
    for (const [, el] of thumbRefs.current) {
      if (clientX == null) {
        el.style.setProperty("--dock-scale", "1");
        continue;
      }
      const rect = el.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      const dist = Math.abs(mid - clientX);
      const t = Math.max(0, 1 - dist / DOCK_RADIUS);
      const scale = 1 + (DOCK_MAX - 1) * t * t;
      el.style.setProperty("--dock-scale", String(scale));
    }
  }, []);

  const scrollStripBy = useCallback(
    (dir: -1 | 1) => {
      const strip = stripRef.current;
      if (!strip) return;
      strip.scrollBy({
        left: dir * STRIP_STEP * 6,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      window.setTimeout(updateStripOverflow, 320);
    },
    [updateStripOverflow]
  );

  useEffect(() => {
    if (!ready || view !== "timeline") return;
    const strip = stripRef.current;
    if (!strip) return;

    updateStripOverflow();

    const onWheel = (e: WheelEvent) => {
      const overflows = strip.scrollWidth > strip.clientWidth + 2;
      if (!overflows) return;
      // Native horizontal trackpad / shift+wheel: let the browser handle it.
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      if (e.deltaY === 0) return;
      e.preventDefault();
      strip.scrollLeft += e.deltaY;
      updateStripOverflow();
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startLeft: strip.scrollLeft,
        moved: false,
        capturing: false,
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (hasFinePointer()) applyDockScales(e.clientX);

      const drag = dragRef.current;
      if (drag.pointerId !== e.pointerId) return;

      const dx = e.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) >= DRAG_THRESHOLD) {
        drag.moved = true;
        if (!drag.capturing) {
          strip.setPointerCapture(e.pointerId);
          drag.capturing = true;
        }
      }
      if (!drag.moved) return;
      strip.scrollLeft = drag.startLeft - dx;
      updateStripOverflow();
    };

    const endDrag = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (drag.pointerId !== e.pointerId) return;
      if (drag.capturing) {
        try {
          strip.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      // Keep moved flag until click handler runs (same event turn / next).
      window.setTimeout(() => {
        if (dragRef.current.pointerId === e.pointerId) {
          dragRef.current.pointerId = null;
          dragRef.current.moved = false;
          dragRef.current.capturing = false;
        }
      }, 0);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (dragRef.current.moved) {
        e.preventDefault();
        e.stopPropagation();
        dragRef.current.moved = false;
      }
    };

    const onPointerLeave = () => {
      applyDockScales(null);
    };

    const onScroll = () => updateStripOverflow();

    strip.addEventListener("wheel", onWheel, { passive: false });
    strip.addEventListener("pointerdown", onPointerDown);
    strip.addEventListener("pointermove", onPointerMove);
    strip.addEventListener("pointerup", endDrag);
    strip.addEventListener("pointercancel", endDrag);
    strip.addEventListener("pointerleave", onPointerLeave);
    strip.addEventListener("click", onClickCapture, true);
    strip.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateStripOverflow);
    return () => {
      strip.removeEventListener("wheel", onWheel);
      strip.removeEventListener("pointerdown", onPointerDown);
      strip.removeEventListener("pointermove", onPointerMove);
      strip.removeEventListener("pointerup", endDrag);
      strip.removeEventListener("pointercancel", endDrag);
      strip.removeEventListener("pointerleave", onPointerLeave);
      strip.removeEventListener("click", onClickCapture, true);
      strip.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateStripOverflow);
    };
  }, [ready, view, applyDockScales, displayItems, updateStripOverflow]);

  useEffect(() => {
    if (!ready || view !== "timeline") return;

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
      if (displayItems.length === 0 || selectedIndex < 0) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (selectedIndex > 0) selectId(displayItems[selectedIndex - 1]!.id);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (selectedIndex < displayItems.length - 1) {
          selectId(displayItems[selectedIndex + 1]!.id);
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        selectId(displayItems[0]!.id);
      } else if (e.key === "End") {
        e.preventDefault();
        selectId(displayItems[displayItems.length - 1]!.id);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, view, displayItems, selectedIndex, selectId]);

  useEffect(() => {
    if (!ready || view !== "timeline" || !selectedId) return;
    const thumb = thumbRefs.current.get(selectedId);
    const strip = stripRef.current;
    if (!thumb || !strip) return;
    const left =
      thumb.offsetLeft - (strip.clientWidth - thumb.offsetWidth) / 2;
    strip.scrollTo({
      left: Math.max(0, left),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
    updateStripOverflow();
  }, [ready, view, selectedId, updateStripOverflow]);

  function jumpToSeason(raw: string) {
    const n = Number(raw.trim());
    if (!Number.isInteger(n) || n < 1) {
      setJumpError("No season N");
      return;
    }
    const match = displayItems.find(
      (item) =>
        typeof item.seasonNumber === "number" &&
        Math.trunc(item.seasonNumber) === n
    );
    if (!match) {
      setJumpError(`No season ${n}`);
      return;
    }
    setJumpError(null);
    selectId(match.id);
  }

  const header = (
    <div className="murals-header">
      <h1 className="murals-heading">Murals</h1>
      <ViewToggle view={view} onChange={setMode} />
    </div>
  );

  if (items.length === 0 && displayItems.length === 0) {
    return (
      <div className="murals-gallery">
        <div className="murals-header">
          <h1 className="murals-heading">Murals</h1>
        </div>
        <p className="murals-empty">
          No murals yet. The first one is made when a season ends.
        </p>
      </div>
    );
  }

  const gridVisible = displayItems.slice(0, gridCount);

  return (
    <div
      className={`murals-gallery${view === "timeline" ? " murals-gallery--timeline" : " murals-gallery--grid"}`}
    >
      {header}

      {view === "timeline" ? (
        <div className="murals-timeline">
          <div className="murals-stage" aria-live="polite">
            {selected ? (
              <div key={selected.id} className="murals-stage__panel">
                <StageWork item={selected} />
              </div>
            ) : null}
          </div>

          <div className="murals-strip-block">
            <div className="murals-strip-header">
              <span className="murals-strip-header__label">Seasons</span>
              <form
                className="murals-jump"
                onSubmit={(e) => {
                  e.preventDefault();
                  jumpToSeason(jumpValue);
                }}
              >
                <label className="murals-jump__label" htmlFor="murals-jump-season">
                  Jump to season
                </label>
                <input
                  id="murals-jump-season"
                  className="murals-jump__input"
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
                  value={jumpValue}
                  onChange={(e) => {
                    setJumpValue(e.target.value);
                    setJumpError(null);
                  }}
                  aria-describedby={jumpError ? "murals-jump-error" : undefined}
                />
                {jumpError ? (
                  <span id="murals-jump-error" className="murals-jump__error">
                    {jumpError}
                  </span>
                ) : null}
              </form>
            </div>

            <div className="murals-strip-shell">
              {stripOverflow.any ? (
                <button
                  type="button"
                  className="murals-strip__arrow murals-strip__arrow--prev"
                  aria-label="Scroll timeline left"
                  disabled={!stripOverflow.left}
                  onClick={() => scrollStripBy(-1)}
                >
                  ‹
                </button>
              ) : null}

              <div
                ref={stripRef}
                className="murals-strip"
                role="listbox"
                aria-label="Season timeline"
                aria-activedescendant={
                  selectedId ? `murals-thumb-${selectedId}` : undefined
                }
              >
                {displayItems.map((item) => {
                  const selectedThumb = item.id === selectedId;
                  return (
                    <button
                      key={item.id}
                      id={`murals-thumb-${item.id}`}
                      type="button"
                      role="option"
                      aria-selected={selectedThumb}
                      aria-current={selectedThumb ? "true" : undefined}
                      aria-label={thumbAriaLabel(item)}
                      className={`murals-strip__thumb${selectedThumb ? " is-selected" : ""}`}
                      style={{ width: THUMB_W }}
                      ref={(node) => {
                        if (node) thumbRefs.current.set(item.id, node);
                        else thumbRefs.current.delete(item.id);
                      }}
                      onClick={() => {
                        if (dragRef.current.moved) return;
                        selectId(item.id);
                      }}
                    >
                      <span className="murals-strip__frame">
                        <MuralFrame
                          frameKind={item.frameKind}
                          imageUrl={item.imageUrl}
                          alt=""
                          sizes={`${THUMB_W}px`}
                          loading="lazy"
                          quality={40}
                        />
                      </span>
                      <span className="murals-strip__season">
                        {seasonShort(item.seasonNumber)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {stripOverflow.any ? (
                <button
                  type="button"
                  className="murals-strip__arrow murals-strip__arrow--next"
                  aria-label="Scroll timeline right"
                  disabled={!stripOverflow.right}
                  onClick={() => scrollStripBy(1)}
                >
                  ›
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="murals-grid-wrap">
          <div className="murals-grid" role="list" aria-label="Murals grid">
            {gridVisible.map((item) => (
              <GridTile key={item.id} item={item} />
            ))}
          </div>
          {gridCount < displayItems.length ? (
            <div className="murals-grid-more">
              <button
                type="button"
                className="murals-load-more"
                onClick={() =>
                  setGridCount((n) =>
                    Math.min(n + GRID_PAGE, displayItems.length)
                  )
                }
              >
                Load more
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
