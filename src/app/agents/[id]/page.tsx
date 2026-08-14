import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { getServerSupabase } from "@/lib/supabase/server";
import { LISTING_SELECT, rowToAgent, rowToListing } from "@/lib/listings-map";

type PageProps = {
  params: Promise<{ id: string }>;
};

const PROFILE_SELECT =
  "id, full_name, initials, professional_role, primary_market_city, reputation_score, star_rating, review_count, bio, avatar_url";

async function loadAgent(id: string) {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const agent = rowToAgent(data);
  const { data: listingRows } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("agent_id", id)
    .order("created_at", { ascending: false });
  return { agent, listings: (listingRows ?? []).map(rowToListing) };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await loadAgent(id);
  return { title: result?.agent?.fullName ?? "Agent" };
}

export default async function AgentProfilePage({ params }: PageProps) {
  const { id } = await params;
  const result = await loadAgent(id);
  if (!result?.agent) notFound();
  const { agent, listings } = result;

  return (
    <div className="min-h-dvh pb-[var(--story-bottom-clearance)] pt-[var(--story-safe-top)] md:pb-10">
      <div className="relative h-40 bg-[var(--env-1)] md:h-52">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(240,185,59,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(27,90,80,0.35),transparent_40%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="-mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--background)] bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-2xl font-bold text-navy">
              {agent.initials}
            </div>
            <div className="pb-1">
              <h1 className="font-serif text-3xl font-bold text-ink">
                {agent.fullName}
              </h1>
              <p className="font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
                {agent.professionalRole} · {agent.primaryMarketCity}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/marketplace"
              className="flex h-11 items-center rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              View listings
            </Link>
            <Link
              href="/network"
              className="flex h-11 items-center rounded-lg border border-hairline px-5 text-sm font-semibold text-ink"
            >
              Find agents
            </Link>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end gap-6 border-b border-hairline pb-6">
          <div>
            <p className="font-mono text-[11px] tracking-wider text-[var(--muted)] uppercase">
              Reputation
            </p>
            <p className="font-serif text-5xl font-bold text-ink">
              {agent.reputationScore || "—"}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-[var(--muted)]">
            <Star className="h-4 w-4 fill-gold text-gold" />
            <span className="font-mono">{agent.starRating.toFixed(2)}</span>
            <span>· {agent.reviewCount} reviews</span>
          </div>
        </div>

        {agent.bio && (
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
            {agent.bio}
          </p>
        )}

        <h2 className="mt-10 font-serif text-2xl font-bold text-ink">
          Listings
        </h2>
        {listings.length === 0 ? (
          <p className="story-well mt-4 border-dashed p-8 text-center text-sm text-[var(--muted)]">
            No active listings yet.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
