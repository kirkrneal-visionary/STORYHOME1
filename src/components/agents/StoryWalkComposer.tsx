"use client";

/**
 * STORY-WALK SW-7 — Story Walk composer (own profile).
 * Agent picks listings → compositor builds Living Mark + photo walk → download WebM.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Download, Film, Loader2, Share2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { formatUsd, type DemoListing } from "@/lib/demo-data";
import { loadLivingMark } from "@/lib/living-mark/library";
import {
  downloadBlob,
  renderStoryWalkFilm,
  storyWalkRecordSupport,
} from "@/lib/story-walk/render";
import { shareStoryWalkFilm } from "@/lib/story-walk/share";
import { demoStillDataUrl } from "@/lib/story-walk/demo-assets";
import {
  STORY_WALK_DEFAULT_LISTING_COUNT,
  STORY_WALK_HEIGHT,
  STORY_WALK_IMAGES_PER_LISTING,
  STORY_WALK_MAX_LISTING_COUNT,
  STORY_WALK_WIDTH,
  type StoryWalkListingPick,
  type StoryWalkProgress,
} from "@/lib/story-walk/types";
import { cn } from "@/lib/utils";

type Props = {
  agentId: string;
  agentName: string;
  marketCity: string;
  roleLabel?: string;
  photoUrl?: string | null;
  livingMarkVideoUrl?: string | null;
  listings: DemoListing[];
};

function toPick(listing: DemoListing): StoryWalkListingPick {
  const photos = listing.photoUrl ? [listing.photoUrl] : [];
  return {
    id: listing.id,
    title: listing.addressSerif || listing.city || "Listing",
    subtitle: [listing.city, listing.countyName].filter(Boolean).join(" · "),
    priceLabel: listing.price > 0 ? formatUsd(listing.price) : "Inquire",
    photos,
  };
}

function ensurePhotos(pick: StoryWalkListingPick, agentName: string): StoryWalkListingPick {
  if (pick.photos.length > 0) {
    return {
      ...pick,
      photos: pick.photos.slice(0, STORY_WALK_IMAGES_PER_LISTING),
    };
  }
  return {
    ...pick,
    photos: [
      demoStillDataUrl(pick.title, pick.subtitle || agentName),
      demoStillDataUrl(pick.priceLabel, "Story Walk"),
    ],
  };
}

export function StoryWalkComposer({
  agentId,
  agentName,
  marketCity,
  roleLabel,
  photoUrl,
  livingMarkVideoUrl,
  listings,
}: Props) {
  const defaultIds = useMemo(
    () => listings.slice(0, STORY_WALK_DEFAULT_LISTING_COUNT).map((l) => l.id),
    [listings],
  );
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionReady, setSelectionReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [progress, setProgress] = useState<StoryWalkProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFilm, setLastFilm] = useState<{
    blob: Blob;
    filename: string;
  } | null>(null);
  const [shareNote, setShareNote] = useState("");

  useEffect(() => {
    if (selectionReady) {
      setSelected((prev) =>
        prev.filter((id) => listings.some((l) => l.id === id)),
      );
      return;
    }
    setSelected(defaultIds);
    setSelectionReady(true);
  }, [defaultIds, listings, selectionReady]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= STORY_WALK_MAX_LISTING_COUNT) return prev;
      return [...prev, id];
    });
  }, []);

  const move = useCallback((id: string, dir: -1 | 1) => {
    setSelected((prev) => {
      const i = prev.indexOf(id);
      if (i < 0) return prev;
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const tmp = next[i]!;
      next[i] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }, []);

  const orderedPicks = useMemo(() => {
    const byId = new Map(listings.map((l) => [l.id, l]));
    return selected
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((l) => toPick(l!));
  }, [listings, selected]);

  const onExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    setShareNote("");
    setProgress({
      phase: "prepare",
      progress: 0,
      message: "Loading Living Mark…",
    });
    try {
      const support = storyWalkRecordSupport();
      if (!support.ok) {
        throw new Error(support.reason || "Recording unavailable");
      }

      const mark = await loadLivingMark(
        agentId,
        photoUrl,
        livingMarkVideoUrl,
      );

      let picks = orderedPicks.map((p) => ensurePhotos(p, agentName));
      if (picks.length === 0) {
        picks = [
          ensurePhotos(
            {
              id: "demo-1",
              title: "Featured homes",
              subtitle: marketCity || "Your market",
              priceLabel: "Story Walk",
              photos: [],
            },
            agentName,
          ),
        ];
      }

      const blob = await renderStoryWalkFilm(
        {
          agentName,
          marketCity: marketCity || "StoryHome",
          livingMarkStillUrl: mark.stillUrl || photoUrl || null,
          livingMarkVideoUrl: mark.videoUrl || livingMarkVideoUrl || null,
          listings: picks,
        },
        setProgress,
      );

      const slug = agentName.replace(/\s+/g, "-").toLowerCase() || "agent";
      const filename = `story-walk-${slug}.webm`;
      downloadBlob(blob, filename);
      setLastFilm({ blob, filename });

      track("story_walk_exported", {
        agent_id: agentId,
        listing_count: picks.length,
      });

      setProgress({
        phase: "done",
        progress: 1,
        message: "Downloaded — ready to share",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
      setProgress({
        phase: "error",
        progress: 0,
        message: "Export failed",
      });
    } finally {
      setExporting(false);
    }
  }, [
    agentId,
    agentName,
    livingMarkVideoUrl,
    marketCity,
    orderedPicks,
    photoUrl,
  ]);

  const onShare = useCallback(async () => {
    if (!lastFilm || sharing) return;
    setSharing(true);
    setShareNote("");
    try {
      const result = await shareStoryWalkFilm({
        agentId,
        agentName,
        marketCity,
        roleLabel,
        blob: lastFilm.blob,
        filename: lastFilm.filename,
      });
      if (result.ok) {
        track("story_walk_shared", {
          agent_id: agentId,
          method: result.method,
        });
        setShareNote(
          result.method === "native-file"
            ? "Share sheet opened with your film"
            : result.method === "native-link"
              ? "Share sheet opened — film also downloaded"
              : "Share text + Agent World link copied",
        );
      } else if (result.reason === "cancelled") {
        setShareNote("");
      } else {
        setShareNote("Couldn’t share — your download is still saved.");
      }
      window.setTimeout(() => setShareNote(""), 5200);
    } finally {
      setSharing(false);
    }
  }, [agentId, agentName, lastFilm, marketCity, roleLabel, sharing]);

  return (
    <section
      data-story-walk-composer
      aria-label="Story Walk composer"
      className="story-glass mt-8 px-5 py-5"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] text-gold">
          <Film className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-gold uppercase">
            Story Walk
          </p>
          <h2 className="mt-1 font-serif text-xl font-bold text-ink">
            Your marketing film
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            Living Mark welcome, then a smooth walk through the homes you pick.
            Export {STORY_WALK_WIDTH}×{STORY_WALK_HEIGHT} WebM — compositor, not
            a screen grab.
          </p>
        </div>
      </div>

      {listings.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          No listings yet — export still builds a soft preview film so you can
          try the walk.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] tracking-[0.12em] text-[var(--muted)] uppercase">
            Include up to {STORY_WALK_MAX_LISTING_COUNT} · default{" "}
            {STORY_WALK_DEFAULT_LISTING_COUNT}
          </p>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {listings.map((listing) => {
              const on = selected.includes(listing.id);
              const order = selected.indexOf(listing.id);
              const disabled =
                !on && selected.length >= STORY_WALK_MAX_LISTING_COUNT;
              return (
                <li key={listing.id}>
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-3 py-2.5 transition-colors",
                      on
                        ? "border-gold/35 bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]"
                        : "border-hairline bg-[color-mix(in_srgb,var(--surface)_50%,transparent)]",
                      disabled && "opacity-40",
                    )}
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => toggle(listing.id)}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                        on
                          ? "border-gold/60 bg-gold/20 text-gold"
                          : "border-hairline",
                      )}
                      aria-pressed={on}
                      aria-label={
                        on
                          ? `Remove ${listing.addressSerif}`
                          : `Include ${listing.addressSerif}`
                      }
                    >
                      {on ? <Check className="h-3 w-3" aria-hidden /> : null}
                    </button>
                    <button
                      type="button"
                      disabled={disabled && !on}
                      onClick={() => toggle(listing.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-semibold text-ink">
                        {listing.addressSerif || listing.city}
                      </span>
                      <span className="block truncate text-xs text-[var(--muted)]">
                        {listing.price > 0 ? formatUsd(listing.price) : "—"} ·{" "}
                        {listing.city}
                      </span>
                    </button>
                    {on ? (
                      <div className="flex shrink-0 flex-col gap-0.5">
                        <button
                          type="button"
                          className="px-1.5 font-mono text-[10px] text-[var(--muted)] hover:text-ink disabled:opacity-30"
                          disabled={order <= 0}
                          onClick={() => move(listing.id, -1)}
                          aria-label="Move earlier in film"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="px-1.5 font-mono text-[10px] text-[var(--muted)] hover:text-ink disabled:opacity-30"
                          disabled={order < 0 || order >= selected.length - 1}
                          onClick={() => move(listing.id, 1)}
                          aria-label="Move later in film"
                        >
                          ↓
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm text-rose-700/90" role="alert">
          {error}
        </p>
      ) : null}
      {progress && !error ? (
        <p
          data-story-walk-progress
          className="mt-3 text-xs text-[var(--muted)]"
          aria-live="polite"
        >
          {progress.message}
          {progress.phase === "render" || progress.phase === "encode"
            ? ` · ${Math.round(progress.progress * 100)}%`
            : null}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          data-story-walk-export
          disabled={exporting}
          onClick={() => void onExport()}
          className="story-press inline-flex h-11 items-center gap-2 rounded-full bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-contrast)] disabled:opacity-60"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Exporting…
            </>
          ) : (
            <>
              <Download className="h-4 w-4" aria-hidden />
              Export Story Walk
            </>
          )}
        </button>
        {lastFilm ? (
          <button
            type="button"
            data-story-walk-share
            disabled={sharing || exporting}
            onClick={() => void onShare()}
            className="story-press inline-flex h-11 items-center gap-2 rounded-full border border-hairline bg-[color-mix(in_srgb,var(--surface)_70%,transparent)] px-5 text-sm font-semibold text-ink backdrop-blur-sm hover:border-gold/40 disabled:opacity-60"
          >
            {sharing ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : shareNote ? (
              <Check className="h-4 w-4 text-gold" aria-hidden />
            ) : (
              <Share2 className="h-4 w-4 text-gold" aria-hidden />
            )}
            Share film
          </button>
        ) : null}
      </div>
      {shareNote ? (
        <p
          data-story-walk-share-note
          role="status"
          className="mt-3 flex max-w-md items-start gap-1.5 rounded-xl border border-hairline bg-[color-mix(in_srgb,var(--surface)_94%,transparent)] px-3 py-2 text-[11px] leading-snug text-[var(--muted)] shadow-[0_8px_24px_rgba(18,40,32,0.12)] backdrop-blur-md"
        >
          <Check className="mt-0.5 h-3 w-3 shrink-0 text-gold" aria-hidden />
          {shareNote}
        </p>
      ) : null}
    </section>
  );
}
