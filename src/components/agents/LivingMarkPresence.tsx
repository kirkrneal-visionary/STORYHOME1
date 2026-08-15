"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { loadLivingMark } from "@/lib/living-mark/library";
import {
  dismissLivingMarkNudge,
  markLivingMarkNudgeShown,
  shouldShowLivingMarkNudge,
} from "@/lib/living-mark/nudge";
import { cn } from "@/lib/utils";

type Props = {
  agentId: string;
  photoUrl?: string | null;
  /** Server / profile Living Mark video when available. */
  videoUrl?: string | null;
  initials: string;
  name: string;
  tone: string;
};

type MarkMode = "still" | "playing" | "frozen";

/**
 * SW-3 Living Mark presence — circle video, no player chrome.
 * Autoplays once per visit (caps arrive in SW-4); freezes to headshot still.
 * Agent-only weekly nudge when still is temporary (no video).
 */
export function LivingMarkPresence({
  agentId,
  photoUrl,
  videoUrl: videoUrlProp,
  initials,
  name,
  tone,
}: Props) {
  const { user } = useAuth();
  const isOwn = Boolean(user?.id && user.id === agentId);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [still, setStill] = useState(photoUrl ?? null);
  const [videoUrl, setVideoUrl] = useState(videoUrlProp ?? null);
  const [mode, setMode] = useState<MarkMode>("still");
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    setStill(photoUrl ?? null);
  }, [photoUrl]);

  useEffect(() => {
    setVideoUrl(videoUrlProp ?? null);
  }, [videoUrlProp]);

  useEffect(() => {
    let cancelled = false;
    void loadLivingMark(agentId, photoUrl, videoUrlProp).then((m) => {
      if (cancelled) return;
      if (m.stillUrl) setStill(m.stillUrl);
      if (m.videoUrl) setVideoUrl(m.videoUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [agentId, photoUrl, videoUrlProp]);

  useEffect(() => {
    if (!videoUrl) {
      setMode("still");
      return;
    }
    setMode("playing");
  }, [videoUrl]);

  useEffect(() => {
    if (mode !== "playing" || !videoUrl) return;
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    const play = el.play();
    if (play && typeof play.catch === "function") {
      play.catch(() => setMode("still"));
    }
  }, [mode, videoUrl]);

  useEffect(() => {
    if (!isOwn || !user?.id) {
      setShowNudge(false);
      return;
    }
    const hasVideo = Boolean(videoUrl);
    if (!shouldShowLivingMarkNudge(user.id, hasVideo)) {
      setShowNudge(false);
      return;
    }
    setShowNudge(true);
    markLivingMarkNudgeShown(user.id);
  }, [isOwn, user?.id, videoUrl]);

  function onEnded() {
    setMode("frozen");
  }

  function onNudgeDismiss() {
    if (!user?.id) return;
    dismissLivingMarkNudge(user.id);
    setShowNudge(false);
  }

  const playing = mode === "playing" && Boolean(videoUrl);

  return (
    <div className="relative shrink-0">
      <div
        data-living-mark
        data-living-mark-mode={playing ? "playing" : mode === "frozen" ? "frozen" : "still"}
        data-living-mark-video-ready={videoUrl ? "true" : "false"}
        className="relative h-24 w-24 md:h-28 md:w-28"
        aria-label={`${name} Living Mark`}
      >
        <div
          className={cn(
            "flex h-full w-full items-center justify-center overflow-hidden rounded-full ring-2 ring-gold/45 ring-offset-2 ring-offset-[var(--background)]",
            !still && !playing && tone,
          )}
        >
          {playing ? (
            <video
              ref={videoRef}
              data-living-mark-video
              src={videoUrl!}
              className="h-full w-full object-cover"
              playsInline
              muted
              autoPlay
              preload="auto"
              onEnded={onEnded}
              onError={() => setMode("still")}
              // Presence only — never expose visitor player chrome.
            />
          ) : still ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={still} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="font-serif text-2xl font-bold text-navy md:text-3xl">
              {initials || "SH"}
            </span>
          )}
        </div>
        <span className="sr-only">
          {playing
            ? "Living Mark welcome playing"
            : mode === "frozen"
              ? "Living Mark frozen to headshot"
              : "Living Mark still"}
        </span>
      </div>

      {showNudge ? (
        <div
          data-living-mark-nudge
          className="absolute top-full left-0 z-10 mt-3 w-64 max-w-[min(16rem,70vw)] rounded-2xl border border-hairline bg-[color-mix(in_srgb,var(--surface)_92%,transparent)] p-3 shadow-[0_12px_40px_rgba(18,40,32,0.18)] backdrop-blur-md"
          role="status"
        >
          <p className="text-xs leading-relaxed text-ink">
            Your circle still works — a ~30s welcome video turns it into a Living
            Mark. Upload from Settings when you are ready.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href="/settings"
              className="story-press inline-flex h-8 items-center rounded-full bg-gold px-3 text-[11px] font-bold text-navy"
            >
              Open library
            </Link>
            <button
              type="button"
              onClick={onNudgeDismiss}
              className="story-press inline-flex h-8 items-center rounded-full border border-hairline px-3 text-[11px] font-semibold text-[var(--muted)] hover:text-ink"
            >
              Not this week
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
