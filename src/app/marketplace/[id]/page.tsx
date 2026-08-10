import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { formatUsd, getAgent } from "@/lib/demo-data";
import { getServerSupabase } from "@/lib/supabase/server";
import { LISTING_SELECT, rowToListing } from "@/lib/listings-map";
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
    <div className="min-h-dvh pb-24 pt-[72px] md:pb-10">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 pt-6 text-sm text-[var(--muted)] hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>
      </div>

      <div className="relative mt-4 aspect-[16/9] w-full bg-[var(--nav-surface)] md:aspect-[21/9]">
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
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-8 md:grid-cols-[1fr_320px] md:px-6">
        <div>
          <p className="font-mono text-sm font-semibold text-gold">
            {formatUsd(listing.price)}
          </p>
          <p className="mt-2 font-mono text-[11px] font-bold tracking-wider text-[var(--muted)] uppercase">
            {listing.status} · {listing.propertyType}
            {listing.hasHoa ? " · HOA" : " · No HOA"}
          </p>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-[-0.02em] text-ink md:text-4xl">
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

          <div className="mt-8 grid grid-cols-2 gap-3 border-t border-hairline pt-6 font-mono text-xs sm:grid-cols-4">
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

        <aside className="h-fit rounded-xl border border-hairline bg-[var(--surface)] p-5 md:sticky md:top-24">
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
              className="flex h-11 items-center justify-center rounded-lg border border-hairline text-sm font-semibold text-ink"
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
    <div className="rounded-lg border border-hairline bg-[var(--surface)] px-3 py-3">
      <p className="text-[var(--muted)] uppercase">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </div>
  );
}
