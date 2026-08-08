import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import { DEMO_AGENT, DEMO_LISTINGS } from "@/lib/demo-data";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: id === DEMO_AGENT.id ? DEMO_AGENT.fullName : "Agent",
  };
}

export default async function AgentProfilePage({ params }: PageProps) {
  const { id } = await params;
  if (id !== DEMO_AGENT.id) notFound();
  const listings = DEMO_LISTINGS.filter((l) => l.agentId === DEMO_AGENT.id);

  return (
    <div className="min-h-dvh pb-24 pt-[72px] md:pb-10">
      <div className="relative h-40 bg-navy md:h-52">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(240,185,59,0.18),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(27,90,80,0.35),transparent_40%)]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="-mt-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex items-end gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-[var(--background)] bg-[color-mix(in_srgb,var(--gold)_28%,var(--paper))] text-2xl font-bold text-navy">
              {DEMO_AGENT.initials}
            </div>
            <div className="pb-1">
              <h1 className="font-serif text-3xl font-bold text-ink">
                {DEMO_AGENT.fullName}
              </h1>
              <p className="font-mono text-xs tracking-wider text-[var(--muted)] uppercase">
                {DEMO_AGENT.professionalRole} · {DEMO_AGENT.primaryMarketCity}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/messages"
              className="flex h-11 items-center rounded-lg bg-[var(--accent)] px-5 text-sm font-semibold text-[var(--accent-contrast)]"
            >
              Message
            </Link>
            <button
              type="button"
              className="flex h-11 items-center rounded-lg border border-hairline px-5 text-sm font-semibold text-ink"
            >
              Follow
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end gap-6 border-b border-hairline pb-6">
          <div>
            <p className="font-mono text-[11px] tracking-wider text-[var(--muted)] uppercase">
              Reputation
            </p>
            <p className="font-serif text-5xl font-bold text-ink">
              {DEMO_AGENT.reputationScore}
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-[var(--muted)]">
            <Star className="h-4 w-4 fill-gold text-gold" />
            <span className="font-mono">{DEMO_AGENT.starRating.toFixed(2)}</span>
            <span>· {DEMO_AGENT.reviewCount} reviews</span>
          </div>
        </div>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
          {DEMO_AGENT.bio}
        </p>

        <h2 className="mt-10 font-serif text-2xl font-bold text-ink">
          Active Listings
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-8 md:grid-cols-2">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </div>
  );
}
