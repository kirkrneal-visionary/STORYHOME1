"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
import { HomeFilterWing } from "@/components/home/HomeFilterWing";
import { HomeGhostHint } from "@/components/home/HomeGhostHint";
import { ListingCard } from "@/components/ListingCard";
import type { DemoListing } from "@/lib/demo-data";
import {
  DEFAULT_SEARCH_FILTERS,
  countActiveFilters,
  type SearchFilters,
} from "@/lib/listing-filters";
import {
  authorizeSearchInput,
  planToMarketplaceParams,
} from "@/lib/search/interpret";
import { allowlistedAdvanced } from "@/lib/search/plan";
import {
  EMPTY_PRICE,
  RENTAL_INVENTORY_AVAILABLE,
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
import { cn } from "@/lib/utils";

const HOME_SEARCH_STATE_KEY = "story-home-wave-a-search";

export function HomeSearchHero() {
  const router = useRouter();
  const [mode, setMode] = useState<TransactionMode>("buy");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [buyPrice, setBuyPrice] = useState<PriceBounds>(EMPTY_PRICE);
  const [rentPrice, setRentPrice] = useState<PriceBounds>(EMPTY_PRICE);
  const [resetToken, setResetToken] = useState(0);
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
    setFilters(next);
    const price = readPrice(next);
    if (mode === "buy") setBuyPrice(price);
    else setRentPrice(price);
  }

  function clearFilters() {
    setBuyPrice(EMPTY_PRICE);
    setRentPrice(EMPTY_PRICE);
    setFilters({
      ...DEFAULT_SEARCH_FILTERS,
      query,
    });
    setResetToken((n) => n + 1);
  }

  function submitBuy(raw: string, nextFilters: SearchFilters = filters) {
    const plan = authorizeSearchInput({
      q: raw,
      advanced: {
        ...nextFilters,
        query: nextFilters.query,
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

  function onSearch(e: FormEvent) {
    e.preventDefault();
    if (filtersOpen) setFiltersOpen(false);
    if (mode === "rent") {
      submitRent();
      return;
    }
    const raw = query.trim() || filters.query;
    submitBuy(raw, filters);
  }

  function searchArea(area: string) {
    if (mode === "rent") {
      submitRent();
      return;
    }
    submitBuy(`${area}, TX`);
  }

  const ghostActive =
    !focused && !filtersOpen && query.trim().length === 0;
  const filterCount = countActiveFilters(filters);

  return (
    <div className="bg-transparent pb-[var(--story-bottom-clearance)] text-ink">
      <section className="relative min-h-[20.5rem] overflow-hidden md:min-h-[26rem]">
        <Image
          src="/brand/home-hero-meadow.png"
          alt="East Texas pine meadow at first light"
          fill
          priority
          className="object-cover object-[26%_36%] md:object-[42%_40%]"
          sizes="100vw"
        />

        <div className="relative z-10 flex items-center justify-center px-4 pb-8 pt-[calc(var(--story-safe-top)+1.25rem)] md:px-6 md:pb-10 md:pt-[calc(var(--story-safe-top)+2.25rem)]">
          <div className="relative mx-auto w-full max-w-3xl text-center">
            <h1 className="type-hero mx-auto max-w-3xl text-navy">
              Find your next place in{" "}
              <span className="whitespace-nowrap">East Texas.</span>
            </h1>

            <div className="relative mx-auto mt-5 w-full max-w-3xl text-left md:mt-6">
              <div
                className="story-home-search story-glass rounded-[var(--radius-lg)]"
                data-transaction-mode={mode}
              >
                <form
                  onSubmit={onSearch}
                  className="flex flex-col gap-1.5 p-2 md:flex-row md:items-center md:gap-2 md:p-2"
                >
                  <div
                    role="group"
                    aria-label="What you want to do"
                    className="flex w-fit shrink-0 rounded-full border border-hairline p-0.5"
                  >
                    {(
                      [
                        ["buy", "Buy"],
                        ["rent", "Rent"],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        data-available={
                          key === "rent" && !RENTAL_INVENTORY_AVAILABLE
                            ? "false"
                            : "true"
                        }
                        aria-pressed={mode === key}
                        aria-label={
                          key === "rent" && !RENTAL_INVENTORY_AVAILABLE
                            ? "Rent, not yet available"
                            : label
                        }
                        onClick={() => changeMode(key)}
                        className={cn(
                          "story-press type-control h-8 rounded-full px-2.5 text-xs font-semibold",
                          mode === key
                            ? "bg-gold text-navy"
                            : "text-paper/70 hover:text-paper",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="relative min-w-0 flex-1 md:min-w-[18rem]">
                    <div className="relative rounded-[var(--radius-md)] bg-[var(--env-0)] ring-1 ring-hairline">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder=""
                        autoComplete="off"
                        className="h-12 w-full rounded-[var(--radius-md)] bg-transparent pl-10 pr-3 text-base text-paper outline-none md:h-14 md:text-[1.05rem]"
                        aria-label="Search homes or describe what you want"
                      />
                      <HomeGhostHint active={ghostActive} mode={mode} />
                    </div>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] items-center gap-1.5 md:flex md:shrink-0 md:gap-2">
                    <button
                      type="button"
                      aria-expanded={filtersOpen}
                      aria-label={
                        filterCount > 0
                          ? `Filters, ${filterCount} selected`
                          : "Filters"
                      }
                      onClick={() => setFiltersOpen((v) => !v)}
                      className="story-home-filters-trigger story-press relative inline-flex h-12 w-12 flex-col items-center justify-center rounded-full border border-hairline text-paper"
                    >
                      <span className="text-[10px] font-bold leading-none tracking-wide">
                        Filters
                      </span>
                      {filterCount > 0 ? (
                        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-navy">
                          {filterCount}
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="submit"
                      data-story-sound="tap"
                      className="story-home-search-submit story-press inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-gold px-4 text-sm font-bold text-navy"
                    >
                      Search
                    </button>
                  </div>
                </form>
              </div>
              <HomeFilterWing
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                filters={filters}
                onChange={changeFilters}
                onClear={clearFilters}
                mode={mode}
                resetToken={resetToken}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 md:px-6 md:pt-10">
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
