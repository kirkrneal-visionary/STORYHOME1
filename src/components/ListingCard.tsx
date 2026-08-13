"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, MessageSquare, Star } from "lucide-react";
import { SaveToSuiteModal } from "@/components/suites/SaveToSuiteModal";
import { useSuites } from "@/components/SuitesContext";
import {
  type DemoListing,
  formatUsd,
  getAgent,
} from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type ListingCardProps = {
  listing: DemoListing;
  dense?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  /** Persist marketplace workspace before drilling into detail. */
  onNavigate?: () => void;
};

/** Color-code the status badge like HAR (green active, orange pending, red sold). */
function statusTone(status: string): string {
  if (status === "Active") return "bg-teal text-paper";
  if (status === "Sold") return "bg-red-500 text-paper";
  if (status.includes("Option") || status.includes("Under Contract"))
    return "bg-amber-500 text-navy";
  if (status === "Withdrawn" || status === "Expired" || status === "Terminated")
    return "bg-[var(--muted)] text-paper";
  return "bg-gold text-navy";
}

export function ListingCard({
  listing,
  dense = false,
  selected = false,
  onSelect,
  onNavigate,
}: ListingCardProps) {
  const agent = listing.agent ?? getAgent(listing.agentId);
  const { isListingInAnySuite } = useSuites();
  const saved = isListingInAnySuite(listing.id);
  const [suiteOpen, setSuiteOpen] = useState(false);
  const [following, setFollowing] = useState(false);

  return (
    <article
      id={`listing-card-${listing.id}`}
      onMouseEnter={onSelect}
      className={cn(
        "story-card group overflow-hidden",
        dense ? "p-3" : "p-4 hover:-translate-y-0.5",
        selected
          ? "border-[color-mix(in_srgb,var(--gold)_70%,var(--hairline))] shadow-[var(--elev-raise),var(--ring-focus)]"
          : "",
      )}
    >
      <Link
        href={`/marketplace/${listing.id}`}
        className="block"
        onClick={() => onNavigate?.()}
      >
        <div
          className="relative aspect-video w-full overflow-hidden rounded-lg bg-[var(--nav-surface)]"
          style={{ viewTransitionName: `listing-photo-${listing.id}` }}
        >
          {listing.photoUrl ? (
            <Image
              src={listing.photoUrl}
              alt={listing.addressSerif}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, 480px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-mono text-xs text-paper/50">
              No photo
            </div>
          )}
          <span className="absolute bottom-3 left-3 rounded bg-navy px-2.5 py-1 font-mono text-sm font-semibold text-paper shadow-md">
            {formatUsd(listing.price)}
          </span>
          <span
            className={cn(
              "absolute top-3 left-3 max-w-[70%] truncate rounded px-2 py-1 font-mono text-[10px] font-bold tracking-wide uppercase shadow-md",
              statusTone(listing.status),
            )}
          >
            {listing.status}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSuiteOpen(true);
            }}
            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-paper text-ink/50 shadow-md transition-colors hover:text-gold"
            aria-label={saved ? "Manage suites" : "Save to suite"}
          >
            <Heart
              className={cn("h-4 w-4", saved && "fill-gold text-gold")}
            />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="font-serif text-xl font-bold text-ink">
            {listing.addressSerif}
          </h3>
          <p className="mt-1 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
            {listing.city} · {listing.countyName.replace(" County", "")} ·{" "}
            {listing.propertyType}
          </p>
          <p className="mt-1 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
            {listing.beds} Beds · {listing.baths} Baths ·{" "}
            {listing.sqft.toLocaleString()} Sqft · {listing.lotSize}
            {listing.sqft > 0 && (
              <> · ${Math.round(listing.price / listing.sqft)}/sqft</>
            )}
          </p>
        </div>
      </Link>

      <div className="my-4 flex items-center justify-between border-t border-hairline pt-3">
        <Link
          href={`/agents/${agent.id}`}
          className="flex min-w-0 items-center gap-3"
        >
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-navy",
              agent.avatarTone,
            )}
          >
            {agent.initials}
          </div>
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-ink">
              {agent.fullName}
            </h4>
            <div className="-mt-0.5 flex items-center gap-1 text-xs font-medium text-[var(--muted)]">
              <Star className="h-3 w-3 fill-gold text-gold" />
              <span className="font-mono">{agent.starRating.toFixed(2)}</span>
            </div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setFollowing((v) => !v)}
          className={cn(
            "story-press h-7 rounded-md border px-3 text-xs font-semibold transition-colors",
            following
              ? "border-teal bg-teal text-paper"
              : "border-gold/50 text-gold hover:bg-gold hover:text-navy",
          )}
        >
          {following ? "Following" : "Follow"}
        </button>
      </div>

      <div className="flex items-center gap-4 font-mono text-[11px] tracking-wider text-[var(--muted)] uppercase">
        <span>♡ {listing.likeCount} Likes</span>
        <span>❑ {listing.saveCount + (saved ? 1 : 0)} Saves</span>
        <span className="inline-flex items-center gap-1">
          <MessageSquare className="h-3 w-3" /> {listing.commentCount} Comments
        </span>
      </div>

      {suiteOpen && (
        <SaveToSuiteModal
          listingId={listing.id}
          listingTitle={listing.addressSerif}
          onClose={() => setSuiteOpen(false)}
        />
      )}
    </article>
  );
}
