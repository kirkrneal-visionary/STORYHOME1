"use client";

import { ShiCorridorsAskPanel } from "@/components/broker/intelligence/ShiCorridorsAskPanel";
import { ShiCorridorsPropertyComparePanel } from "@/components/broker/intelligence/ShiCorridorsPropertyComparePanel";
import type { CorridorAskAnswer } from "@/lib/shi/corridor-ask";
import type { RankedSite } from "@/lib/shi/corridor-exposure";
import { exposureBandLabel } from "@/lib/shi/corridor-exposure";
import type { PropertyCompareResult } from "@/lib/shi/corridor-property-compare";
import { PROPERTY_COMPARE_MAX } from "@/lib/shi/corridor-property-compare";
import { cn } from "@/lib/utils";

export type ResearchAccessDeskTab = "ask" | "sites" | "compare";

/**
 * R2 — Access desk inside Research (Ask · Sites · Compare).
 * Same APIs as the old Corridors room — no data loss.
 */
export function ShiResearchAccessDesk({
  tab,
  onTabChange,
  askAnswer,
  onAsk,
  hasActiveFrame,
  strongestLoading,
  strongestNote,
  rankedSites,
  onFindStrongest,
  onToggleCompareSite,
  comparePropIds,
  compare,
  onClearCompare,
  className,
}: {
  tab: ResearchAccessDeskTab;
  onTabChange: (tab: ResearchAccessDeskTab) => void;
  askAnswer: CorridorAskAnswer | null;
  onAsk: (query: string) => void;
  hasActiveFrame: boolean;
  strongestLoading: boolean;
  strongestNote: string;
  rankedSites: RankedSite[];
  onFindStrongest: () => void;
  onToggleCompareSite: (site: RankedSite) => void;
  comparePropIds: Set<string>;
  compare: PropertyCompareResult | null;
  onClearCompare: () => void;
  className?: string;
}) {
  const tabs: { id: ResearchAccessDeskTab; label: string }[] = [
    { id: "ask", label: "Ask" },
    { id: "sites", label: "Sites" },
    { id: "compare", label: "Compare" },
  ];

  return (
    <section
      data-research-access-desk="r2"
      data-research-access-tab={tab}
      className={cn("story-surface p-4", className)}
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.14em] text-gold uppercase">
            Access desk
          </p>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Traffic · frontage · strongest sites · compare — same facts as before,
            inside Research.
          </p>
        </div>
        <div className="flex flex-wrap gap-1" data-research-access-tabs>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              className={cn(
                "story-map-tool",
                tab === t.id && "story-map-tool-active",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {tab === "ask" ? (
          <ShiCorridorsAskPanel answer={askAnswer} onAsk={onAsk} />
        ) : null}

        {tab === "sites" ? (
          <div className="space-y-3" data-research-access-sites>
            <p className="text-[11px] leading-snug text-[var(--muted)]">
              Draw or select a market frame on the map, then rank parcels by
              commercial exposure (planning counts — not live traffic).
            </p>
            <button
              type="button"
              onClick={onFindStrongest}
              disabled={!hasActiveFrame || strongestLoading}
              className="inline-flex h-9 items-center rounded-lg bg-navy px-3 text-xs font-bold text-gold disabled:opacity-40"
              data-research-find-strongest
            >
              {strongestLoading ? "Ranking…" : "Find Strongest Sites"}
            </button>
            {!hasActiveFrame ? (
              <p className="text-[11px] text-[var(--muted)]">
                Select or draw a market frame first.
              </p>
            ) : null}
            {strongestNote ? (
              <p className="text-[11px] text-[var(--muted)]">{strongestNote}</p>
            ) : null}
            {rankedSites.length > 0 ? (
              <ul className="space-y-2" data-research-ranked-sites>
                {rankedSites.map((site) => {
                  const inCompare = comparePropIds.has(site.propId);
                  return (
                    <li
                      key={site.propId}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-hairline px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          #{site.rank}{" "}
                          {site.situsAddress?.trim() ||
                            site.ownerName ||
                            `CAD #${site.propId}`}
                        </p>
                        <p className="font-mono text-[10px] text-[var(--muted)]">
                          {exposureBandLabel(site.commercial.band)} ·{" "}
                          {site.commercial.score}/{site.commercial.maxScore}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleCompareSite(site)}
                        className={cn(
                          "shrink-0 rounded-md border px-2 py-1 font-mono text-[10px] font-semibold uppercase",
                          inCompare
                            ? "border-gold/40 bg-gold/10 text-gold"
                            : "border-hairline text-ink",
                        )}
                      >
                        {inCompare
                          ? "In compare"
                          : comparePropIds.size >= PROPERTY_COMPARE_MAX
                            ? "Compare full"
                            : "Compare"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}

        {tab === "compare" ? (
          <div data-research-access-compare>
            {compare ? (
              <ShiCorridorsPropertyComparePanel
                compare={compare}
                onClear={onClearCompare}
              />
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Add at least two sites from the Sites tab to compare traffic,
                frontage, and intersection on one table.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
