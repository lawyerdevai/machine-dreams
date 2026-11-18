"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { sortSeasonMurals, type PublicMural } from "./public-types";
import { MuralFrame, muralAlt } from "./mural-frame";
import { MotionMark } from "./motion-media";
import { publicKindLabel, WallLabel } from "./wall-label";

type ViewMode = "timeline" | "grid";
type GalleryTab = "seasons" | "moments";

const GRID_PAGE = 24;
const THUMB_W = 72;
const THUMB_GAP = 8;
const STRIP_STEP = THUMB_W + THUMB_GAP;
const DOCK_MAX = 1.8;
const DOCK_RADIUS = 110;
const DRAG_THRESHOLD = 5;

function viewStorageKey(tab: GalleryTab): string {
  return `arena-murals-view-${tab}`;
}

function readStoredView(tab: GalleryTab): ViewMode {
  try {
    const v = localStorage.getItem(viewStorageKey(tab));
    if (v === "timeline" || v === "grid") return v;
    if (v === "wall") return "timeline";
    const legacy = localStorage.getItem("arena-murals-view");
    if (legacy === "timeline" || legacy === "grid") return legacy;
    if (legacy === "wall") return "timeline";
  } catch {
    /* ignore */
  }
  return "timeline";
}

function writeStoredView(tab: GalleryTab, mode: ViewMode) {
  try {
    localStorage.setItem(viewStorageKey(tab), mode);
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

function thumbAriaLabel(item: PublicMural, tab: GalleryTab): string {
  const label = publicKindLabel(item.kind, item.seasonNumber, item.day);
  if (tab === "moments") {
    return label ? `${label}: ${item.title}` : item.title;
  }
  return label ? `${label}: ${item.title}` : item.title;
}

function readQueryParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function replaceQuery(updates: Record<string, string | null>) {
  try {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "") url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
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
      ...(src.kind === "season"
        ? { seasonNumber: baseMax + n - i }
        : { seasonNumber: undefined }),
      title: src.title,
      caption: src.caption,
    });
  }
  return out;
}

function KindLine({ item }: { item: PublicMural }) {
  const text = publicKindLabel(item.kind, item.seasonNumber, item.day);
  return <p className="murals-season-line">{text}</p>;
}

