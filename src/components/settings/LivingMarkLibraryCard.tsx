"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2, Video } from "lucide-react";
import {
  clearLivingMarkLibrary,
  loadLivingMark,
  uploadLivingMarkFromLibrary,
} from "@/lib/living-mark/library";
import type { LivingMarkRecord } from "@/lib/living-mark/types";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  initials: string;
  profileStillUrl?: string | null;
  profileVideoUrl?: string | null;
  onChanged?: () => void;
};

/**
 * SW-2 — Settings access library for Living Mark.
 * No visitor player chrome; preview only for the agent editing.
 */
export function LivingMarkLibraryCard({
  userId,
  initials,
  profileStillUrl,
  profileVideoUrl,
  onChanged,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mark, setMark] = useState<LivingMarkRecord>({
    stillUrl: profileStillUrl ?? null,
    videoUrl: profileVideoUrl ?? null,
    updatedAt: "",
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadLivingMark(userId, profileStillUrl, profileVideoUrl).then(setMark);
  }, [userId, profileStillUrl, profileVideoUrl]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      const next = await uploadLivingMarkFromLibrary(userId, file);
      setMark(next);
      setNote(
        file.type.startsWith("video/")
          ? "Welcome video saved. Agent World plays it in the circle — freezes to your still when done."
          : "Still saved as temporary Living Mark. Add a ~30s welcome video when ready.",
      );
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function onClear() {
    setBusy(true);
    setError("");
    try {
      await clearLivingMarkLibrary(userId);
      setMark({ stillUrl: null, videoUrl: null, updatedAt: new Date().toISOString() });
      setNote("Living Mark cleared.");
      onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not clear");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      data-living-mark-library
      className="story-surface p-5"
    >
      <div className="flex items-start gap-3">
        <Video className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-lg font-bold text-ink">Living Mark</h2>
          <p className="text-xs text-[var(--muted)]">
            Library upload for your Agent World circle — photo (temporary) or ~30s
            welcome video. No player buttons on the public mark.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center">
        <div
          className={cn(
            "relative mx-auto flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-gold/45 ring-offset-2 ring-offset-[var(--background)] sm:mx-0",
            !mark.stillUrl &&
              "bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))]",
          )}
          data-living-mark-preview
        >
          {mark.stillUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mark.stillUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="font-serif text-3xl font-bold text-navy">
              {initials || "SH"}
            </span>
          )}
          {mark.videoUrl ? (
            <span className="absolute bottom-1 right-1 rounded-full bg-navy/90 px-1.5 py-0.5 font-mono text-[8px] font-bold tracking-wide text-gold uppercase">
              Video ready
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <label className="story-press inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-navy">
            <ImagePlus className="h-4 w-4" aria-hidden />
            {busy ? "Uploading…" : "Choose from library"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              disabled={busy}
              onChange={(e) => void onPick(e.target.files?.[0])}
            />
          </label>
          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            Opens your device library like other social apps. Photo = temporary
            still. Video = Living Mark welcome (headshot or walk-into-frame).
          </p>
          {(mark.stillUrl || mark.videoUrl) && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void onClear()}
              className="story-press inline-flex h-9 items-center gap-1.5 rounded-full border border-hairline px-3 text-xs font-semibold text-[var(--muted)] hover:text-ink disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Clear Living Mark
            </button>
          )}
          {note ? <p className="text-sm text-teal-soft">{note}</p> : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
        </div>
      </div>
    </section>
  );
}
