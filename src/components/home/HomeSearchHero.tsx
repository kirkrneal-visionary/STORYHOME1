"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Search } from "lucide-react";
import { HomeAdvancedSearch } from "@/components/home/HomeAdvancedSearch";
import { HomeGhostHint } from "@/components/home/HomeGhostHint";
import { ListingCard } from "@/components/ListingCard";
import type { DemoListing } from "@/lib/demo-data";
import {
  DEFAULT_SEARCH_FILTERS,
  type SearchFilters,
} from "@/lib/listing-filters";
import {
  authorizeSearchInput,
  planToMarketplaceParams,
} from "@/lib/search/interpret";
import { fetchMarketplaceListings } from "@/lib/supabase/listings";
import {
  DEFAULT_MARKET,
  REGION,
  REGION_CITIES,
  SERVICE_COUNTIES,
} from "@/lib/markets";
import { cn } from "@/lib/utils";

type Intent = "sale" | "sold";

export function HomeSearchHero() {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent>("sale");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
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

  function submitPlan(raw: string) {
    // Local first-party plan. Marketplace stays usable if APIs or a future paid interpreter are off.
    const plan = authorizeSearchInput({
      q: raw,
      advanced: {
        ...filters,
        query: filters.query,
        statuses:
          intent === "sold"
            ? ["Sold"]
            : filters.statuses.length
              ? filters.statuses
              : ["Active", "Option Pending Continue to Show"],
      },
    });
    router.push(`/marketplace?${planToMarketplaceParams(plan).toString()}`);
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    submitPlan(query);
  }

  function searchArea(area: string) {
    submitPlan(`${area}, TX`);
  }

  const ghostActive =
    !focused && !advancedOpen && query.trim().length === 0;

  return (
    <div className="bg-transparent pb-[var(--story-bottom-clearance)] text-ink">
      <section className="relative min-h-[78vh] overflow-hidden md:min-h-[85vh]">
        <Image
          src="/brand/home-hero-meadow.png"
          alt="East Texas pine meadow at first light"
          fill
          priority
          className="object-cover object-[26%_36%] md:object-[42%_40%]"
          sizes="100vw"
        />

        <div className="relative z-10 mx-auto flex min-h-[78vh] max-w-5xl flex-col justify-end px-4 pb-14 pt-[calc(var(--story-safe-top)+2.5rem)] md:min-h-[85vh] md:justify-center md:px-6 md:pt-[calc(var(--story-safe-top)+4rem)] md:pb-20">
          <div className="max-w-xl">
            <p className="story-wordmark text-[var(--type-brand)]">
              <span className="text-[var(--brand-word)] !text-navy">STORY</span>
              <span className="text-[var(--brand-home)]">HOME</span>
            </p>
            <h1 className="type-hero mt-3 max-w-lg text-navy">
              Find your next place in East Texas.
            </h1>
          </div>

          <div className="relative mt-8 w-full max-w-xl">
            <div className="story-glass overflow-hidden rounded-[var(--radius-lg)] border border-navy/10 bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] shadow-[var(--elev-2)]">
              <div className="flex border-b border-navy/10">
                {(
                  [
                    ["sale", "For sale"],
                    ["sold", "Sold"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setIntent(key)}
                    className={cn(
                      "story-press type-control min-h-11 flex-1 px-3 py-3 font-semibold transition-colors md:px-4",
                      intent === key
                        ? "bg-gold text-navy"
                        : "text-navy/80 hover:text-navy",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={onSearch}
                className="flex flex-col gap-2 p-3 md:flex-row md:items-center"
              >
                <div className="relative flex min-h-12 flex-1 items-center">
                  <Search className="pointer-events-none absolute left-3 h-4 w-4 text-gold" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder=""
                    autoComplete="off"
                    className="h-12 w-full rounded-[var(--radius-md)] bg-transparent pl-11 pr-3 text-base text-navy outline-none"
                    aria-label="Search homes or describe what you want"
                  />
                  <HomeGhostHint active={ghostActive} />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-expanded={advancedOpen}
                    onClick={() => setAdvancedOpen((v) => !v)}
                    className="story-press inline-flex h-12 items-center justify-center gap-1 rounded-[var(--radius-md)] border border-navy/15 px-3 text-sm font-semibold text-navy"
                  >
                    Advanced
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="submit"
                    data-story-sound="tap"
                    className="story-press inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] bg-gold px-5 text-sm font-bold text-navy md:flex-none"
                  >
                    Search
                  </button>
                </div>
              </form>
            </div>
            <HomeAdvancedSearch
              open={advancedOpen}
              onClose={() => setAdvancedOpen(false)}
              filters={filters}
              onChange={setFilters}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 md:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="type-section text-paper">
              Launch counties
            </h2>
            <p className="mt-1 text-sm text-paper/65">
              Beginning rollout across seven East Texas counties.
            </p>
          </div>
          <Link
            href={`/marketplace?q=${encodeURIContent(DEFAULT_MARKET.label)}`}
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
              <p className="type-meta mt-1 text-paper/50">
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
              <h2 className="type-section text-paper">
                Homes in East Texas right now
              </h2>
              <p className="mt-1 text-sm text-paper/65">
                Featured listings — every card shows the agent behind it.
              </p>
            </div>
            <Link
              href={`/marketplace?q=${encodeURIContent(REGION.label)}`}
              className="text-sm font-semibold text-gold hover:underline"
            >
              See marketplace
            </Link>
          </div>
          {featuredLoaded && featured.length === 0 ? (
            <div className="story-well p-10 text-center">
              <p className="type-card-title text-paper">
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
          href={`/marketplace?q=${encodeURIContent(DEFAULT_MARKET.label)}`}
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

function encodeURIContent(value: string) {
  return encodeURIComponent(value);
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
      <h3 className="type-card-title text-paper">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-paper/65">{body}</p>
      <span className="mt-5 inline-block text-sm font-semibold text-gold">
        {cta} →
      </span>
    </Link>
  );
}
