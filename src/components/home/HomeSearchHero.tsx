"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Search } from "lucide-react";
import { ListingCard } from "@/components/ListingCard";
import type { DemoListing } from "@/lib/demo-data";
import { fetchMarketplaceListings } from "@/lib/supabase/listings";
import {
  DEFAULT_MARKET,
  REGION,
  REGION_CITIES,
  SERVICE_COUNTIES,
} from "@/lib/markets";
import { cn } from "@/lib/utils";

type Intent = "sale" | "rent" | "sold";

export function HomeSearchHero() {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent>("sale");
  const [query, setQuery] = useState<string>(DEFAULT_MARKET.label);
  const [featured, setFeatured] = useState<DemoListing[]>([]);
  const [featuredLoaded, setFeaturedLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchMarketplaceListings()
      .then((rows) => {
        if (active) setFeatured(rows.slice(0, 6));
      })
      .catch(() => {
        if (active) setFeatured([]);
      })
      .finally(() => {
        if (active) setFeaturedLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({
      q: query.trim() || DEFAULT_MARKET.label,
      intent,
    });
    router.push(`/marketplace?${params.toString()}`);
  }

  function searchArea(area: string) {
    const params = new URLSearchParams({
      q: `${area}, TX`,
      intent,
    });
    router.push(`/marketplace?${params.toString()}`);
  }

  return (
    <div className="bg-transparent pb-[var(--story-bottom-clearance)] text-ink">
      {/* Hero budget: brand + headline + support + one CTA group on full-bleed photo */}
      <section className="relative min-h-[78vh] overflow-hidden md:min-h-[85vh]">
        <Image
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2400&q=80"
          alt="East Texas home at dusk"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,21,37,0.68)_0%,rgba(14,30,56,0.72)_48%,rgba(9,21,37,0.92)_100%)]" />

        <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-5xl flex-col justify-center px-4 pb-16 pt-[calc(var(--story-safe-top)+3rem)] md:min-h-[85vh] md:px-6 md:pt-[calc(var(--story-safe-top)+4rem)]">
          <p className="font-serif text-3xl font-bold tracking-[-0.03em] text-paper md:text-4xl">
            <span className="text-[var(--brand-word)]">STORY</span>
            <span className="text-[var(--brand-home)]">HOME</span>
          </p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl font-semibold tracking-[-0.03em] text-paper md:text-6xl">
            Find your next home in East Texas.
          </h1>
          <p className="mt-3 max-w-xl text-base text-paper/80 md:text-lg">
            Search across seven launch counties — then grow with Story Home.
          </p>

          <div className="story-glass mt-8 overflow-hidden border-white/12">
            <div className="flex border-b border-white/10">
              {(
                [
                  ["sale", "For Sale"],
                  ["rent", "For Rent"],
                  ["sold", "Sold"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIntent(key)}
                  className={cn(
                    "story-press flex-1 px-3 py-3 text-sm font-semibold transition-colors md:px-4",
                    intent === key
                      ? "bg-gold text-navy"
                      : "text-paper/75 hover:text-paper",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <form
              onSubmit={onSearch}
              className="flex flex-col gap-3 p-3 md:flex-row md:items-center md:p-4"
            >
              <div className="story-well flex flex-1 items-center gap-3 border-white/10 px-4 py-3">
                <MapPin className="h-5 w-5 shrink-0 text-gold" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="City, ZIP, county, or address"
                  className="w-full bg-transparent text-base text-paper outline-none placeholder:text-paper/40"
                  aria-label="Search location"
                />
              </div>
              <button
                type="submit"
                data-story-sound="tap"
                className="story-press inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-gold px-6 text-sm font-bold text-navy"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-paper md:text-3xl">
              Launch counties
            </h2>
            <p className="mt-1 text-sm text-paper/65">
              Beginning rollout across seven East Texas counties.
            </p>
          </div>
          <Link
            href={`/marketplace?q=${encodeURIComponent(DEFAULT_MARKET.label)}`}
            className="hidden text-sm font-semibold text-gold hover:underline md:inline"
          >
            View all homes
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {SERVICE_COUNTIES.map((county) => (
            <button
              key={county.fips}
              type="button"
              onClick={() => searchArea(county.hubCity)}
              className="story-well story-press px-3 py-4 text-left transition-colors hover:border-[var(--hairline-interactive)]"
            >
              <p className="font-semibold text-paper">
                {county.name.replace(" County", "")}
              </p>
              <p className="mt-1 font-mono text-[11px] text-paper/50 uppercase">
                {county.hubCity}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {REGION_CITIES.slice(0, 6).map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => searchArea(area)}
              className="story-press text-sm font-medium text-paper/75 hover:text-gold"
            >
              {area}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-14 md:px-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-paper md:text-3xl">
                Homes in East Texas right now
              </h2>
              <p className="mt-1 text-sm text-paper/65">
                Featured listings — every card shows the agent behind it.
              </p>
            </div>
            <Link
              href={`/marketplace?q=${encodeURIComponent(REGION.label)}`}
              className="text-sm font-semibold text-gold hover:underline"
            >
              See marketplace
            </Link>
          </div>
          {featuredLoaded && featured.length === 0 ? (
            <div className="story-well p-10 text-center">
              <p className="font-serif text-xl font-bold text-paper">
                No listings yet
              </p>
              <p className="mt-2 text-sm text-paper/65">
                East Texas homes will appear here as local agents list them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {featured.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-14 md:grid-cols-3 md:px-6">
        <ToolCard
          title="Buy a home"
          body="Search East Texas listings with filters, saves, and agent profiles on every card."
          href={`/marketplace?q=${encodeURIComponent(DEFAULT_MARKET.label)}`}
          cta="Start searching"
        />
        <ToolCard
          title="Sell your home"
          body="Track views, clicks, and saves — then boost visibility with county-capped spots."
          href="/seller"
          cta="Seller portal"
        />
        <ToolCard
          title="For professionals"
          body="Network, referral board, and tools built by a realtor for East Texas agents."
          href="/network"
          cta="Enter pro network"
        />
      </section>
    </div>
  );
}

function ToolCard({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <Link href={href} className="story-card story-press block p-6">
      <h3 className="font-serif text-xl font-bold text-paper">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-paper/65">{body}</p>
      <span className="mt-5 inline-block text-sm font-semibold text-gold">
        {cta} →
      </span>
    </Link>
  );
}
