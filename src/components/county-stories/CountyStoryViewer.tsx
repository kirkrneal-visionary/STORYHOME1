"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowUpRight,
  Captions,
  CaptionsOff,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { CountyStoryCountyVisual } from "@/lib/county-stories/county-covers";
import {
  countyStoryCaptionAt,
  type CountyStoryCaptionCue,
  type CountyStoryCard,
  type CountyStoryPlayback,
} from "@/lib/county-stories/viewer-model";
import { cn } from "@/lib/utils";
import { attachStorySource, type DetachStorySource } from "./attach-story-source";
import { CountyStoryAvatar, CountyStoryCategoryIcon } from "./CountyStoryTile";
import { useCountyStoryModal } from "./useCountyStoryModal";
import styles from "./county-stories.module.css";

function readCues(value: unknown): CountyStoryCaptionCue[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (cue): cue is CountyStoryCaptionCue =>
      !!cue &&
      typeof cue.startMs === "number" &&
      typeof cue.endMs === "number" &&
      typeof cue.text === "string",
  );
}

async function fetchPlayback(id: string): Promise<CountyStoryPlayback | null> {
  try {
    const response = await fetch(`/api/county-stories/feed/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.ok !== true || typeof body.playbackUrl !== "string") {
      return null;
    }
    return {
      ok: true,
      id,
      playbackUrl: body.playbackUrl,
      posterUrl: typeof body.posterUrl === "string" ? body.posterUrl : null,
      durationMs: typeof body.durationMs === "number" ? body.durationMs : null,
      captions: readCues(body.captions),
      description: typeof body.description === "string" ? body.description : null,
    };
  } catch {
    return null;
  }
}

export function CountyStoryViewer({
  county,
  stories,
  startIndex,
  onClose,
}: {
  county: CountyStoryCountyVisual;
  stories: CountyStoryCard[];
  startIndex: number;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const cacheRef = useRef(new Map<string, Promise<CountyStoryPlayback | null>>());
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const [index, setIndex] = useState(() => Math.min(Math.max(startIndex, 0), stories.length - 1));
  const [loaded, setLoaded] = useState<{ id: string; playback: CountyStoryPlayback | null } | null>(
    null,
  );
  const [failedId, setFailedId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [muted, setMuted] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [caption, setCaption] = useState<string | null>(null);
  const [frame, setFrame] = useState<{ id: string; portrait: boolean } | null>(null);

  const count = stories.length;
  const story = stories[index]!;
  const current = loaded?.id === story.id ? loaded : null;
  const playback = current?.playback ?? null;
  const status: "loading" | "ready" | "error" =
    failedId === story.id || (current && !playback) ? "error" : playback ? "ready" : "loading";
  const playbackUrl = status === "ready" ? playback!.playbackUrl : null;
  const poster = playback?.posterUrl ?? story.posterUrl;
  const fit = frame?.id === story.id && !frame.portrait ? "contain" : "cover";
  const readFrame = (width: number, height: number) => {
    if (width > 0 && height > 0) setFrame({ id: story.id, portrait: width / height <= 0.8 });
  };

  useCountyStoryModal(dialogRef, onClose);

  const getPlayback = useCallback((id: string) => {
    let pending = cacheRef.current.get(id);
    if (!pending) {
      pending = fetchPlayback(id).then((result) => {
        if (!result) cacheRef.current.delete(id);
        return result;
      });
      cacheRef.current.set(id, pending);
    }
    return pending;
  }, []);

  useEffect(() => {
    let alive = true;
    void getPlayback(story.id).then((result) => {
      if (!alive) return;
      setLoaded({ id: story.id, playback: result });
      const upcoming = stories[index + 1];
      if (result && upcoming) void getPlayback(upcoming.id);
    });
    return () => {
      alive = false;
    };
  }, [story.id, index, stories, getPlayback]);

  const mutedRef = useRef(muted);
  useEffect(() => {
    mutedRef.current = muted;
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) return;
    const storyId = story.id;
    let alive = true;
    let detach: DetachStorySource | null = null;
    video.muted = mutedRef.current;
    attachStorySource(video, playbackUrl, () => {
      if (alive) setFailedId(storyId);
    })
      .then((detachSource) => {
        if (!alive) {
          detachSource();
          return;
        }
        detach = detachSource;
        video.play().catch(() => {
          if (alive) setBlocked(true);
        });
      })
      .catch(() => {
        if (alive) setFailedId(storyId);
      });
    return () => {
      alive = false;
      video.pause();
      detach?.();
    };
  }, [playbackUrl, story.id]);

  const cues = playback?.captions;
  const durationMs = playback?.durationMs ?? null;
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let frame = 0;
    const tick = () => {
      const duration =
        Number.isFinite(video.duration) && video.duration > 0
          ? video.duration
          : (durationMs ?? 0) / 1000;
      const progress = duration > 0 ? Math.min(1, video.currentTime / duration) : 0;
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${progress})`;
      const text = cues ? countyStoryCaptionAt(cues, video.currentTime * 1000) : null;
      setCaption((previous) => (previous === text ? previous : text));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cues, durationMs]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) videoRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const goTo = useCallback(
    (target: number) => {
      if (target >= count) {
        onClose();
        return;
      }
      const next = Math.max(0, target);
      if (next === index) {
        const video = videoRef.current;
        if (video && status === "ready") {
          video.currentTime = 0;
          video.play().catch(() => setBlocked(true));
        }
        return;
      }
      setIndex(next);
      setCaption(null);
      setPaused(false);
      setBlocked(false);
      setBuffering(true);
    },
    [count, index, onClose, status],
  );
  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const previous = useCallback(() => goTo(index - 1), [goTo, index]);

  const togglePause = useCallback(() => {
    const video = videoRef.current;
    if (!video || status !== "ready") return;
    if (video.paused) {
      video
        .play()
        .then(() => setBlocked(false))
        .catch(() => setBlocked(true));
    } else {
      video.pause();
    }
  }, [status]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    const nextMuted = !mutedRef.current;
    if (video) {
      video.muted = nextMuted;
      if (!nextMuted && video.paused && status === "ready") {
        video
          .play()
          .then(() => setBlocked(false))
          .catch(() => setBlocked(true));
      }
    }
    setMuted(nextMuted);
  }, [status]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const onControl = !!(event.target as HTMLElement | null)?.closest?.("button, a");
      switch (event.key) {
        case "ArrowRight":
          event.preventDefault();
          next();
          break;
        case "ArrowLeft":
          event.preventDefault();
          previous();
          break;
        case " ":
          if (onControl) return;
          event.preventDefault();
          togglePause();
          break;
        case "k":
        case "K":
          event.preventDefault();
          togglePause();
          break;
        case "m":
        case "M":
          event.preventDefault();
          toggleMute();
          break;
        case "c":
        case "C":
          event.preventDefault();
          setCaptionsOn((value) => !value);
          break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, previous, togglePause, toggleMute]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (dy > 90 && Math.abs(dx) < 70) onClose();
  };

  const author = story.author;
  const announcement = `Story ${index + 1} of ${count}. ${story.category}${
    story.title ? `: ${story.title}` : ""
  }. By ${author.name}, ${author.roleLabel}${
    author.brokerageName ? `, ${author.brokerageName}` : ""
  }.`;

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className={styles.viewer}
      data-county-story-viewer=""
      data-county={county.slug}
      data-story-id={story.id}
      data-story-status={status}
    >
      <h2 id={titleId} className={styles.srOnly}>
        {county.name} Stories
      </h2>
      <button
        type="button"
        className={styles.sideNav}
        aria-hidden
        tabIndex={-1}
        disabled={index === 0}
        onClick={previous}
      >
        <ChevronLeft />
      </button>
      <div
        className={styles.stage}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipeRef.current = null;
        }}
      >
        {poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.stagePoster}
            src={poster}
            alt=""
            aria-hidden
            decoding="async"
            data-fit={fit}
            onLoad={(event) => readFrame(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
          />
        ) : null}
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          muted
          preload="auto"
          data-fit={fit}
          aria-label={`${story.category} Story by ${author.name}`}
          aria-describedby={descriptionId}
          onLoadedMetadata={(event) => readFrame(event.currentTarget.videoWidth, event.currentTarget.videoHeight)}
          onEnded={next}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => {
            setBuffering(false);
            setBlocked(false);
          }}
          onPlay={() => setPaused(false)}
          onPause={(event) => {
            if (!event.currentTarget.ended) setPaused(true);
          }}
          onError={() => {
            if (playbackUrl) setFailedId(story.id);
          }}
        />
        <p id={descriptionId} className={styles.srOnly}>
          {playback?.description ?? "Captions appear on screen."}
        </p>

        <div className={styles.top}>
          <div className={styles.bars} aria-hidden data-county-story-bars="">
            {stories.map((item, i) => (
              <span key={item.id} className={cn(styles.bar, i < index && styles.barDone)}>
                <span
                  ref={i === index ? fillRef : undefined}
                  className={styles.barFill}
                  style={
                    i < index
                      ? { transform: "scaleX(1)" }
                      : i > index
                        ? { transform: "scaleX(0)" }
                        : undefined
                  }
                />
              </span>
            ))}
          </div>
          <div className={styles.meta}>
            <span>{county.name}, Texas</span>
            <span>
              {index + 1} of {count}
            </span>
          </div>
          <div className={styles.headerRow}>
            <CountyStoryAvatar author={author} className={styles.viewerAvatar} />
            <div className={styles.who} data-county-story-author="">
              <p className={styles.whoLine}>
                <Link href={author.profileHref} className={styles.whoName}>
                  {author.name}
                </Link>
              </p>
              <p className={cn(styles.whoLine, styles.whoRole)}>
                {author.roleLabel}
                {author.brokerageName ? ` · ${author.brokerageName}` : ""}
              </p>
            </div>
            <div className={styles.controls}>
              <button
                type="button"
                className={styles.control}
                aria-label="Captions"
                aria-pressed={captionsOn}
                onClick={() => setCaptionsOn((value) => !value)}
              >
                {captionsOn ? <Captions aria-hidden /> : <CaptionsOff aria-hidden />}
              </button>
              <button
                type="button"
                className={styles.control}
                aria-label={muted ? "Turn sound on" : "Turn sound off"}
                onClick={toggleMute}
              >
                {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
              </button>
              <button
                type="button"
                className={styles.control}
                aria-label={paused ? "Play" : "Pause"}
                onClick={togglePause}
              >
                {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
              </button>
              <button
                type="button"
                className={styles.control}
                aria-label="Close stories"
                onClick={onClose}
              >
                <X aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={cn(styles.zone, styles.zonePrev)}
          aria-label="Previous story"
          onClick={previous}
        />
        <button
          type="button"
          className={cn(styles.zone, styles.zoneNext)}
          aria-label="Next story"
          onClick={next}
        />

        {status === "error" ? (
          <div className={styles.center} role="alert">
            <p>This Story can’t play right now.</p>
            <button type="button" className={styles.retry} onClick={next}>
              {index + 1 < count ? "Next story" : "Close"}
            </button>
          </div>
        ) : blocked ? (
          <div className={styles.center}>
            <button type="button" className={styles.retry} onClick={togglePause}>
              Play story
            </button>
          </div>
        ) : status === "loading" || (buffering && !paused) ? (
          <div className={styles.center} aria-hidden>
            <span className={styles.spinner} />
          </div>
        ) : paused ? (
          <div className={styles.center} aria-hidden>
            <span className={styles.pausedGlyph}>
              <Play />
            </span>
          </div>
        ) : null}

        <div className={styles.bottom}>
          {captionsOn && caption ? (
            <p className={styles.caption} data-county-story-caption="">
              {caption}
            </p>
          ) : null}
          <span className={styles.viewerChip}>
            <CountyStoryCategoryIcon type={story.type} />
            {story.category}
          </span>
          {story.title ? <p className={styles.viewerTitle}>{story.title}</p> : null}
          {story.listing ? (
            <Link href={story.listing.href} className={styles.inlineLink}>
              View property
              <ArrowUpRight aria-hidden />
            </Link>
          ) : null}
        </div>
        <p className={styles.srOnly} aria-live="polite">
          {announcement}
        </p>
      </div>
      <button
        type="button"
        className={styles.sideNav}
        aria-hidden
        tabIndex={-1}
        onClick={next}
      >
        <ChevronRight />
      </button>
    </div>,
    document.body,
  );
}
