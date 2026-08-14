import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { formatUsd, getAgent } from "@/lib/demo-data";
import { getServerSupabase } from "@/lib/supabase/server";
import { LISTING_SELECT, rowToListing } from "@/lib/listings-map";
import { AnalyticsPageBeacon } from "@/components/analytics/AnalyticsPageBeacon";
import { BackToMarketplace } from "@/components/marketplace/BackToMarketplace";
import { InquireButton } from "@/components/marketplace/InquireButton";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function loadListing(id: string) {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle();
  return data ? rowToListing(data) : null;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await loadListing(id);
  return { title: listing?.addressSerif ?? "Listing" };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const listing = await loadListing(id);
  if (!listing) notFound();
  const agent = listing.agent ?? getAgent(listing.agentId);

  return (
    <div className="min-h-dvh pb-[var(--story-bottom-clearance)] md:pb-10">
      <AnalyticsPageBeacon
        event="listing_opened"
        props={{ listing_id: listing.id }}
      />

      {/* Full-bleed photo — overlays under living header (Instagram-class) */}
      <div
        className="relative aspect-[4/3] w-full bg-[var(--env-1)] md:aspect-[21/9]"
        style={{ viewTransitionName: `listing-photo-${listing.id}` }}
      >
        {listing.photoUrl ? (
          <Image
            src={listing.photoUrl}
            alt={listing.addressSerif}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-sm text-paper/50">
            No photo provided
          </div>
        )}
        <div className="absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-[color-mix(in_srgb,var(--env-0)_75%,transparent)] to-transparent px-4 pb-10 pt-[calc(var(--story-safe-top)+0.35rem)]">
          <BackToMarketplace overlay />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-7 md:grid-cols-[1fr_300px] md:gap-10 md:px-6 md:py-8">
        <div>
          <p className="font-mono text-sm font-semibold text-gold">
            {formatUsd(listing.price)}
          </p>
          <p className="mt-2 font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
            {listing.status} · {listing.propertyType}
            {listing.hasHoa ? " · HOA" : " · No HOA"}
          </p>
          <h1 className="mt-2 font-serif text-[length:var(--type-property)] font-bold tracking-[-0.02em] text-ink md:text-4xl">
            {listing.addressSerif}
          </h1>
          <p className="mt-2 font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
            {listing.city}, {listing.countyName} · {listing.beds} beds ·{" "}
            {listing.baths} baths · {listing.sqft.toLocaleString()} sqft · Built{" "}
            {listing.yearBuilt}
          </p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            {listing.description}
          </p>

          <div className="story-well mt-8 grid grid-cols-2 gap-x-4 gap-y-0 sm:grid-cols-4">
            <Spec label="Beds" value={String(listing.beds)} />
            <Spec label="Baths" value={String(listing.baths)} />
            <Spec label="Sqft" value={listing.sqft.toLocaleString()} />
            <Spec label="Lot" value={listing.lotSize} />
            <Spec label="Office" value={listing.hasOffice ? "Yes" : "No"} />
            <Spec label="Garage" value={listing.hasGarage ? "Yes" : "No"} />
            <Spec label="Pool" value={listing.hasPool ? "Yes" : "No"} />
            <Spec label="HOA" value={listing.hasHoa ? "Yes" : "No"} />
          </div>
        </div>

        <aside className="story-surface h-fit p-5 md:sticky md:top-[calc(var(--story-safe-top)+0.75rem)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] font-bold text-navy">
              {agent.initials}
            </div>
            <div>
              <Link
                href={`/agents/${agent.id}`}
                className="font-semibold text-ink hover:underline"
              >
                {agent.fullName}
              </Link>
              <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                <Star className="h-3 w-3 fill-gold text-gold" />
                <span className="font-mono">{agent.starRating.toFixed(2)}</span>
                <span>· {agent.reviewCount} reviews</span>
              </div>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            <InquireButton
              listingId={listing.id}
              agentId={listing.agentId}
              listingLabel={listing.addressSerif}
            />
            <Link
              href={`/agents/${agent.id}`}
              className="story-press flex h-11 items-center justify-center rounded-[var(--radius-md)] border border-hairline text-sm font-semibold text-ink"
            >
              View profile
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-hairline px-3 py-3 last:border-b-0 sm:[&:nth-child(4)]:border-b-0">
      <p className="font-mono text-[10px] tracking-wider text-[var(--muted)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
