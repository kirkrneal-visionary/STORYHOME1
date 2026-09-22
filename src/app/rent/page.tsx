import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Rent" };

export default function RentPage() {
  return (
    <div className="story-room-pad min-h-dvh px-4 pb-[var(--story-bottom-clearance)] md:px-6">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="type-page-title text-ink">Rentals are not listed yet</h1>
        <p className="mt-3 text-base leading-relaxed text-[var(--muted)]">
          Story Home does not have rental inventory. This page does not search
          apartments or houses for rent.
        </p>
        <Link
          href="/marketplace?q=Lufkin%2C%20TX&intent=sale"
          className="story-press story-cta-primary mt-8"
        >
          Search homes for sale
        </Link>
      </div>
    </div>
  );
}
