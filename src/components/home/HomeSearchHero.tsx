"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HomeSearchHub } from "@/components/home/HomeSearchHub";
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
import { allowlistedAdvanced } from "@/lib/search/plan";
import {
  EMPTY_PRICE,
  SALE_SEARCH_STATUSES,
  asPriceBounds,
  readPrice,
  storedTransactionMode,
  withPrice,
  type PriceBounds,
  type TransactionMode,
} from "@/lib/search/transaction";
import { fetchMarketplaceListings } from "@/lib/supabase/listings";
import {
  DEFAULT_MARKET,
  REGION,
  REGION_CITIES,
  SERVICE_COUNTIES,
} from "@/lib/markets";
import {
  countySlugFromName,
  publicCountyPath,
} from "@/lib/geo/county-route";

const HOME_SEARCH_STATE_KEY = "story-home-wave-a-search";

export function HomeSearchHero() {
  const router = useRouter();
  const [mode, setMode] = useState<TransactionMode>("buy");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [buyPrice, setBuyPrice] = useState<PriceBounds>(EMPTY_PRICE);
  const [rentPrice, setRentPrice] = useState<PriceBounds>(EMPTY_PRICE);
  const [featured, setFeatured] = useState<DemoListing[]>([]);
  const [featuredLoaded, setFeaturedLoaded] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HOME_SEARCH_STATE_KEY);
      if (raw) {
        const row = JSON.parse(raw) as {
          query?: unknown;
          mode?: unknown;
          intent?: unknown;
          filters?: unknown;
          buyPrice?: unknown;
          rentPrice?: unknown;
        };
        if (typeof row.query === "string") setQuery(row.query);
        const nextMode = storedTransactionMode(
          row.mode ?? (row.intent === "rent" ? "rent" : "buy"),
        );
        setMode(nextMode);
        const nextFilters = {
          ...DEFAULT_SEARCH_FILTERS,
          ...(row.filters ? allowlistedAdvanced(row.filters) : {}),
          statuses: DEFAULT_SEARCH_FILTERS.statuses,
          keyword: "",
        };
        const storedBuy = asPriceBounds(row.buyPrice);
        const storedRent = asPriceBounds(row.rentPrice);
        const buy =
          storedBuy.min || storedBuy.max
            ? storedBuy
            : nextMode === "buy"
              ? readPrice(nextFilters)
              : EMPTY_PRICE;
        const rent =
          storedRent.min || storedRent.max ? storedRent : EMPTY_PRICE;
        setBuyPrice(buy);
        setRentPrice(rent);
        setFilters(withPrice(nextFilters, nextMode === "buy" ? buy : rent));
      }
    } catch {
      /* ignore broken session rows */
    } finally {
      setSessionReady(true);
    }
  }, []);

  useEffect(() => {
    if (!sessionReady) return;
    try {
      sessionStorage.setItem(
        HOME_SEARCH_STATE_KEY,
        JSON.stringify({
          query,
          mode,
          filters,
          buyPrice,
          rentPrice,
        }),
      );
    } catch {
      /* private mode */
    }
  }, [sessionReady, query, mode, filters, buyPrice, rentPrice]);

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

  function changeMode(next: TransactionMode) {
    if (next === mode) return;
    const current = readPrice(filters);
    const nextBuy = mode === "buy" ? current : buyPrice;
    const nextRent = mode === "rent" ? current : rentPrice;
    setBuyPrice(nextBuy);
    setRentPrice(nextRent);
    setMode(next);
    setFilters(withPrice(filters, next === "buy" ? nextBuy : nextRent));
  }

  function changeFilters(next: SearchFilters) {
    const clean = { ...next, keyword: "", query };
    setFilters(clean);
    const price = readPrice(clean);
    if (mode === "buy") setBuyPrice(price);
    else setRentPrice(price);
  }

  function submitBuy(raw: string, nextFilters: SearchFilters = filters) {
    const plan = authorizeSearchInput({
      q: raw,
      advanced: {
        ...nextFilters,
        query: nextFilters.query,
        keyword: "",
        priceMin: nextFilters.priceMin,
        priceMax: nextFilters.priceMax,
        statuses: [...SALE_SEARCH_STATUSES],
      },
    });
    router.push(`/marketplace?${planToMarketplaceParams(plan).toString()}`);
  }

  function submitRent() {
    router.push("/rent");
  }

  function onSearch(nextFilters: SearchFilters = filters) {
    if (mode === "rent") {
      submitRent();
      return;
    }
    const raw = query.trim() || nextFilters.query;
    submitBuy(raw, { ...nextFilters, keyword: "" });
  }

  function searchArea(area: string) {
    if (mode === "rent") {
      submitRent();
      return;
    }
    submitBuy(`${area}, TX`);
  }

  return (
    <div className="bg-transparent pb-[var(--story-bottom-clearance)] text-ink">
      <section className="story-home-hero" data-home-hero="">
        <div className="story-home-hero-photo">
          <Image
            src="/brand/storyhome-meadow-hero.png"
            alt="East Texas pine meadow at first light"
            fill
            priority
            className="object-cover object-[22%_72%] md:object-[28%_60%]"
            sizes="(max-width: 390px) 390px, (max-width: 768px) 768px, (max-width: 1440px) 1440px, 1672px"
          />
        </div>
        <div className="story-home-hero-stage">
          <h1 className="type-hero story-home-hero-headline mx-auto max-w-3xl text-center text-navy">
            Find your next place in{" "}
            <span className="whitespace-nowrap">East Texas.</span>
          </h1>
          <div className="story-home-hero-safe">
            <HomeSearchHub
              transaction={mode}
              onTransaction={changeMode}
              query={query}
              onQuery={setQuery}
              filters={filters}
              onFilters={changeFilters}
              onSubmitSearch={onSearch}
            />
          </div>
        </div>
      </section>

      <div className="story-home-hero-join" data-home-hero-join="" aria-hidden />

      <section
        className="mx-auto max-w-6xl px-4 pb-8 pt-4 md:px-6 md:pt-6"
        data-launch-counties=""
        data-ui-4a="county-discovery"
      >
        <div data-home-story-attachment="" aria-hidden />
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="type-section text-paper">
              Launch counties
            </h2>
            <p className="mt-1 text-sm text-paper/65">
              Explore each county. Homes stay one step away.
            </p>
          </div>
          <Link
            href={`/marketplace?q=${encodeURIContent(DEFAULT_MARKET.label)}`}
            className="hidden min-h-11 items-center text-sm font-semibold text-gold hover:underline md:inline-flex"
          >
            View all homes
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 lg:grid-cols-7">
          {SERVICE_COUNTIES.map((county) => {
            const slug = countySlugFromName(county.name);
            if (!slug) return null;
            return (
              <Link
                key={county.fips}
                href={publicCountyPath(slug)}
                data-home-county-card=""
                data-home-county={slug}
                aria-label={`Explore ${county.name}`}
                className="story-well story-press flex min-h-11 flex-col justify-center px-3 py-3 text-left md:py-4"
              >
                <p className="font-semibold text-paper">
                  {county.name.replace(" County", "")}
                </p>
                <p className="type-meta mt-1 text-paper/50">
                  {county.hubCity}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
          {REGION_CITIES.slice(0, 6).map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => searchArea(area)}
              className="story-press inline-flex min-h-11 items-center text-sm font-medium text-paper/75 hover:text-gold"
            >
              {area}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-hairline" data-home-featured="">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="type-section text-paper">
                Homes in East Texas right now
              </h2>
              <p className="mt-1 text-sm text-paper/65">
                Live listings from local agents, when they exist.
              </p>
            </div>
            <Link
              href={`/marketplace?q=${encodeURIContent(REGION.label)}`}
              className="inline-flex min-h-11 shrink-0 items-center text-sm font-semibold text-gold hover:underline"
            >
              See marketplace
            </Link>
          </div>
          {featuredLoaded && featured.length === 0 ? (
            <div className="story-well px-5 py-8 text-center">
              <p className="type-card-title text-paper">
                No homes listed yet
              </p>
              <p className="mt-2 text-sm text-paper/65">
                East Texas listings will appear here as agents publish them.
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

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-10 md:grid-cols-3 md:px-6 md:py-12">
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
