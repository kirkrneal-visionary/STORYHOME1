"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Share2,
  Trash2,
} from "lucide-react";
import { useSuites } from "@/components/SuitesContext";
import { formatUsd, type DemoListing } from "@/lib/demo-data";
import { apiShareSuite } from "@/lib/suites-api";
import type { StorySuite } from "@/lib/suites";
import { fetchListingsByIds } from "@/lib/supabase/listings";
import { cn } from "@/lib/utils";

type SuitePlayerProps = {
  suiteId: string;
};

type ListingSlot =
  | { kind: "home"; listing: DemoListing }
  | { kind: "missing"; id: string };

export function SuitePlayer({ suiteId }: SuitePlayerProps) {
  const { suites, status, removeListingFromSuite } = useSuites();
  const owned = suites.find((s) => s.id === suiteId) ?? null;
  const [shared, setShared] = useState<StorySuite | null>(null);
  const [shareTried, setShareTried] = useState(false);
  const suite = owned ?? shared;
  const canEdit = Boolean(owned);
  const [slots, setSlots] = useState<ListingSlot[]>([]);

  useEffect(() => {
    if (owned) {
      setShared(null);
      setShareTried(true);
      return;
    }
    if (status === "loading") return;
    let active = true;
    setShareTried(false);
    apiShareSuite(suiteId)
      .then((row) => {
        if (!active) return;
        setShared(row);
        setShareTried(true);
      })
      .catch(() => {
        if (!active) return;
        setShared(null);
        setShareTried(true);
      });
    return () => {
      active = false;
    };
  }, [owned, status, suiteId]);

  useEffect(() => {
    const ids = suite?.listingIds ?? [];
    if (ids.length === 0) {
      setSlots([]);
      return;
    }
    let active = true;
    fetchListingsByIds(ids)
      .then((rows) => {
        if (!active) return;
        const byId = new Map(rows.map((r) => [r.id, r]));
        setSlots(
          ids.map((id) => {
            const listing = byId.get(id);
            return listing
              ? { kind: "home" as const, listing }
              : { kind: "missing" as const, id };
          }),
        );
      })
      .catch(() => {
        if (!active) return;
        setSlots(ids.map((id) => ({ kind: "missing" as const, id })));
      });
    return () => {
      active = false;
    };
  }, [suite?.listingIds]);

  const [index, setIndex] = useState(0);
  const [shareNote, setShareNote] = useState("");

  if (!owned && (status === "loading" || !shareTried)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-sm text-[var(--muted)]">Loading suite…</p>
      </div>
    );
  }

  if (!suite) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="type-page-title text-ink">
          Suite not found
        </h1>
        <Link href="/saved" className="mt-6 inline-block text-gold">
          Back to albums
        </Link>
      </div>
    );
  }

  const activeSuite = suite;
  const current = slots[index] ?? null;

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${activeSuite.name} · Story Home Suite`,
          text: `Browse my Story Home Suite: ${activeSuite.name}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setShareNote("Suite link copied");
        setTimeout(() => setShareNote(""), 2000);
      }
    } catch {
      await navigator.clipboard.writeText(url);
      setShareNote("Suite link copied");
      setTimeout(() => setShareNote(""), 2000);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-[var(--story-bottom-clearance)] pt-6 md:px-6">
      <Link
        href="/saved"
        className="inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All suites
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-gold uppercase">
            Story Home Suite
          </p>
          <h1 className="mt-1 type-page-title text-ink">
            {suite.name}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {suite.description || "Thumb through this album of homes."}
          </p>
        </div>
        <button
          type="button"
          onClick={share}
          className="story-glass story-press inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold text-ink hover:border-gold/50"
        >
          <Share2 className="h-4 w-4 text-gold" /> Share suite
        </button>
      </div>

      {shareNote && (
        <p className="mt-3 text-sm text-gold">{shareNote}</p>
      )}

      {slots.length === 0 ? (
        <div className="story-well mt-12 px-6 py-16 text-center">
          <p className="type-section text-ink">Empty album</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Save homes from the marketplace into this suite.
          </p>
          <Link
            href="/marketplace"
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy"
          >
            Browse homes
          </Link>
        </div>
      ) : (
        <>
          <div className="story-surface relative mt-8 overflow-hidden">
            {current?.kind === "home" && (
              <div className="grid md:grid-cols-[1.2fr_0.8fr]">
                <div className="relative aspect-[4/3] bg-[var(--nav-surface)] md:aspect-auto md:min-h-[420px]">
                  {current.listing.photoUrl ? (
                    <Image
                      src={current.listing.photoUrl}
                      alt={current.listing.addressSerif}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 60vw"
                      priority
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-xs text-paper/50">
                      No photo
                    </div>
                  )}
                </div>
                <div className="flex flex-col justify-between p-6 md:p-8">
                  <div>
                    <p className="font-mono text-sm font-bold text-gold">
                      {formatUsd(current.listing.price)}
                    </p>
                    <h2 className="mt-2 type-page-title text-ink">
                      {current.listing.addressSerif}
                    </h2>
                    <p className="mt-2 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
                      {current.listing.city} · {current.listing.beds} bd ·{" "}
                      {current.listing.baths} ba ·{" "}
                      {current.listing.sqft.toLocaleString()} sqft
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                      {current.listing.description}
                    </p>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-2">
                    <Link
                      href={`/marketplace/${current.listing.id}`}
                      className="inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy"
                    >
                      Open listing
                    </Link>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          void removeListingFromSuite(
                            suite.id,
                            current.listing.id,
                          );
                          setIndex((i) =>
                            Math.max(0, Math.min(i, slots.length - 2)),
                          );
                        }}
                        className="story-press inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-hairline px-4 text-sm font-semibold text-[var(--muted)]"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {current?.kind === "missing" && (
              <div className="grid md:grid-cols-[1.2fr_0.8fr]">
                <div className="flex aspect-[4/3] items-center justify-center bg-[var(--nav-surface)] md:aspect-auto md:min-h-[420px]">
                  <p className="font-mono text-xs text-paper/50">
                    Home no longer listed
                  </p>
                </div>
                <div className="flex flex-col justify-between p-6 md:p-8">
                  <div>
                    <h2 className="type-page-title text-ink">
                      This home is no longer listed
                    </h2>
                    <p className="mt-3 text-sm text-[var(--muted)]">
                      The album slot stays. The listing left the market or
                      cannot be shown.
                    </p>
                  </div>
                  {canEdit && (
                    <div className="mt-8">
                      <button
                        type="button"
                        onClick={() => {
                          void removeListingFromSuite(suite.id, current.id);
                          setIndex((i) =>
                            Math.max(0, Math.min(i, slots.length - 2)),
                          );
                        }}
                        className="story-press inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-hairline px-4 text-sm font-semibold text-[var(--muted)]"
                      >
                        <Trash2 className="h-4 w-4" /> Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
              <button
                type="button"
                disabled={index <= 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-ink disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <p className="font-mono text-[11px] tracking-wider text-[var(--muted)] uppercase">
                {index + 1} / {slots.length}
              </p>
              <button
                type="button"
                disabled={index >= slots.length - 1}
                onClick={() =>
                  setIndex((i) => Math.min(slots.length - 1, i + 1))
                }
                className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-ink disabled:opacity-30"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
            {slots.map((slot, i) => (
              <button
                key={slot.kind === "home" ? slot.listing.id : slot.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "relative h-20 w-28 shrink-0 overflow-hidden rounded-[var(--radius-md)] border bg-[var(--env-1)]",
                  i === index ? "border-gold" : "border-hairline opacity-70",
                )}
              >
                {slot.kind === "home" && slot.listing.photoUrl ? (
                  <Image
                    src={slot.listing.photoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center px-1 text-center font-mono text-[9px] text-paper/50 uppercase">
                    Gone
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
