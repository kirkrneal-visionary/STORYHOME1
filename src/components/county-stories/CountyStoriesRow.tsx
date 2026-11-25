"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { COUNTY_STORY_COUNTIES } from "@/lib/county-stories/county-covers";
import type { CountyStoryCard } from "@/lib/county-stories/viewer-model";
import { CountyProfileSheet } from "./CountyProfileSheet";
import { CountyStoryTile } from "./CountyStoryTile";
import { CountyStoryViewer } from "./CountyStoryViewer";
import { useCountyStoryReducedMotion } from "./useCountyStoryModal";
import styles from "./county-stories.module.css";

const FEED_URL = "/api/county-stories/feed";
const FEED_STALE_MS = 10 * 60 * 1000;
const NO_STORIES: CountyStoryCard[] = [];

type Overlay =
  | { kind: "profile"; fips: string }
  | { kind: "viewer"; fips: string; index: number; stories: CountyStoryCard[] }
  | null;

function isCard(value: unknown): value is CountyStoryCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Partial<CountyStoryCard>;
  return (
    typeof card.id === "string" &&
    (card.type === "local_knowledge" || card.type === "open_house_property") &&
    typeof card.category === "string" &&
    typeof card.author?.name === "string" &&
    card.author.name.trim().length > 0 &&
    typeof card.author.roleLabel === "string"
  );
}

function readFeed(body: unknown): Map<string, CountyStoryCard[]> | null {
  if (!body || typeof body !== "object" || (body as { ok?: unknown }).ok !== true) return null;
  const counties = (body as { counties?: unknown }).counties;
  if (!Array.isArray(counties)) return null;
  const byCounty = new Map<string, CountyStoryCard[]>();
  for (const county of counties) {
    if (!county || typeof county.fips !== "string" || !Array.isArray(county.stories)) continue;
    byCounty.set(county.fips, county.stories.filter(isCard));
  }
  return byCounty;
}

export function CountyStoriesRow() {
  const headingId = useId();
  const scrollerId = useId();
  const reducedMotion = useCountyStoryReducedMotion();
  const scrollerRef = useRef<HTMLUListElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const loadedAtRef = useRef(0);
  const [storiesByCounty, setStoriesByCounty] = useState<Map<string, CountyStoryCard[]>>(
    () => new Map(),
  );
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    let controller: AbortController | null = null;
    const load = () => {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      fetch(FEED_URL, { cache: "no-store", signal: request.signal })
        .then((response) => (response.ok ? response.json() : null))
        .then((body) => {
          const feed = readFeed(body);
          if (!feed || request.signal.aborted) return;
          loadedAtRef.current = Date.now();
          setStoriesByCounty(feed);
        })
        .catch(() => {});
    };
    const onVisibility = () => {
      if (!document.hidden && Date.now() - loadedAtRef.current > FEED_STALE_MS) load();
    };
    load();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const updateEdges = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const max = scroller.scrollWidth - scroller.clientWidth;
    const atStart = scroller.scrollLeft <= 4;
    const atEnd = scroller.scrollLeft >= max - 4;
    setEdges((previous) =>
      previous.atStart === atStart && previous.atEnd === atEnd ? previous : { atStart, atEnd },
    );
  }, []);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const frame = requestAnimationFrame(updateEdges);
    scroller.addEventListener("scroll", updateEdges, { passive: true });
    const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateEdges);
    resize?.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", updateEdges);
      resize?.disconnect();
    };
  }, [updateEdges]);

  function page(direction: 1 | -1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.8, 200),
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  const close = useCallback(() => {
    setOverlay(null);
    const target = returnFocusRef.current;
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus({ preventScroll: true });
    });
  }, []);

  const openProfile = useCallback((fips: string, trigger: HTMLElement) => {
    returnFocusRef.current = trigger;
    setOverlay({ kind: "profile", fips });
  }, []);

  const openStory = useCallback(
    (fips: string, index: number, trigger: HTMLElement | null) => {
      const stories = storiesByCounty.get(fips) ?? NO_STORIES;
      if (stories.length === 0) return;
      if (trigger) returnFocusRef.current = trigger;
      setOverlay({
        kind: "viewer",
        fips,
        index: Math.min(Math.max(index, 0), stories.length - 1),
        stories,
      });
    },
    [storiesByCounty],
  );

  const overlayCounty = overlay
    ? COUNTY_STORY_COUNTIES.find((county) => county.fips === overlay.fips)
    : undefined;

  return (
    <section className={styles.section} aria-labelledby={headingId} data-county-stories-row="">
      <div className={styles.header}>
        <h2 id={headingId} className={styles.heading}>
          County Stories
        </h2>
        <div className={styles.arrows}>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Show earlier counties"
            aria-controls={scrollerId}
            disabled={edges.atStart}
            onClick={() => page(-1)}
            data-county-stories-prev=""
          >
            <ChevronLeft aria-hidden />
          </button>
          <button
            type="button"
            className={styles.arrow}
            aria-label="Show more counties"
            aria-controls={scrollerId}
            disabled={edges.atEnd}
            onClick={() => page(1)}
            data-county-stories-next=""
          >
            <ChevronRight aria-hidden />
          </button>
        </div>
      </div>
      <div className={styles.viewport}>
        <ul id={scrollerId} ref={scrollerRef} className={styles.scroller}>
          {COUNTY_STORY_COUNTIES.map((county) => (
            <CountyStoryTile
              key={county.fips}
              county={county}
              stories={storiesByCounty.get(county.fips) ?? NO_STORIES}
              reducedMotion={reducedMotion}
              onOpenStory={(index, trigger) => openStory(county.fips, index, trigger)}
              onOpenProfile={(trigger) => openProfile(county.fips, trigger)}
            />
          ))}
        </ul>
      </div>
      {overlay?.kind === "profile" && overlayCounty ? (
        <CountyProfileSheet
          county={overlayCounty}
          storyCount={(storiesByCounty.get(overlay.fips) ?? NO_STORIES).length}
          onClose={close}
          onWatch={() => openStory(overlay.fips, 0, null)}
        />
      ) : null}
      {overlay?.kind === "viewer" && overlayCounty ? (
        <CountyStoryViewer
          county={overlayCounty}
          stories={overlay.stories}
          startIndex={overlay.index}
          onClose={close}
        />
      ) : null}
    </section>
  );
}
