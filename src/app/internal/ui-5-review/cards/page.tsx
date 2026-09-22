import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ListingCard } from "@/components/ListingCard";
import {
  isUi5OwnerReviewAllowed,
  isUi5OwnerReviewHost,
  ui5OwnerReviewListings,
} from "@/lib/ui-5-owner-review";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "UI-5 owner review",
  robots: { index: false, follow: false },
};

export default async function Ui5OwnerReviewCardsPage() {
  const host = (await headers()).get("host");
  if (!isUi5OwnerReviewAllowed() || !isUi5OwnerReviewHost(host)) notFound();
  const listings = ui5OwnerReviewListings();

  return (
    <div
      data-ui-5-owner-review="cards"
      className="story-market-canvas mx-auto min-h-dvh max-w-xl px-3 pb-[var(--story-bottom-clearance)] pt-[calc(var(--story-safe-top)+0.75rem)]"
    >
      <p className="font-mono text-[11px] tracking-[0.14em] text-[var(--muted)] uppercase">
        Owner review fixture
      </p>
      <p className="mt-2 text-sm text-paper/65">
        Listing-card density only. Not live Marketplace inventory.
      </p>
      <div className="mt-5 grid grid-cols-1 gap-2">
        {listings.map((listing, index) => (
          <ListingCard
            key={listing.id}
            listing={listing}
            dense
            selected={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
