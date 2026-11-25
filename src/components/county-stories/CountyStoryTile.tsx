"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowUpRight, Compass, House, Landmark, Play } from "lucide-react";
import type { CountyStoryCountyVisual } from "@/lib/county-stories/county-covers";
import type { CountyStoryCard } from "@/lib/county-stories/viewer-model";
import { cn } from "@/lib/utils";
import styles from "./county-stories.module.css";

/** Tiles stop rotating after this many passes so the row settles. */
const MAX_PASSES = 3;

/** Rendered widths of the tile (`--cs-tile-w`) and the popup cover (`.sheet`) in the module CSS. */
const TILE_SIZES = "(min-width: 768px) 224px, (min-width: 389px) 280px, 72vw";
const WIDE_SIZES = "(min-width: 384px) 368px, calc(100vw - 16px)";

export function CountyStoryCategoryIcon({ type }: { type: CountyStoryCard["type"] }) {
  return type === "open_house_property" ? <House aria-hidden /> : <Compass aria-hidden />;
}

export function CountyStoryCover({
  county,
  imageClassName,
  wide = false,
}: {
  county: CountyStoryCountyVisual;
  imageClassName?: string;
  wide?: boolean;
}) {
  if (county.cover) {
    const file = wide ? county.cover.wide : county.cover.tile;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className={cn(styles.image, imageClassName)}
        src={file.src}
        srcSet={file.srcSet}
        sizes={wide ? WIDE_SIZES : TILE_SIZES}
        alt=""
        decoding="async"
        loading={wide ? "eager" : "lazy"}
        data-county-cover=""
      />
    );
  }
  const style = {
    "--cs-glow-x": `${county.glow.x}%`,
    "--cs-glow-y": `${county.glow.y}%`,
  } as CSSProperties;
  return (
    <span className={styles.cover} style={style} aria-hidden data-county-cover-fallback="">
      <Landmark className={styles.coverMark} />
    </span>
  );
}

export function CountyStoryAvatar({
  author,
  className,
}: {
  author: CountyStoryCard["author"];
  className: string;
}) {
  return (
    <span className={className} aria-hidden>
      {author.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={author.photoUrl} alt="" decoding="async" loading="lazy" />
      ) : (
        author.initials
      )}
    </span>
  );
}

function storyLabel(county: CountyStoryCountyVisual, story: CountyStoryCard, index: number, count: number) {
  const title = story.title ? `, ${story.title}` : "";
  return `Watch ${county.name} Stories. Story ${index + 1} of ${count}: ${story.category}${title}. By ${story.author.name}, ${story.author.roleLabel}.`;
}

export function CountyStoryTile({
  county,
  stories,
  reducedMotion,
  onOpenStory,
  onOpenProfile,
}: {
  county: CountyStoryCountyVisual;
  stories: CountyStoryCard[];
  reducedMotion: boolean;
  onOpenStory: (index: number, trigger: HTMLElement) => void;
  onOpenProfile: (trigger: HTMLElement) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [active, setActive] = useState(0);
  const [passes, setPasses] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const count = stories.length;
  const index = count ? Math.min(active, count - 1) : 0;
  const story = count ? stories[index] : undefined;
  const timed = count > 1 && !reducedMotion && passes < MAX_PASSES;
  const running = timed && visible && !hovered && !focused;

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!!entry && entry.intersectionRatio >= 0.6),
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!running) return;
    const upcoming = stories[(index + 1) % count];
    if (!upcoming?.posterUrl) return;
    const image = new Image();
    image.decoding = "async";
    image.src = upcoming.posterUrl;
  }, [running, index, count, stories]);

  function advance() {
    if (index + 1 >= count) {
      setActive(0);
      setPasses((value) => value + 1);
    } else {
      setActive(index + 1);
    }
  }

  const footer: ReactNode = (
    <>
      <span className={styles.footerText}>
        <span className={styles.footerName}>{county.shortName}</span>
        <span className={styles.footerSub}>County, Texas</span>
      </span>
      <ArrowUpRight className={styles.footerArrow} aria-hidden />
    </>
  );
  const profileLabel = `${county.name}, Texas. Open county profile`;

  if (!story) {
    return (
      <li
        ref={ref}
        className={styles.tile}
        data-county-story-tile=""
        data-county={county.slug}
        data-story-count={0}
      >
        <button
          type="button"
          className={styles.tileButton}
          aria-label={profileLabel}
          data-home-county-card=""
          data-home-county={county.slug}
          onClick={(event) => onOpenProfile(event.currentTarget)}
        >
          <span className={cn(styles.media, styles.mediaStatic)}>
            <CountyStoryCover county={county} />
          </span>
          <span className={styles.footer}>{footer}</span>
        </button>
      </li>
    );
  }

  return (
    <li
      ref={ref}
      className={styles.tile}
      data-county-story-tile=""
      data-county={county.slug}
      data-story-count={count}
      data-active-story={story.id}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setHovered(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setHovered(false);
      }}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
    >
      <button
        type="button"
        className={styles.media}
        aria-label={storyLabel(county, story, index, count)}
        data-county-story-media=""
        onClick={(event) => onOpenStory(index, event.currentTarget)}
      >
        {story.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={story.id}
            className={styles.image}
            src={story.posterUrl}
            alt=""
            decoding="async"
            loading="lazy"
          />
        ) : (
          <CountyStoryCover county={county} />
        )}
        <span className={styles.shade} aria-hidden />
        <span className={styles.chip} aria-hidden data-county-story-category="">
          <CountyStoryCategoryIcon type={story.type} />
          <span className={styles.chipLabel}>{story.category}</span>
        </span>
        <span className={styles.play} aria-hidden>
          <Play />
        </span>
        <span className={styles.body} aria-hidden>
          {story.title ? (
            <span className={styles.title} data-county-story-title="">
              {story.title}
            </span>
          ) : null}
          <span className={styles.author} data-county-story-author="">
            <CountyStoryAvatar author={story.author} className={styles.avatar} />
            <span className={styles.authorText}>
              <span className={styles.authorName}>{story.author.name}</span>
              <span className={styles.authorRole}> · {story.author.roleLabel}</span>
            </span>
          </span>
          <span className={styles.progress} data-county-story-progress="">
            {stories.map((item, i) => (
              <span
                key={item.id}
                className={cn(
                  styles.segment,
                  i < index && styles.segmentDone,
                  i === index && styles.segmentActive,
                  i === index && timed && styles.segmentTimed,
                  i === index && timed && !running && styles.segmentPaused,
                )}
              >
                <span
                  className={styles.segmentFill}
                  onAnimationEnd={i === index && timed ? advance : undefined}
                />
              </span>
            ))}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={styles.footer}
        aria-label={profileLabel}
        data-home-county-card=""
        data-home-county={county.slug}
        onClick={(event) => onOpenProfile(event.currentTarget)}
      >
        {footer}
      </button>
    </li>
  );
}
