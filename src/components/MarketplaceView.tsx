"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ListingCard } from "@/components/ListingCard";
import { DEMO_LISTINGS } from "@/lib/demo-data";
import { DEFAULT_MARKET } from "@/lib/markets";
import { cn } from "@/lib/utils";

const CHIPS = [
  "All",
  "Following",
  "Saved",
  "Price",
  "Beds",
  "Baths",
  "New this week",
] as const;

export default function MarketplaceView() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || DEFAULT_MARKET.label;
  const intent = searchParams.get("intent") || "sale";

  const [chip, setChip] = useState<(typeof CHIPS)[number]>("All");
  const [bedsFilter, setBedsFilter] = useState("Any");
  const [query, setQuery] = useState(initialQuery);

  const listings = useMemo(() => {
    const q = query.trim().toLowerCase();
    let next = DEMO_LISTINGS;

    if (q) {
      next = next.filter(
        (l) =>
          l.city.toLowerCase().includes(q.replace(", tx", "").trim()) ||
          l.addressSerif.toLowerCase().includes(q) ||
          "houston".includes(q) ||
          q.includes("houston") ||
          q.includes(l.city.toLowerCase()),
      );
      // Keep results visible for East Texas market browsing even when area names differ
      if (next.length === 0 && (q.includes("houston") || q.includes("tx"))) {
        next = DEMO_LISTINGS;
      }
    }

    if (bedsFilter === "4+") {
      next = next.filter((l) => l.beds >= 4);
    } else if (bedsFilter !== "Any") {
      next = next.filter((l) => l.beds === Number(bedsFilter));
    }

    return next;
  }, [bedsFilter, query]);

  const intentLabel =
    intent === "rent" ? "For Rent" : intent === "sold" ? "Sold" : "For Sale";

  return (
    <div className="flex min-h-dvh pb-16 pt-[72px] md:pb-0">
      <aside className="fixed top-[72px] bottom-0 left-0 hidden w-[340px] overflow-y-auto border-r border-hairline bg-[var(--surface)] p-6 xl:block">
        <h2 className="mb-6 font-serif text-2xl font-semibold text-ink">
          Find Your Story
        </h2>

        <div className="space-y-6">
          <div>
            <label className="mb-2 block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
              Location
            </label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="City, neighborhood, or zip"
              className="h-11 w-full rounded-lg border border-hairline bg-[var(--background)] px-4 text-sm font-medium text-ink outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
              Price Range
            </label>
            <div className="grid grid-cols-2 gap-3 font-mono">
              <input
                type="text"
                defaultValue="$500,000"
                className="h-10 w-full rounded-md border border-hairline bg-[var(--background)] px-3 text-sm text-ink"
              />
              <input
                type="text"
                defaultValue="$1,500,000"
                className="h-10 w-full rounded-md border border-hairline bg-[var(--background)] px-3 text-sm text-ink"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] font-semibold tracking-wider text-[var(--muted)] uppercase">
              Bedrooms
            </label>
            <div className="grid grid-cols-5 gap-1 text-xs font-medium">
              {["Any", "1", "2", "3", "4+"].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBedsFilter(b)}
                  className={cn(
                    "h-9 rounded-md border transition-colors",
                    bedsFilter === b
                      ? "border-gold bg-gold text-navy"
                      : "border-hairline text-ink hover:border-gold/40",
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:px-6 xl:ml-[340px]">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search city, neighborhood, or address"
              className="h-12 w-full rounded-xl border border-hairline bg-[var(--surface)] px-4 text-sm text-ink outline-none focus:border-gold xl:hidden"
            />
          </div>

          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {CHIPS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setChip(item)}
                className={cn(
                  "h-8 shrink-0 rounded-full px-3 font-mono text-[11px] font-semibold tracking-wide uppercase transition-colors",
                  chip === item
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "border border-hairline text-[var(--muted)] hover:text-ink",
                )}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mb-5 flex items-center justify-between gap-3">
            <span className="font-mono text-xs tracking-widest text-[var(--muted)] uppercase">
              {intentLabel} · {query} · {listings.length}{" "}
              {listings.length === 1 ? "home" : "homes"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
