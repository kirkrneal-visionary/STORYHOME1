"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  COUNTY_STORY_CAMERA_MAX_SEC,
  COUNTY_STORY_CAMERA_PREVIEW_FIT,
  countyStoryCameraClock,
  countyStoryCameraDeniedCopy,
  countyStoryCameraOtherFacing,
  countyStoryCameraPreferNaturalFrame,
  countyStoryCameraRequest,
  countyStoryCameraReviewLabel,
  countyStoryCameraShouldStop,
  countyStoryCameraSwitchCopy,
  countyStoryCameraUnsupportedCopy,
  countyStoryZoomFromPinch,
  countyStoryZoomLabel,
  countyStoryZoomRange,
  countyStoryZoomStops,
  snapZoom,
  type CountyStoryCameraFacing,
  type CountyStoryZoomRange,
} from "@/lib/county-stories/camera-capture";
import { CountyStoryBackgroundComparison } from "@/components/county-stories/CountyStoryBackground";
import { deleteLocalSegment, putLocalSegment } from "@/lib/county-stories/local-segments";
import {
  COUNTY_STORY_CAPTURE_BUDGET_MS,
  activeClipStopMs,
  remainingSegmentMs,
  usedSegmentMs,
} from "@/lib/county-stories/segment-timeline";

export type CountyStoryCapturedClip = {
  id: string;
  file: File;
  url: string;
  durationMs: number;
  facing: CountyStoryCameraFacing;
};

type Phase = "live" | "recording" | "review" | "preparing" | "denied" | "unsupported" | "leave";

const frameClass = "h-full w-full bg-black object-contain";

function preferredMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
  if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
  return "";
}

function fileExtension(mime: string): string {
  return mime.includes("mp4") ? "mp4" : "webm";
}

