"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock3,
  Eye,
  Heart,
  MousePointerClick,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import {
  BOOST_TIERS,
  formatUsdMonthly,
  getTierAvailability,
  type BoostTierId,
} from "@/lib/boost";
import {
  formatAvgTime,
  type ListingAnalytics,
  type SellerListing,
} from "@/lib/seller-portal";
import { formatUsd } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

type SellerPortalViewProps = {
  listing: SellerListing;
  analytics: ListingAnalytics;
};

export function SellerPortalView({
  listing,
  analytics,
}: SellerPortalViewProps) {
  const [selectedTier, setSelectedTier] = useState<BoostTierId | null>(null);
  const [activeBoost, setActiveBoost] = useState<BoostTierId | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const availability = useMemo(() => {
    // No boosts are sold yet (payments launch later), so every county slot is
    // open. Availability is computed against an empty active-boost set rather
    // than fabricated demo inventory.
    return Object.fromEntries(
      BOOST_TIERS.map((tier) => [
        tier.id,
        getTierAvailability(listing.countyFips, tier, []),
      ]),
    ) as Record<
      BoostTierId,
      ReturnType<typeof getTierAvailability>
    >;
  }, [listing.countyFips]);

  const selected = BOOST_TIERS.find((t) => t.id === selectedTier) ?? null;

  function handleActivate() {
    if (!selectedTier || !availability[selectedTier].isAvailable) return;
    // Prototype: simulates activation. Stripe + server-side slot lock come with MLS.
    setActiveBoost(selectedTier);
    setConfirmOpen(false);
  }

  return (
    <div className="min-h-dvh bg-[var(--background)] pb-16">
      <header className="border-b border-hairline bg-[var(--nav-surface)]/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-6">
          <div>
            <p className="font-sans text-lg font-extrabold tracking-tight">
              <span className="text-[var(--brand-word)]">STORY</span>
              <span className="text-[var(--brand-home)]">HOME</span>
              <span className="align-super text-[8px] text-[var(--brand-home)]">
                TM
              </span>
            </p>
            <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-[var(--muted)]">
              SELLER CLIENT PORTAL
            </p>
          </div>
          <Link
            href="/seller"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" /> Exit
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-start">
          <section>
            <p className="font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
              Your listing · {listing.countyName}
            </p>
            <h1 className="mt-2 font-serif text-3xl font-bold text-ink md:text-4xl">
              {listing.addressSerif}
            </h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {listing.city}, {listing.state} · {formatUsd(listing.price)} ·{" "}
              {listing.daysOnMarket} days on market
            </p>
          </section>

          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-hairline bg-[color-mix(in_srgb,var(--navy)_85%,black)]">
            {listing.photoUrl ? (
              <Image
                src={listing.photoUrl}
                alt={listing.addressSerif}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 420px"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mono text-[11px] tracking-wider text-paper/60 uppercase">
                No photo yet
              </div>
            )}
          </div>
        </div>

        {/* Analytics */}
        <section className="mt-10">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">
                How your home is performing online
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Live Story Home activity for buyers viewing your listing.
              </p>
            </div>
            {activeBoost && (
              <span className="rounded-full bg-gold px-3 py-1 font-mono text-[11px] font-bold text-navy uppercase">
                Boost active · {activeBoost}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat
              icon={<Eye className="h-4 w-4" />}
              label="Views"
              value={analytics.views.toLocaleString()}
              hint={`+${analytics.viewsThisWeek} this week`}
            />
            <Stat
              icon={<MousePointerClick className="h-4 w-4" />}
              label="Clicks"
              value={analytics.clicks.toLocaleString()}
              hint="Card & gallery opens"
            />
            <Stat
              icon={<Heart className="h-4 w-4" />}
              label="Saves"
              value={analytics.saves.toLocaleString()}
              hint={`+${analytics.savesThisWeek} this week`}
            />
            <Stat
              icon={<RefreshCcw className="h-4 w-4" />}
              label="Repeat viewers"
              value={analytics.repeatViewers.toLocaleString()}
              hint="Came back again"
            />
            <Stat
              icon={<Clock3 className="h-4 w-4" />}
              label="Avg time viewed"
              value={formatAvgTime(analytics.avgTimeViewedSeconds)}
              hint="Per session"
              className="col-span-2 md:col-span-1"
            />
          </div>
        </section>

        {/* Boost */}
        <section className="mt-12">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" />
            <h2 className="font-serif text-2xl font-bold text-ink">
              Boost your listing
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            Increase visibility beyond standard marketing. Spots are limited{" "}
            <strong className="font-semibold text-ink">per county</strong> so
            every boost stays scarce and fair — not an unlimited ad auction.
            Inventory is enforced against county capacity once MLS listings are
            connected.
          </p>
          <p className="mt-2 font-mono text-[11px] tracking-wider text-[var(--muted)] uppercase">
            Market segment · {listing.countyName} ({listing.state})
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {BOOST_TIERS.map((tier) => {
              const avail = availability[tier.id];
              const isSelected = selectedTier === tier.id;
              const isActive = activeBoost === tier.id;
              const disabled = !avail.isAvailable && !isActive;

              return (
                <button
                  key={tier.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    setSelectedTier(tier.id);
                  }}
                  className={cn(
                    "rounded-xl border p-5 text-left transition-all",
                    isSelected || isActive
                      ? "border-gold bg-[color-mix(in_srgb,var(--gold)_14%,var(--surface))] shadow-[0_12px_30px_rgba(14,30,56,0.08)]"
                      : "border-hairline bg-[var(--surface)] hover:-translate-y-0.5",
                    disabled && "cursor-not-allowed opacity-55 hover:translate-y-0",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-serif text-xl font-bold text-ink">
                        {tier.name}
                      </p>
                      <p className="mt-1 font-mono text-sm font-semibold text-ink">
                        {formatUsdMonthly(tier.priceMonthly)}
                      </p>
                    </div>
                    {tier.badge && (
                      <span className="rounded bg-navy px-2 py-0.5 font-mono text-[10px] font-bold text-paper uppercase">
                        {tier.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm font-medium text-ink">
                    {tier.reachLabel}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                    {tier.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
                    <span className="font-mono text-[11px] text-[var(--muted)] uppercase">
                      {avail.remaining} of {avail.capacity} spots left
                    </span>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-soft">
                        <Check className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : disabled ? (
                      <span className="text-xs font-semibold text-[var(--muted)]">
                        County full
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-gold">
                        Select
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-hairline bg-[var(--surface)] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[var(--muted)]">
              {selected
                ? `Ready to activate ${selected.name} (${formatUsdMonthly(selected.priceMonthly)}) in ${listing.countyName}.`
                : "Select a boost tier to continue. Payment runs through Stripe in production."}
            </p>
            <button
              type="button"
              disabled={!selected || Boolean(activeBoost)}
              onClick={() => {
                if (!selected || activeBoost) return;
                setConfirmOpen(true);
              }}
              className={cn(
                "h-11 shrink-0 rounded-lg px-5 text-sm font-bold transition-opacity",
                selected && !activeBoost
                  ? "bg-gold text-navy hover:opacity-90"
                  : "cursor-not-allowed bg-gold/30 text-navy/50",
              )}
            >
              {activeBoost
                ? "Boost already active"
                : selected
                  ? `Activate ${selected.name}`
                  : "Select a tier first"}
            </button>
          </div>
        </section>
      </main>

      {confirmOpen && selected && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-hairline bg-navy-soft p-6 text-paper shadow-xl">
            <h3 className="font-serif text-2xl font-bold text-paper">
              Confirm boost
            </h3>
            <p className="mt-2 text-sm text-paper/70">
              Activate <strong className="text-paper">{selected.name}</strong>{" "}
              for {listing.addressSerif} in {listing.countyName} at{" "}
              {formatUsdMonthly(selected.priceMonthly)}.
            </p>
            <p className="mt-3 font-mono text-[11px] text-paper/50 uppercase">
              Prototype mode — no card charged. Slot reserved in demo inventory.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="h-11 flex-1 rounded-lg border border-hairline text-sm font-semibold text-paper"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActivate}
                className="h-11 flex-1 rounded-lg bg-gold text-sm font-bold text-navy"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-hairline bg-[var(--surface)] p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-[var(--muted)]">
        {icon}
        <span className="font-mono text-[11px] font-semibold tracking-wider uppercase">
          {label}
        </span>
      </div>
      <p className="mt-3 font-serif text-3xl font-bold text-ink">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
    </div>
  );
}