function StageWork({ item }: { item: PublicMural }) {
  return (
    <div className="murals-hang murals-stage__hang">
      <div className="murals-hang__spot" aria-hidden="true" />
      <div className="murals-hang__body">
        <KindLine item={item} />
        <Link
          href={`/murals/${item.id}`}
          className="murals-link-reset murals-stage__media murals-hang__shadow murals-stage__enlarge"
          aria-label={`Enlarge ${item.title}`}
        >
          <MuralFrame
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
          kind={item.kind}
          seasonNumber={item.seasonNumber}
          day={item.day}
          includeSeason={false}
          titleAs="h2"
          align="left"
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
          <div className="murals-hang__shadow murals-hang__shadow--marked w-full">
            <MuralFrame
              imageUrl={item.imageUrl}
              alt={muralAlt(item.title, item.caption)}
              sizes="(max-width: 639px) 45vw, (max-width: 1023px) 30vw, 220px"
              loading="lazy"
              quality={60}
            />
            {item.motion ? <MotionMark /> : null}
          </div>
          <WallLabel
            title={item.title}
            caption=""
            kind={item.kind}
            seasonNumber={item.seasonNumber}
            day={item.day}
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

function SeasonsEmpty() {
  return (
    <div className="murals-empty-seasons">
      <div className="murals-empty-seasons__ghosts" aria-hidden="true">
        <div className="murals-ghost-frame" />
        <div className="murals-ghost-frame" />
        <div className="murals-ghost-frame" />
      </div>
      <p className="murals-empty-seasons__copy">
        The first season mural will appear here when the season ends.
      </p>
    </div>
  );
}

function KindGallery({
  tab,
  items,
  tabsSlot,
}: {
  tab: GalleryTab;
  items: PublicMural[];
  tabsSlot?: ReactNode;
}) {
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
    setView(readStoredView(tab));
    setGridCount(GRID_PAGE);
    setJumpValue("");
    setJumpError(null);

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
    setReady(false);
    onHydrate();
  }, [items, tab]);

  const selectId = useCallback(
    (id: string, opts?: { syncUrl?: boolean; scrollStrip?: boolean }) => {
      setSelectedId(id);
      setJumpError(null);
      if (opts?.syncUrl !== false) replaceQuery({ s: id });
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

  const setMode = useCallback(
    (mode: ViewMode) => {
      setView(mode);
      writeStoredView(tab, mode);
    },
    [tab]
  );

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
    if (!ready || view !== "timeline" || displayItems.length === 0) return;
    const strip = stripRef.current;
    if (!strip) return;

    updateStripOverflow();

    const onWheel = (e: WheelEvent) => {
      const overflows = strip.scrollWidth > strip.clientWidth + 2;
      if (!overflows) return;
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

  const showSeasonsEmpty = tab === "seasons" && displayItems.length === 0;
  const showMomentsEmpty = tab === "moments" && displayItems.length === 0;
  const gridVisible = displayItems.slice(0, gridCount);

  return (
    <div
      className={`murals-gallery${view === "timeline" ? " murals-gallery--timeline" : " murals-gallery--grid"}`}
    >
      <div className="murals-header">
        <h1 className="murals-heading">Murals</h1>
        {!showSeasonsEmpty && !showMomentsEmpty ? (
          <ViewToggle view={view} onChange={setMode} />
        ) : null}
      </div>

      {tabsSlot ? <div className="murals-tabs-mobile">{tabsSlot}</div> : null}

      {showSeasonsEmpty ? (
        <SeasonsEmpty />
      ) : showMomentsEmpty ? (
        <p className="murals-empty">No moments yet.</p>
      ) : view === "timeline" ? (
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
              <span className="murals-strip-header__label">
                {tab === "seasons" ? "Seasons" : "Moments"}
              </span>
              {tab === "seasons" ? (
                <form
                  className="murals-jump"
                  onSubmit={(e) => {
                    e.preventDefault();
                    jumpToSeason(jumpValue);
                  }}
                >
                  <label
                    className="murals-jump__label"
                    htmlFor="murals-jump-season"
                  >
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
                    aria-describedby={
                      jumpError ? "murals-jump-error" : undefined
                    }
                  />
                  {jumpError ? (
                    <span id="murals-jump-error" className="murals-jump__error">
                      {jumpError}
                    </span>
                  ) : null}
                </form>
              ) : null}
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
                aria-label={
                  tab === "seasons" ? "Season timeline" : "Moments timeline"
                }
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
                      aria-label={thumbAriaLabel(item, tab)}
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
                          imageUrl={item.imageUrl}
                          alt=""
                          sizes={`${THUMB_W}px`}
                          loading="lazy"
                          quality={40}
                        />
                        {item.motion ? <MotionMark /> : null}
                      </span>
                      {tab === "seasons" ? (
                        <span className="murals-strip__season">
                          {seasonShort(item.seasonNumber)}
                        </span>
                      ) : null}
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

export function MuralsGalleryClient({ items }: { items: PublicMural[] }) {
  const seasons = useMemo(
    () => sortSeasonMurals(items.filter((item) => item.kind === "season")),
    [items]
  );
  const moments = useMemo(
    () =>
      [...items.filter((item) => item.kind === "moment")].sort(
        (a, b) => b.createdAt - a.createdAt
      ),
    [items]
  );

  const [tab, setTab] = useState<GalleryTab>("seasons");
  const [ready, setReady] = useState(false);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const onHydrate = useEffectEvent(() => {
    const fromUrl = readQueryParam("tab");
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem("arena-murals-tab");
    } catch {
      /* ignore */
    }
    let next: GalleryTab;
    if (fromUrl === "seasons" || fromUrl === "moments") {
      next = fromUrl;
    } else if (stored === "seasons" || stored === "moments") {
      next = stored;
    } else if (seasons.length > 0) {
      next = "seasons";
    } else {
      next = "moments";
    }
    setTab(next);
    replaceQuery({ tab: next });
    setReady(true);
  });

  useEffect(() => {
    onHydrate();
  }, [seasons.length, moments.length]);

  const selectTab = useCallback((next: GalleryTab) => {
    setTab(next);
    replaceQuery({ tab: next, s: null });
  }, []);

  const activeItems = tab === "seasons" ? seasons : moments;

  const tabs = (
    <div
      className="murals-tabs__list"
      role="tablist"
      aria-label="Mural types"
    >
      <button
        type="button"
        role="tab"
        id="murals-tab-seasons"
        aria-selected={tab === "seasons"}
        aria-controls="murals-tabpanel"
        tabIndex={tab === "seasons" ? 0 : -1}
        className={`murals-tabs__tab${tab === "seasons" ? " is-active" : ""}`}
        onClick={() => selectTab("seasons")}
      >
        <span className="murals-tabs__name">Seasons</span>
        <span className="murals-tabs__count">{seasons.length}</span>
      </button>
      <button
        type="button"
        role="tab"
        id="murals-tab-moments"
        aria-selected={tab === "moments"}
        aria-controls="murals-tabpanel"
        tabIndex={tab === "moments" ? 0 : -1}
        className={`murals-tabs__tab${tab === "moments" ? " is-active" : ""}`}
        onClick={() => selectTab("moments")}
      >
        <span className="murals-tabs__name">Moments</span>
        <span className="murals-tabs__count">{moments.length}</span>
      </button>
    </div>
  );

  if (!ready) {
    return (
      <div className="murals-shell">
        <div className="murals-gallery">
          <div className="murals-header">
            <h1 className="murals-heading">Murals</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="murals-shell">
      {wide ? (
        <nav className="murals-tabs murals-tabs--side" aria-label="Mural types">
          {tabs}
        </nav>
      ) : null}

      <div
        className="murals-tabpanel"
        role="tabpanel"
        id="murals-tabpanel"
        aria-labelledby={
          tab === "seasons" ? "murals-tab-seasons" : "murals-tab-moments"
        }
      >
        <KindGallery
          key={tab}
          tab={tab}
          items={activeItems}
          tabsSlot={
            wide ? undefined : (
              <nav className="murals-tabs murals-tabs--top" aria-label="Mural types">
                {tabs}
              </nav>
            )
          }
        />
      </div>
    </div>
  );
}
