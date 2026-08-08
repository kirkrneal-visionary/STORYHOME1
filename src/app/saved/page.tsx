import type { Metadata } from "next";
import { ListingCard } from "@/components/ListingCard";
import { DEMO_LISTINGS } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Saved" };

export default function SavedPage() {
  const listings = DEMO_LISTINGS.slice(0, 2);

  return (
    <div className="min-h-dvh px-4 pb-24 pt-[96px] md:px-6 md:pb-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="font-serif text-3xl font-bold text-ink">Saved homes</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your bookmarked listings — same cards as Marketplace, pre-filtered.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </div>
    </div>
  );
}
