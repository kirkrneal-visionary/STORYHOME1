"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  COUNTY_STORY_CAMERA_MAX_SEC,
  countyStoryCameraClock,
  countyStoryCameraDeniedCopy,
  countyStoryCameraFacingLabel,
  countyStoryCameraOtherFacing,
  countyStoryCameraRequest,
  countyStoryCameraShouldStop,
  countyStoryCameraSwitchCopy,
  countyStoryCameraUnsupportedCopy,
  type CountyStoryCameraFacing,
} from "@/lib/county-stories/camera-capture";

type Phase = "live" | "recording" | "review" | "denied" | "unsupported" | "leave";

function preferredMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("video/mp4")) return "video/mp4";
  if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
  return "";
}

function fileExtension(mime: string): string {
  return mime.includes("mp4") ? "mp4" : "webm";
}

export function CountyStoryCamera({
  replacement = false,
  forceDenied = false,
  onClose,
  onUse,
  onUpload,
}: {
  replacement?: boolean;
  forceDenied?: boolean;
  onClose: () => void;
  onUse: (file: File) => void;
  onUpload: (file: File) => void;
}) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const playbackRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const stoppingRef = useRef(false);
  const takeUrlRef = useRef<string | null>(null);
  const [facing, setFacing] = useState<CountyStoryCameraFacing>("environment");
  const [phase, setPhase] = useState<Phase>("live");
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const [takeFile, setTakeFile] = useState<File | null>(null);
  const [opening, setOpening] = useState(true);

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
        stopTracks();
        streamRef.current = stream;
        setFacing(nextFacing);
        setPhase((current) => (current === "recording" || current === "review" || current === "leave" ? current : "live"));
        setOpening(false);
        attachPreview(stream);
      } catch {
        setOpening(false);
        if (!streamRef.current) setPhase("denied");
        else setNotice(countyStoryCameraSwitchCopy());
      }
    },
    [attachPreview, stopTracks],
  );

  useEffect(() => {
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
  }, [clearTimer, forceDenied, openCamera, stopTracks]);

  useEffect(() => {
    if (phase === "live" && streamRef.current) attachPreview(streamRef.current);
  }, [attachPreview, phase]);

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

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || typeof MediaRecorder === "undefined") {
      setPhase("unsupported");
      return;
    }
    forgetTake();
    chunksRef.current = [];
    const mime = preferredMime();
    const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    stoppingRef.current = false;
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mime || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const file = new File([blob], `county-story.${fileExtension(type)}`, { type });
      const url = URL.createObjectURL(blob);
      if (takeUrlRef.current) URL.revokeObjectURL(takeUrlRef.current);
      takeUrlRef.current = url;
      setTakeFile(file);
      setTakeUrl(url);
      setPhase("review");
    };
    recorder.start(250);
    const started = Date.now();
    setElapsed(0);
    setPhase("recording");
    setNotice(null);
    timerRef.current = window.setInterval(() => {
      const elapsedMs = Date.now() - started;
      setElapsed(elapsedMs / 1000);
      if (countyStoryCameraShouldStop(elapsedMs)) finishRecording();
    }, 200);
  }, [finishRecording, forgetTake]);

  const requestClose = () => {
    if (phase === "recording") {
      finishRecording();
      return;
    }
    if (phase === "review" || takeFile) {
      setPhase("leave");
      return;
    }
    stopTracks();
    onClose();
  };

  const progress = Math.min(1, elapsed / COUNTY_STORY_CAMERA_MAX_SEC);

  return (
    <div
      className="fixed inset-0 z-[80] bg-black text-white"
      data-county-story-camera
      data-county-story-camera-phase={phase}
      data-county-story-camera-facing={facing}
      role="dialog"
      aria-modal="true"
      aria-labelledby="county-story-camera-title"
    >
      <h2 id="county-story-camera-title" className="sr-only">
        County Story camera
      </h2>
      <video
        ref={previewRef}
        className={
          phase === "review" || phase === "leave"
            ? "hidden"
            : "absolute inset-0 h-full w-full object-cover md:left-1/2 md:w-[min(100vw,calc(100dvh*9/16))] md:-translate-x-1/2"
        }
        playsInline
        muted
        autoPlay
        data-county-story-camera-preview
      />
      {takeUrl && (phase === "review" || phase === "leave") ? (
        <video
          ref={playbackRef}
          className="absolute inset-0 h-full w-full object-cover md:left-1/2 md:w-[min(100vw,calc(100dvh*9/16))] md:-translate-x-1/2"
          src={takeUrl}
          playsInline
          controls
          data-county-story-camera-take
        />
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] flex items-start justify-between gap-3 p-4 md:left-1/2 md:w-[min(100vw,calc(100dvh*9/16))] md:-translate-x-1/2">
        <button
          type="button"
          className="pointer-events-auto min-h-11 min-w-11 rounded-full bg-black/50 px-4 text-base font-semibold"
          onClick={requestClose}
          data-county-story-camera-close
          aria-label="Close"
        >
          Close
        </button>
        <p className="rounded-full bg-black/50 px-3 py-2 text-sm" data-county-story-camera-limit>
          {COUNTY_STORY_CAMERA_MAX_SEC} seconds
        </p>
        <button
          type="button"
          className="pointer-events-auto min-h-11 rounded-full bg-black/50 px-4 text-sm font-semibold disabled:opacity-40"
          onClick={() => void openCamera(countyStoryCameraOtherFacing(facing))}
          disabled={opening || phase === "recording" || phase === "denied" || phase === "unsupported"}
          data-county-story-camera-flip
          aria-label="Switch camera"
        >
          {countyStoryCameraFacingLabel(countyStoryCameraOtherFacing(facing))}
        </button>
      </div>

      {replacement ? (
        <p className="absolute left-1/2 top-20 z-[1] -translate-x-1/2 rounded-full bg-black/50 px-3 py-2 text-sm">
          Your current Story stays live.
        </p>
      ) : null}

      {phase === "recording" ? (
        <div className="absolute inset-x-0 top-0 z-[1] h-1 bg-white/20" data-county-story-camera-progress>
          <div className="h-full bg-[var(--gold)]" style={{ width: `${progress * 100}%` }} />
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-[1] flex flex-col items-center gap-4 bg-gradient-to-t from-black/80 to-transparent px-4 pb-8 pt-16 md:left-1/2 md:w-[min(100vw,calc(100dvh*9/16))] md:-translate-x-1/2">
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
        {phase === "review" ? (
          <div className="flex w-full max-w-sm gap-3">
            <button
              type="button"
              className="story-press story-cta-secondary w-full"
              data-county-story-camera-retake
              onClick={() => {
                forgetTake();
                setElapsed(0);
                setPhase("live");
                if (streamRef.current) attachPreview(streamRef.current);
              }}
            >
              Retake
            </button>
            <button
              type="button"
              className="story-press story-cta-primary w-full"
              data-county-story-camera-use
              disabled={!takeFile}
              onClick={() => {
                if (!takeFile) return;
                stopTracks();
                onUse(takeFile);
              }}
            >
              Use Video
            </button>
          </div>
        ) : null}
        {phase === "leave" ? (
          <div className="flex w-full max-w-sm flex-col gap-3" data-county-story-camera-leave>
            <p className="text-center text-base">Leave this recording? It has not been added to your Story.</p>
            <button
              type="button"
              className="story-press story-cta-primary w-full"
              onClick={() => {
                forgetTake();
                stopTracks();
                onClose();
              }}
            >
              Discard recording
            </button>
            <button type="button" className="story-press story-cta-secondary w-full" onClick={() => setPhase(takeFile ? "review" : "live")}>
              Keep it
            </button>
          </div>
        ) : null}
        {phase === "live" || phase === "recording" ? (
          <button
            type="button"
            className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-transparent"
            onClick={() => (phase === "recording" ? finishRecording() : startRecording())}
            disabled={opening}
            data-county-story-camera-record
            aria-label={phase === "recording" ? "Stop recording" : "Start recording"}
            aria-pressed={phase === "recording"}
          >
            <span
              className={
                phase === "recording"
                  ? "block h-7 w-7 rounded-sm bg-red-500"
                  : "block h-14 w-14 rounded-full bg-red-500"
              }
            />
          </button>
        ) : null}
        {phase === "recording" ? (
          <p className="text-lg font-semibold tabular-nums" role="timer" data-county-story-camera-timer>
            {countyStoryCameraClock(elapsed)} / 0:{String(COUNTY_STORY_CAMERA_MAX_SEC).padStart(2, "0")}
          </p>
        ) : null}
        {phase === "live" || phase === "denied" || phase === "unsupported" ? (
          <label className="story-press cursor-pointer text-base font-semibold underline">
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
                stopTracks();
                onUpload(file);
              }}
            />
          </label>
        ) : null}
      </div>
    </div>
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
  if (stage === "preparing") {
    return (
      <section className="fixed inset-0 z-[80] bg-[var(--background)] px-6 pt-16 text-ink" data-county-story-processing>
        <h2 className="text-xl font-semibold">Preparing your Story</h2>
        <p className="mt-2 text-base text-[var(--muted)]" role="status">
          This usually takes a moment.
        </p>
      </section>
    );
  }
  if (stage === "review" && url) {
    return (
      <section className="fixed inset-0 z-[80] overflow-auto bg-[var(--background)] px-6 pt-16 text-ink" data-county-story-review>
        <h2 className="text-xl font-semibold">This is what people will see.</h2>
        <video className="mt-4 aspect-[9/16] w-full max-w-sm bg-black" controls playsInline src={url} />
      </section>
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
        window.setTimeout(() => setStage("review"), 900);
      }}
      onUpload={(file) => {
        const next = URL.createObjectURL(file);
        setUrl(next);
        setStage("preparing");
        window.setTimeout(() => setStage("review"), 900);
      }}
    />
  );
}
