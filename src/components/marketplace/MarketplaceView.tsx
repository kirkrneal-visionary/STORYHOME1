import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Bath, BedDouble, Maximize2 } from "lucide-react";
import {
  FEATURED_LISTING,
  SAMPLE_LISTINGS,
} from "@/lib/sample-listings";

export function MarketplaceView() {
  return (
    <div className="space-y-16 md:space-y-20">
      {/* First viewport: one composition — brand, headline, line, CTA, dominant image */}
      <section className="animate-fade-up">
        <p className="font-ui text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
          Story Home
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-[-0.03em] text-ink md:text-5xl">
          Homes with a story worth telling.
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--muted)] md:text-lg">
          A curated marketplace for distinctive residences — private, polished,
          and ready for serious buyers.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="#curated"
            className="inline-flex items-center gap-2 rounded-md bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition-transform duration-300 hover:scale-[1.02]"
          >
            Browse curated homes
            <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>
          <Link
            href="/messages"
            className="inline-flex items-center gap-2 rounded-md border border-hairline px-5 py-2.5 text-sm font-medium text-ink transition-colors duration-300 hover:bg-[var(--nav-hover-bg)]"
          >
            Talk to an advisor
          </Link>
        </div>

        <div className="relative mt-10 w-screen max-w-[100vw] left-1/2 -translate-x-1/2 overflow-hidden">
          <div className="relative aspect-[16/10] w-full md:aspect-[21/9]">
            <Image
              src={FEATURED_LISTING.image}
              alt={FEATURED_LISTING.imageAlt}
              fill
              priority
              sizes="100vw"
              className="object-cover animate-image-rise"
            />
          </div>
        </div>
      </section>

      <section id="curated" className="animate-fade-up-delay">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink md:text-3xl">
              Curated now
            </h2>
            <p className="mt-2 text-sm text-[var(--muted)] md:text-base">
              Sample listings for visual preview — live data comes next.
            </p>
          </div>
        </div>

        <article className="group mb-10">
          <Link href={`/marketplace/${FEATURED_LISTING.id}`} className="block">
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              <Image
                src={FEATURED_LISTING.image}
                alt={FEATURED_LISTING.imageAlt}
                fill
                sizes="(max-width: 768px) 100vw, 1100px"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
            </div>
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-ui text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  {FEATURED_LISTING.tag}
                </p>
                <h3 className="mt-1 font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
                  {FEATURED_LISTING.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {FEATURED_LISTING.location}
                </p>
              </div>
              <div className="md:text-right">
                <p className="font-display text-xl font-semibold text-ink">
                  {FEATURED_LISTING.price}
                </p>
                <ListingMeta
                  beds={FEATURED_LISTING.beds}
                  baths={FEATURED_LISTING.baths}
                  sqft={FEATURED_LISTING.sqft}
                />
              </div>
            </div>
          </Link>
        </article>

        <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
          {SAMPLE_LISTINGS.map((listing) => (
            <li key={listing.id}>
              <Link href={`/marketplace/${listing.id}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={listing.image}
                    alt={listing.imageAlt}
                    fill
                    sizes="(max-width: 768px) 100vw, 360px"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="mt-3">
                  <p className="font-ui text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                    {listing.tag}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-ink">
                    {listing.title}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {listing.location}
                  </p>
                  <p className="mt-3 font-display text-lg font-semibold text-ink">
                    {listing.price}
                  </p>
                  <ListingMeta
                    beds={listing.beds}
                    baths={listing.baths}
                    sqft={listing.sqft}
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ListingMeta({
  beds,
  baths,
  sqft,
}: {
  beds: number;
  baths: number;
  sqft: string;
}) {
  return (
    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
      <span className="inline-flex items-center gap-1">
        <BedDouble className="h-3.5 w-3.5" strokeWidth={1.75} />
        {beds} bd
      </span>
      <span className="inline-flex items-center gap-1">
        <Bath className="h-3.5 w-3.5" strokeWidth={1.75} />
        {baths} ba
      </span>
      <span className="inline-flex items-center gap-1">
        <Maximize2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        {sqft} sqft
      </span>
    </p>
  );
}
