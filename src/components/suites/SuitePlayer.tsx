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
import { fetchListingsByIds } from "@/lib/supabase/listings";
import { cn } from "@/lib/utils";

type SuitePlayerProps = {
  suiteId: string;
};

export function SuitePlayer({ suiteId }: SuitePlayerProps) {
  const { suites, removeListingFromSuite } = useSuites();
  const suite = suites.find((s) => s.id === suiteId);
  const [listings, setListings] = useState<DemoListing[]>([]);

  useEffect(() => {
    const ids = suite?.listingIds ?? [];
    if (ids.length === 0) {
      setListings([]);
      return;
    }
    let active = true;
    fetchListingsByIds(ids)
      .then((rows) => {
        if (!active) return;
        // Preserve the saved order.
        const byId = new Map(rows.map((r) => [r.id, r]));
        setListings(ids.map((id) => byId.get(id)).filter(Boolean) as DemoListing[]);
      })
      .catch(() => active && setListings([]));
    return () => {
      active = false;
    };
  }, [suite?.listingIds]);

  const [index, setIndex] = useState(0);
  const [shareNote, setShareNote] = useState("");

  if (!suite) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-serif text-3xl font-bold text-ink">
          Suite not found
        </h1>
        <Link href="/saved" className="mt-6 inline-block text-gold">
          Back to albums
        </Link>
      </div>
    );
  }

  const activeSuite = suite;
  const current = listings[index] ?? null;

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
          <h1 className="mt-1 font-serif text-4xl font-bold text-ink">
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

      {listings.length === 0 ? (
        <div className="story-well mt-12 px-6 py-16 text-center">
          <p className="font-serif text-2xl font-bold text-ink">Empty album</p>
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
            {current && (
              <div className="grid md:grid-cols-[1.2fr_0.8fr]">
                <div className="relative aspect-[4/3] bg-[var(--nav-surface)] md:aspect-auto md:min-h-[420px]">
                  {current.photoUrl ? (
                    <Image
                      src={current.photoUrl}
                      alt={current.addressSerif}
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
                      {formatUsd(current.price)}
                    </p>
                    <h2 className="mt-2 font-serif text-3xl font-bold text-ink">
                      {current.addressSerif}
                    </h2>
                    <p className="mt-2 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
                      {current.city} · {current.beds} bd · {current.baths} ba ·{" "}
                      {current.sqft.toLocaleString()} sqft
                    </p>
                    <p className="mt-4 text-sm leading-relaxed text-[var(--muted)]">
                      {current.description}
                    </p>
                  </div>
                  <div className="mt-8 flex flex-wrap gap-2">
                    <Link
                      href={`/marketplace/${current.id}`}
                      className="inline-flex h-11 items-center rounded-xl bg-gold px-5 text-sm font-bold text-navy"
                    >
                      Open listing
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        removeListingFromSuite(suite.id, current.id);
                        setIndex((i) => Math.max(0, Math.min(i, listings.length - 2)));
                      }}
                      className="story-press inline-flex h-11 items-center gap-2 rounded-[var(--radius-md)] border border-hairline px-4 text-sm font-semibold text-[var(--muted)]"
                    >
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
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
                {index + 1} / {listings.length}
              </p>
              <button
                type="button"
                disabled={index >= listings.length - 1}
                onClick={() =>
                  setIndex((i) => Math.min(listings.length - 1, i + 1))
                }
                className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-ink disabled:opacity-30"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
            {listings.map((listing, i) => (
              <button
                key={listing.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "relative h-20 w-28 shrink-0 overflow-hidden rounded-[var(--radius-md)] border bg-[var(--env-1)]",
                  i === index ? "border-gold" : "border-hairline opacity-70",
                )}
              >
                {listing.photoUrl && (
                  <Image
                    src={listing.photoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