function pinchDistance(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M7 7l10 10M17 7L7 17" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function SwitchCameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M7 7h11M15 4l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 17H6M9 14l-3 3 3 3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M9 7.5v9l8-4.5-8-4.5z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M8 7h2.5v10H8zM13.5 7H16v10h-2.5z" fill="currentColor" />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
      <path d="M7.5 12a4.5 4.5 0 1 0 1.1-3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <path d="M7 5.8V9h3.2" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const iconButtonClass =
  "flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] disabled:opacity-40";

export function CountyStoryPreparing() {
  return (
    <section
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-black px-6 text-center text-white"
      data-county-story-processing
    >
      <h2 className="text-xl font-semibold tracking-[-0.02em]">Preparing your Story</h2>
      <p className="mt-2 text-base text-white/80" role="status">
        This usually takes a moment.
      </p>
    </section>
  );
}

function CountyStoryTakeReview({
  url,
  showActions,
  onRetake,
  onUse,
}: {
  url: string;
  showActions: boolean;
  onRetake: () => void;
  onUse: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [canScrub, setCanScrub] = useState(false);

  const refresh = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const nextDuration = video.duration;
    const finite = Number.isFinite(nextDuration) && nextDuration > 0;
    setDuration(finite ? nextDuration : 0);
    setCanScrub(finite && video.seekable.length > 0);
    setCurrent(video.currentTime || 0);
  }, []);

  useEffect(() => {
    if (showActions) return;
    videoRef.current?.pause();
  }, [showActions]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  };

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  };

  return (
    <div className="absolute inset-0 z-[1] flex flex-col bg-black" data-county-story-camera-review>
      <video
        ref={videoRef}
        className="min-h-0 w-full flex-1 bg-black object-contain"
        src={url}
        playsInline
        preload="auto"
        data-county-story-camera-take
        data-county-story-camera-fit={COUNTY_STORY_CAMERA_PREVIEW_FIT}
        onClick={showActions ? toggle : undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={refresh}
        onLoadedMetadata={refresh}
        onDurationChange={refresh}
        onCanPlay={refresh}
      />
      {showActions ? (
        <div className="flex flex-col gap-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
          <p className="text-center text-base tabular-nums" data-county-story-camera-review-time>
            {countyStoryCameraReviewLabel(current)}
          </p>
          {canScrub ? (
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={Math.min(current, duration)}
              aria-label="Scrub video"
              data-county-story-camera-scrub
              className="w-full accent-[var(--gold)]"
              onChange={(event) => {
                const video = videoRef.current;
                if (!video) return;
                const next = Number(event.target.value);
                video.currentTime = next;
                setCurrent(next);
              }}
            />
          ) : null}
          <div className="flex items-center justify-center gap-6">
            <button type="button" className={iconButtonClass} onClick={toggle} data-county-story-camera-play aria-label={playing ? "Pause" : "Play"}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button type="button" className={iconButtonClass} onClick={replay} data-county-story-camera-replay aria-label="Replay">
              <ReplayIcon />
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              className="story-press min-h-12 flex-1 rounded-md border border-white/40 text-base font-semibold text-white"
              data-county-story-camera-retake
              onClick={onRetake}
            >
              Retake
            </button>
            <button type="button" className="story-press story-cta-primary flex-1" data-county-story-camera-use onClick={onUse}>
              Use Video
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CountyStoryPlaylist({
  clips,
  onRetake,
  onUse,
}: {
  clips: CountyStoryCapturedClip[];
  onRetake: () => void;
  onUse: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState(0);
  const clip = clips[index] ?? clips[0];
  const totalSec = clips.reduce((sum, item) => sum + item.durationMs, 0) / 1000;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => undefined);
  }, [index, clip?.url]);

  if (!clip) return null;
  return (
    <div className="absolute inset-0 z-[1] flex flex-col bg-black" data-county-story-camera-story>
      <video
        ref={videoRef}
        key={clip.id}
        className="min-h-0 w-full flex-1 bg-black object-contain"
        playsInline
        src={clip.url}
        onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
        onEnded={() => {
          if (index < clips.length - 1) setIndex(index + 1);
        }}
      />
      <div className="flex flex-col gap-3 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <p className="text-center text-sm tabular-nums">{countyStoryCameraReviewLabel(Math.min(totalSec, current))}</p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" className={iconButtonClass} data-county-story-camera-play aria-label="Play Story" onClick={() => void videoRef.current?.play()}>
            <PlayIcon />
          </button>
          <button
            type="button"
            className={iconButtonClass}
            data-county-story-camera-replay
            aria-label="Replay"
            onClick={() => {
              setIndex(0);
              const video = videoRef.current;
              if (!video) return;
              video.currentTime = 0;
              void video.play();
            }}
          >
            <ReplayIcon />
          </button>
        </div>
        <input
          className="w-full accent-[var(--gold)]"
          type="range"
          min={0}
          max={Math.max(totalSec, 0.1)}
          step={0.1}
          value={Math.min(current, totalSec)}
          data-county-story-camera-scrub
          aria-label="Story position"
          onChange={(event) => {
            const video = videoRef.current;
            if (!video) return;
            video.currentTime = Number(event.target.value);
          }}
        />
        <button type="button" className="story-press min-h-11 text-base font-semibold text-white underline" onClick={onRetake}>
          Retake
        </button>
        <button type="button" className="story-press story-cta-primary w-full" onClick={onUse}>
          Use Story
        </button>
      </div>
    </div>
  );
}

export function CountyStoryCamera({
  replacement = false,
  forceDenied = false,
  ownerId = null,
  onClose,
  onUse,
  onUseStory,
  onUpload,
}: {
  replacement?: boolean;
  forceDenied?: boolean;
  ownerId?: string | null;
  onClose: () => void;
  onUse: (file: File) => void;
  onUseStory?: (clips: CountyStoryCapturedClip[]) => void;
  onUpload: (file: File) => void;
}) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const takeUrlRef = useRef<string | null>(null);
  const clipsRef = useRef<CountyStoryCapturedClip[]>([]);
  const flipAfterStopRef = useRef(false);
  const zoomRef = useRef<number | null>(null);
  const applyZoomRef = useRef<(value: number) => Promise<void>>(async () => undefined);
  const [facing, setFacing] = useState<CountyStoryCameraFacing>("environment");
  const [phase, setPhase] = useState<Phase>("live");
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const [takeFile, setTakeFile] = useState<File | null>(null);
  const [clips, setClips] = useState<CountyStoryCapturedClip[]>([]);
  const [opening, setOpening] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [zoomRange, setZoomRange] = useState<CountyStoryZoomRange | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [trackSize, setTrackSize] = useState<{ width: number | null; height: number | null }>({ width: null, height: null });

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const forgetTake = useCallback(() => {
    if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    takeUrlRef.current = null;
    setTakeUrl(null);
    setTakeFile(null);
  }, []);

  const attachPreview = useCallback((stream: MediaStream) => {
    const video = previewRef.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, []);

  const readTrack = useCallback((stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) {
      setZoomRange(null);
      setZoom(null);
      zoomRef.current = null;
      setTrackSize({ width: null, height: null });
      return;
    }
    const settings = track.getSettings() as MediaTrackSettings & { zoom?: number };
    const caps = (track.getCapabilities?.() ?? {}) as { zoom?: { min?: number; max?: number; step?: number } };
    const range = countyStoryZoomRange(caps);
    const current = typeof settings.zoom === "number" ? settings.zoom : range?.min ?? null;
    setTrackSize({
      width: typeof settings.width === "number" ? settings.width : null,
      height: typeof settings.height === "number" ? settings.height : null,
    });
    setZoomRange(range);
    setZoom(current);
    zoomRef.current = current;
  }, []);

  const applyZoom = useCallback(async (value: number) => {
    const track = streamRef.current?.getVideoTracks()[0];
    const range = zoomRange;
    if (!track || !range) return;
    const next = snapZoom(value, range);
    if (zoomRef.current != null && Math.abs(zoomRef.current - next) < 0.001) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: next }] } as unknown as MediaTrackConstraints);
      const settings = track.getSettings() as MediaTrackSettings & { zoom?: number };
      const applied = typeof settings.zoom === "number" ? settings.zoom : next;
      zoomRef.current = applied;
      setZoom(applied);
    } catch {
      /* This camera refused the zoom step. Leave the current frame. */
    }
  }, [zoomRange]);

  applyZoomRef.current = applyZoom;

  const openCamera = useCallback(
    async (nextFacing: CountyStoryCameraFacing) => {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setPhase("unsupported");
        setOpening(false);
        return;
      }
      setNotice(null);
      setOpening(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(countyStoryCameraRequest(nextFacing));
        const track = stream.getVideoTracks()[0];
        if (track) await countyStoryCameraPreferNaturalFrame(track);
        stopTracks();
        streamRef.current = stream;
        setFacing(nextFacing);
        readTrack(stream);
        setPhase((current) => (current === "recording" || current === "review" || current === "leave" || current === "preparing" ? current : "live"));
        setOpening(false);
        attachPreview(stream);
      } catch {
        setOpening(false);
        if (!streamRef.current) setPhase("denied");
        else setNotice(countyStoryCameraSwitchCopy());
      }
    },
    [attachPreview, readTrack, stopTracks],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (forceDenied) {
      setPhase("denied");
      setOpening(false);
      return;
    }
    void openCamera("environment");
    return () => {
      clearTimer();
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try {
          recorderRef.current.stop();
        } catch {
          /* already stopped */
        }
      }
      stopTracks();
      if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
    };
  }, [clearTimer, forceDenied, mounted, openCamera, stopTracks]);

  useEffect(() => {
    if (phase === "live" && streamRef.current) attachPreview(streamRef.current);
  }, [attachPreview, phase]);

  useEffect(() => {
    const video = previewRef.current;
    if (!video || !zoomRange || (phase !== "live" && phase !== "recording")) return;
    let startDistance = 0;
    let startZoom = zoomRef.current ?? zoomRange.min;
    const onStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      startDistance = pinchDistance(event.touches);
      startZoom = zoomRef.current ?? zoomRange.min;
    };
    const onMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !(startDistance > 0)) return;
      event.preventDefault();
      const next = countyStoryZoomFromPinch(startZoom, startDistance, pinchDistance(event.touches), zoomRange);
      void applyZoomRef.current(next);
    };
    video.addEventListener("touchstart", onStart, { passive: true });
    video.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      video.removeEventListener("touchstart", onStart);
      video.removeEventListener("touchmove", onMove);
    };
  }, [phase, zoomRange]);

  const finishRecording = useCallback(() => {
    if (stoppingRef.current) return;
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    stoppingRef.current = true;
    clearTimer();
    try {
      recorder.stop();
    } catch {
      setPhase("review");
    }
  }, [clearTimer]);

  useEffect(() => {
    const stopHiddenClip = () => {
      if (document.visibilityState === "hidden") finishRecording();
    };
    const stopOnPageHide = () => finishRecording();
    document.addEventListener("visibilitychange", stopHiddenClip);
    window.addEventListener("pagehide", stopOnPageHide);
    return () => {
      document.removeEventListener("visibilitychange", stopHiddenClip);
      window.removeEventListener("pagehide", stopOnPageHide);
    };
  }, [finishRecording]);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setPhase("unsupported");
      return;
    }
    if (remainingSegmentMs(clipsRef.current) <= 0) return;
    chunksRef.current = [];
    const mime = preferredMime();
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    stoppingRef.current = false;
    recorderRef.current = recorder;
    const budgetMs = activeClipStopMs(clipsRef.current);
    const startedFacing = facing;
    const started = Date.now();
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mime || "video/webm";
      const durationMs = Math.min(budgetMs, Math.max(1, Math.round((Date.now() - started) )));
      const blob = new Blob(chunksRef.current, { type });
      const file = new File([blob], `county-story-${clipsRef.current.length + 1}.${fileExtension(type)}`, { type });
      const url = URL.createObjectURL(blob);
      const clip: CountyStoryCapturedClip = {
        id: crypto.randomUUID(),
        file,
        url,
        durationMs,
        facing: startedFacing,
      };
      const next = [...clipsRef.current, clip];
      clipsRef.current = next;
      setClips(next);
      setTakeFile(file);
      setTakeUrl(url);
      if (ownerId) {
        void putLocalSegment({
          ownerId,
          segmentId: clip.id,
          position: next.length - 1,
          durationMs,
          facing: startedFacing,
          remoteStored: false,
          muxAccepted: false,
          blob,
        }).then((saved) => {
          if (saved === "quota") {
            setNotice("This phone is low on space. Clips that are already uploaded can be removed from the phone. Unsaved clips may need to be recorded again.");
          } else if (saved === "unavailable") {
            setNotice("This browser cannot keep the clips after you leave this page.");
          }
        });
      }
      setPhase("live");
      if (flipAfterStopRef.current) {
        flipAfterStopRef.current = false;
        void openCamera(countyStoryCameraOtherFacing(startedFacing));
      }
    };
    recorder.start(250);
    setElapsed(0);
    setPhase("recording");
    setNotice(null);
    timerRef.current = window.setInterval(() => {
      const elapsedMs = Date.now() - started;
      setElapsed(elapsedMs / 1000);
      if (elapsedMs >= budgetMs) finishRecording();
    }, 200);
  }, [facing, finishRecording, openCamera, ownerId]);

  const requestClose = () => {
    if (phase === "preparing") return;
    if (phase === "recording") {
      finishRecording();
      return;
    }
    if (phase === "review" || phase === "leave" || takeFile) {
      setPhase("leave");
      return;
    }
    stopTracks();
    onClose();
  };

  const releaseClip = (clip: CountyStoryCapturedClip) => {
    URL.revokeObjectURL(clip.url);
    void deleteLocalSegment(clip.id);
  };

  const dropLastClip = () => {
    const next = clipsRef.current.slice(0, -1);
    const removed = clipsRef.current[clipsRef.current.length - 1];
    if (removed) releaseClip(removed);
    clipsRef.current = next;
    setClips(next);
    setElapsed(0);
    setPhase("live");
    if (streamRef.current) attachPreview(streamRef.current);
    else void openCamera(facing);
  };

  const retake = () => {
    dropLastClip();
  };

  const useTake = () => {
    const ready = clipsRef.current;
    if (!ready.length) return;
    stopTracks();
    setPhase("preparing");
    if (onUseStory) onUseStory(ready);
    else onUse(ready[0].file);
  };

  const storyMs = usedSegmentMs(clips) + (phase === "recording" ? elapsed * 1000 : 0);
  const progress = Math.min(1, storyMs / COUNTY_STORY_CAPTURE_BUDGET_MS);
  const clockSec = storyMs >= COUNTY_STORY_CAPTURE_BUDGET_MS ? COUNTY_STORY_CAMERA_MAX_SEC : storyMs / 1000;
  const timeLeft = remainingSegmentMs(phase === "recording" ? clips : clips);
  const zoomStops = zoomRange ? countyStoryZoomStops(zoomRange) : [];
  const showLive = phase === "live" || phase === "recording" || phase === "denied" || phase === "unsupported";
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] bg-black text-white"
      data-county-story-camera
      data-county-story-camera-phase={phase}
      data-county-story-camera-facing={facing}
      data-county-story-camera-fit={COUNTY_STORY_CAMERA_PREVIEW_FIT}
      data-county-story-camera-width={trackSize.width ?? ""}
      data-county-story-camera-height={trackSize.height ?? ""}
      data-county-story-camera-zoom-supported={zoomRange ? "true" : "false"}
      role="dialog"
      aria-modal="true"
      aria-labelledby="county-story-camera-title"
    >
      <h2 id="county-story-camera-title" className="sr-only">
        County Story camera
      </h2>
      <video
        ref={previewRef}
        className={showLive ? `absolute inset-0 ${frameClass}` : "hidden"}
        playsInline
        muted
        autoPlay
        data-county-story-camera-preview
        data-county-story-camera-fit={COUNTY_STORY_CAMERA_PREVIEW_FIT}
        aria-label={zoomRange ? "Camera preview. Pinch to zoom." : "Camera preview"}
      />
      {phase === "review" && clips.length > 0 ? (
        <CountyStoryPlaylist clips={clips} onRetake={retake} onUse={useTake} />
      ) : null}
      {takeUrl && phase === "leave" ? (
        <CountyStoryTakeReview url={takeUrl} showActions={false} onRetake={retake} onUse={useTake} />
      ) : null}
      {phase === "preparing" ? <CountyStoryPreparing /> : null}

      {phase !== "preparing" ? (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-center justify-between gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button type="button" className={`pointer-events-auto ${iconButtonClass}`} onClick={requestClose} data-county-story-camera-close aria-label="Close">
            <CloseIcon />
          </button>
          {phase === "live" || phase === "recording" ? (
            <p className="min-w-[7.5rem] rounded-full bg-black/50 px-3 py-1 text-center text-base font-medium tabular-nums" role="timer" data-county-story-camera-timer data-county-story-camera-limit>
              {countyStoryCameraClock(clockSec)} / {countyStoryCameraClock(COUNTY_STORY_CAMERA_MAX_SEC)}
            </p>
          ) : (
            <span />
          )}
          <button
            type="button"
            className={`pointer-events-auto ${iconButtonClass}`}
            onClick={() => {
              if (phase === "recording") {
                flipAfterStopRef.current = true;
                finishRecording();
                return;
              }
              void openCamera(countyStoryCameraOtherFacing(facing));
            }}
            disabled={opening || phase === "denied" || phase === "unsupported" || phase === "review" || phase === "leave"}
            data-county-story-camera-flip
            aria-label="Switch camera"
          >
            <SwitchCameraIcon />
          </button>
        </div>
      ) : null}

      {replacement && (phase === "live" || phase === "recording") ? (
        <p className="absolute left-1/2 top-20 z-[2] -translate-x-1/2 rounded-full bg-black/50 px-3 py-2 text-sm">
          Your current Story stays live.
        </p>
      ) : null}

      {phase === "recording" ? (
        <div className="absolute inset-x-0 top-0 z-[2] h-1 bg-white/20" data-county-story-camera-progress>
          <div className="h-full bg-[var(--gold)]" style={{ width: `${progress * 100}%` }} />
        </div>
      ) : null}

      {showLive ? (
        <div className="absolute inset-x-0 bottom-0 z-[2] flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16">
          {notice ? <p className="text-center text-base">{notice}</p> : null}
          {opening && phase === "live" ? (
            <p className="max-w-xs text-center text-base" role="status">
              Allow the camera and microphone to record your County Story.
            </p>
          ) : null}
          {phase === "denied" ? (
            <div className="flex w-full max-w-sm flex-col gap-3" data-county-story-camera-denied>
              <p className="text-center text-base">{countyStoryCameraDeniedCopy()}</p>
              <button type="button" className="story-press story-cta-primary w-full" onClick={() => void openCamera(facing)}>
                Try Camera Again
              </button>
            </div>
          ) : null}
          {phase === "unsupported" ? (
            <p className="max-w-sm text-center text-base" data-county-story-camera-unsupported>
              {countyStoryCameraUnsupportedCopy()}
            </p>
          ) : null}
          {zoomStops.length > 0 && (phase === "live" || phase === "recording") ? (
            <div className="flex gap-2" data-county-story-camera-zoom>
              {zoomStops.map((stop) => {
                const selected = zoom != null && Math.abs(zoom - stop) <= (zoomRange?.step ?? 0.1) / 2;
                return (
                  <button
                    key={stop}
                    type="button"
                    className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)] ${selected ? "bg-white text-black" : "bg-black/50 text-white"}`}
                    aria-label={`Zoom to ${countyStoryZoomLabel(stop)}`}
                    aria-pressed={selected}
                    data-county-story-camera-zoom-stop={stop}
                    onClick={() => void applyZoom(stop)}
                  >
                    {countyStoryZoomLabel(stop)}
                  </button>
                );
              })}
            </div>
          ) : null}
          {phase === "live" || phase === "recording" ? (
            <button
              type="button"
              className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-transparent"
              onClick={() => (phase === "recording" ? finishRecording() : startRecording())}
              disabled={opening || (phase === "live" && remainingSegmentMs(clips) <= 0)}
              data-county-story-camera-record
              aria-label={phase === "recording" ? "Stop recording" : clips.length ? "Continue recording" : "Start recording"}
              aria-pressed={phase === "recording"}
            >
              <span className={phase === "recording" ? "block h-7 w-7 rounded-sm bg-red-500" : "block h-14 w-14 rounded-full bg-red-500"} />
            </button>
          ) : null}
          {phase === "live" && clips.length > 0 ? (
            <div className="flex w-full max-w-sm flex-col gap-2" data-county-story-segments>
              <button type="button" className="story-press min-h-11 rounded-md border border-white/40 text-base font-semibold" onClick={() => setPhase("review")} data-county-story-play-story>
                Play Story
              </button>
              <button type="button" className="story-press min-h-11 text-base font-semibold underline" onClick={dropLastClip} data-county-story-retake-last>
                Retake Last Clip
              </button>
              <button type="button" className="story-press min-h-11 text-base font-semibold underline" onClick={dropLastClip} data-county-story-remove-last>
                Remove Last Clip
              </button>
              <button type="button" className="story-press story-cta-primary w-full" onClick={useTake} data-county-story-use-story>
                Use Story
              </button>
            </div>
          ) : null}
          {phase === "live" || phase === "denied" || phase === "unsupported" ? (
            <label className="story-press flex min-h-11 cursor-pointer items-center text-base font-semibold underline">
              Upload Video
              <input
                className="sr-only"
                type="file"
                accept="video/*"
                data-county-story-camera-upload
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  for (const clip of clipsRef.current) releaseClip(clip);
                  clipsRef.current = [];
                  setClips([]);
                  stopTracks();
                  onUpload(file);
                }}
              />
            </label>
          ) : null}
        </div>
      ) : null}

      {phase === "leave" ? (
        <div className="absolute inset-x-0 bottom-0 z-[3] flex flex-col gap-3 bg-gradient-to-t from-black via-black/90 to-transparent px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16" data-county-story-camera-leave>
          <p className="text-center text-base">Leave this recording? It has not been added to your Story.</p>
          <button
            type="button"
            className="story-press story-cta-primary w-full"
            onClick={() => {
              for (const clip of clipsRef.current) releaseClip(clip);
              clipsRef.current = [];
              setClips([]);
              forgetTake();
              stopTracks();
              onClose();
            }}
          >
            Discard recording
          </button>
          <button type="button" className="story-press min-h-12 w-full rounded-md border border-white/40 text-base font-semibold text-white" onClick={() => setPhase(takeFile ? "review" : "live")}>
            Keep it
          </button>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

export function CountyStoryCameraWalkthrough({
  replacement = false,
  forceDenied = false,
}: {
  replacement?: boolean;
  forceDenied?: boolean;
}) {
  const [stage, setStage] = useState<"camera" | "preparing" | "review">("camera");
  const [url, setUrl] = useState<string | null>(null);
  const [background, setBackground] = useState<"blur" | "neutral">("blur");
  if (stage === "preparing") {
    return createPortal(<CountyStoryPreparing />, document.body);
  }
  if (stage === "review" && url) {
    return createPortal(
      <section className="fixed inset-0 z-[80] overflow-y-auto bg-[var(--background)] text-ink" data-county-story-review>
        <div className="mx-auto flex w-full max-w-md flex-col px-6 pb-8 pt-14">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Preparing your Story</h2>
          <p className="mt-2 text-base text-[var(--muted)]">This usually takes a moment.</p>
          <h2 className="mt-6 text-xl font-semibold tracking-[-0.02em]">This is what people will see.</h2>
          <div className="mt-4">
            <CountyStoryBackgroundComparison url={url} value={background} onChange={setBackground} />
          </div>
        </div>
      </section>,
      document.body,
    );
  }
  return (
    <CountyStoryCamera
      replacement={replacement}
      forceDenied={forceDenied}
      onClose={() => undefined}
      onUse={(file) => {
        const next = URL.createObjectURL(file);
        setUrl(next);
        setStage("preparing");
        window.setTimeout(() => setStage("review"), 2400);
      }}
      onUseStory={(clips) => {
        const next = clips[0] ? URL.createObjectURL(clips[0].file) : null;
        if (next) setUrl(next);
        setStage("preparing");
        window.setTimeout(() => setStage("review"), 2400);
      }}
      onUpload={(file) => {
        const next = URL.createObjectURL(file);
        setUrl(next);
        setStage("preparing");
        window.setTimeout(() => setStage("review"), 2400);
      }}
    />
  );
}
