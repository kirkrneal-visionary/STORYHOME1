import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  FEATURED_LISTING,
  SAMPLE_LISTINGS,
} from "@/lib/sample-listings";

type PageProps = {
  params: Promise<{ id: string }>;
};

function findListing(id: string) {
  if (FEATURED_LISTING.id === id) return FEATURED_LISTING;
  return SAMPLE_LISTINGS.find((listing) => listing.id === id);
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = findListing(id);
  return {
    title: listing?.title ?? "Listing",
  };
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const listing = findListing(id);
  if (!listing) notFound();

  return (
    <article className="animate-fade-up">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Back to Marketplace
      </Link>

      <div className="relative mt-6 w-screen max-w-[100vw] left-1/2 -translate-x-1/2 aspect-[16/10] overflow-hidden md:aspect-[21/9]">
        <Image
          src={listing.image}
          alt={listing.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
      </div>

      <div className="mt-8 max-w-2xl">
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          {listing.tag}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] text-ink md:text-4xl">
          {listing.title}
        </h1>
        <p className="mt-2 text-base text-[var(--muted)]">{listing.location}</p>
        <p className="mt-5 font-display text-2xl font-semibold text-ink">
          {listing.price}
        </p>
        <p className="mt-6 text-base leading-relaxed text-[var(--muted)]">
          Preview listing detail. Full storytelling, floor plans, and advisor
          handoff will connect here once Supabase data is wired.
        </p>
      </div>
    </article>
  );
}
