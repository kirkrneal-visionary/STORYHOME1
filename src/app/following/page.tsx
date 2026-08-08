import type { Metadata } from "next";
import Link from "next/link";
import { ListingCard } from "@/components/ListingCard";
import { DEMO_AGENT, DEMO_LISTINGS } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Following" };

export default function FollowingPage() {
  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-3xl font-bold text-ink">Following</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Homes from agents you follow.
        </p>

        <div className="mt-8 rounded-xl border border-hairline bg-[var(--surface)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                href={`/agents/${DEMO_AGENT.id}`}
                className="font-semibold text-ink hover:underline"
              >
                {DEMO_AGENT.fullName}
              </Link>
              <p className="font-mono text-[11px] text-[var(--muted)] uppercase">
                {DEMO_AGENT.primaryMarketCity}
              </p>
            </div>
            <span className="rounded-full bg-gold/25 px-3 py-1 font-mono text-[11px] font-semibold text-navy">
              3 new listings this week
            </span>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {DEMO_LISTINGS.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </div>
  );
}
