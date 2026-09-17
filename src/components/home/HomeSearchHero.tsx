"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Pause, Play, Search } from "lucide-react";
import { HomeAdvancedSearch } from "@/components/home/HomeAdvancedSearch";
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
import { fetchMarketplaceListings } from "@/lib/supabase/listings";
import {
  DEFAULT_MARKET,
  REGION,
  REGION_CITIES,
  SERVICE_COUNTIES,
} from "@/lib/markets";
import { cn } from "@/lib/utils";

type Intent = "sale" | "sold";

const HOME_SEARCH_STATE_KEY = "story-home-wave-a-search";

export function HomeSearchHero() {
  const router = useRouter();
  const [intent, setIntent] = useState<Intent>("sale");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [ghostPaused, setGhostPaused] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_SEARCH_FILTERS);
  const [featured, setFeatured] = useState<DemoListing[]>([]);
  const [featuredLoaded, setFeaturedLoaded] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(HOME_SEARCH_STATE_KEY);
      if (raw) {
        const row = JSON.parse(raw) as {
          query?: unknown;
          intent?: unknown;
          filters?: unknown;
          ghostPaused?: unknown;
        };
        if (typeof row.query === "string") setQuery(row.query);
        if (row.intent === "sale" || row.intent === "sold") setIntent(row.intent);
        if (row.filters) {
          setFilters({
            ...DEFAULT_SEARCH_FILTERS,
            ...allowlistedAdvanced(row.filters),
          });
        }
        if (row.ghostPaused === true) setGhostPaused(true);
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
        JSON.stringify({ query, intent, filters, ghostPaused }),
      );
    } catch {
      /* private mode */
    }
  }, [sessionReady, query, intent, filters, ghostPaused]);

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
    !focused &&
    !advancedOpen &&
    !ghostPaused &&
    query.trim().length === 0;
  const advancedCount = countActiveFilters(filters);

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
              <div className="story-home-search story-glass rounded-[var(--radius-lg)]">
                <form
                  onSubmit={onSearch}
                  className="flex flex-col gap-1.5 p-2 md:flex-row md:items-center md:gap-2 md:p-2"
                >
                  <div className="flex items-center justify-between gap-2 md:contents">
                    <div
                      role="group"
                      aria-label="Listing status"
                      className="flex shrink-0 rounded-full border border-hairline p-0.5"
                    >
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
                            "story-press type-control h-8 rounded-full px-2.5 text-xs font-semibold",
                            intent === key
                              ? "bg-gold text-navy"
                              : "text-paper/70 hover:text-paper",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <GhostPauseButton
                      paused={ghostPaused}
                      onToggle={() => setGhostPaused((v) => !v)}
                      className="md:hidden"
                    />
                  </div>
                  <div className="relative min-w-0 flex-1">
                    <div className="relative rounded-[var(--radius-md)] bg-[var(--env-0)] ring-1 ring-hairline">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gold" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        placeholder=""
                        autoComplete="off"
                        className="h-12 w-full rounded-[var(--radius-md)] bg-transparent pl-10 pr-11 text-base text-paper outline-none"
                        aria-label="Search homes or describe what you want"
                      />
                      <HomeGhostHint active={ghostActive} />
                      <GhostPauseButton
                        paused={ghostPaused}
                        onToggle={() => setGhostPaused((v) => !v)}
                        className="absolute right-1 top-1/2 hidden -translate-y-1/2 md:inline-flex"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 md:flex md:shrink-0 md:gap-2">
                    <button
                      type="button"
                      aria-expanded={advancedOpen}
                      onClick={() => setAdvancedOpen((v) => !v)}
                      className="story-press inline-flex h-11 items-center justify-center gap-1 rounded-[var(--radius-md)] border border-hairline px-2.5 text-xs font-semibold text-paper"
                    >
                      Advanced
                      {advancedCount > 0 ? (
                        <span className="rounded-full bg-gold px-1.5 text-[10px] font-bold text-navy">
                          {advancedCount}
                        </span>
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="submit"
                      data-story-sound="tap"
                      className="story-press inline-flex h-11 items-center justify-center rounded-[var(--radius-md)] bg-gold px-4 text-sm font-bold text-navy"
                    >
                      Search
                    </button>
                  </div>
                </form>
              </div>
              <HomeAdvancedSearch
                open={advancedOpen}
                onClose={() => setAdvancedOpen(false)}
                applied={{ ...filters, query: query || filters.query }}
                onApply={(next) => {
                  setFilters(next);
                  if (next.query.trim()) setQuery(next.query);
                  setAdvancedOpen(false);
                }}
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

function GhostPauseButton({
  paused,
  onToggle,
  className,
}: {
  paused: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={paused}
      aria-label={paused ? "Play examples" : "Pause examples"}
      title={paused ? "Play examples" : "Pause examples"}
      onClick={onToggle}
      className={cn(
        "story-press inline-flex h-9 w-9 items-center justify-center rounded-full text-paper/80 hover:bg-paper/10 hover:text-paper",
        className,
      )}
    >
      {paused ? (
        <Play className="h-3.5 w-3.5 fill-current" />
      ) : (
        <Pause className="h-3.5 w-3.5" />
      )}
    </button>
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
