"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarClock, KeyRound } from "lucide-react";
import {
  DEMO_SELLER_CLIENTS,
  SELLER_STAGE_ORDER,
  getListingForClient,
  type SellerClient,
  type SellerStage,
} from "@/lib/broker-clients";
import { formatUsd } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const STAGE_TONE: Record<SellerStage, string> = {
  Prospect: "bg-[var(--surface)] text-[var(--muted)]",
  "Listing prep":
    "bg-[color-mix(in_srgb,var(--gold)_22%,var(--surface))] text-gold",
  Active: "bg-gold text-navy",
  "Offer review": "bg-teal text-paper",
  "Under contract": "bg-teal-soft text-paper",
  Closed: "bg-[var(--muted)]/20 text-[var(--muted)]",
};

export function MySellersView() {
  const [stage, setStage] = useState<SellerStage | "All">("All");

  const sellers = useMemo(
    () =>
      stage === "All"
        ? DEMO_SELLER_CLIENTS
        : DEMO_SELLER_CLIENTS.filter((s) => s.stage === stage),
    [stage],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">My Sellers</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {DEMO_SELLER_CLIENTS.length} listings and prospects in your book.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["All", ...SELLER_STAGE_ORDER] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStage(item)}
              className={cn(
                "h-8 shrink-0 rounded-full px-3 font-mono text-[11px] font-semibold tracking-wide uppercase transition-colors",
                stage === item
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "border border-hairline text-[var(--muted)] hover:text-ink",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {sellers.length === 0 ? (
        <EmptyState text="No sellers in this stage yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </div>
  );
}

function SellerCard({ seller }: { seller: SellerClient }) {
  const listing = getListingForClient(seller.listingId);

  return (
    <article className="overflow-hidden rounded-2xl border border-hairline bg-[var(--surface)]">
      <div className="flex gap-4 p-5">
        {listing && (
          <div className="relative hidden h-20 w-28 shrink-0 overflow-hidden rounded-lg border border-hairline sm:block">
            <Image
              src={listing.photoUrl}
              alt={listing.addressSerif}
              fill
              className="object-cover"
              sizes="112px"
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-serif text-lg font-bold text-ink">
                {seller.name}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">
                {listing
                  ? `${listing.addressSerif} · ${listing.city}, ${listing.countyName}`
                  : "Listing being prepared"}
              </p>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase",
                STAGE_TONE[seller.stage],
              )}
            >
              {seller.stage}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-[var(--muted)]">
            <span className="font-bold text-ink">
              {formatUsd(seller.listPrice)}
            </span>
            <span>
              {seller.daysOnMarket > 0
                ? `${seller.daysOnMarket} days on market`
                : "Not yet listed"}
            </span>
            {seller.accessCode && (
              <span className="inline-flex items-center gap-1">
                <KeyRound className="h-3 w-3" />
                {seller.accessCode}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-hairline bg-[var(--background)] px-5 py-3">
        <p className="flex items-start gap-2 text-sm text-ink">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>
            <span className="font-semibold">Next:</span> {seller.nextAction}
          </span>
        </p>
        <div className="mt-3 flex items-center justify-between">
          <span className="font-mono text-[11px] text-[var(--muted)]">
            {seller.lastActivity}
          </span>
          {seller.accessCode ? (
            <Link
              href={`/seller/portal/${seller.accessCode.toLowerCase()}`}
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-contrast)]"
            >
              Open seller portal
            </Link>
          ) : listing ? (
            <Link
              href={`/marketplace/${listing.id}`}
              className="rounded-md border border-hairline px-3 py-1.5 text-xs font-semibold text-ink"
            >
              View listing
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-[var(--surface)] p-10 text-center text-sm font-medium text-[var(--muted)]">
      {text}
    </div>
  );
}
