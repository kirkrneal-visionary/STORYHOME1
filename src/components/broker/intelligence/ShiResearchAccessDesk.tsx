"use client";

import { ShiCorridorsAskPanel } from "@/components/broker/intelligence/ShiCorridorsAskPanel";
import { ShiCorridorsPropertyComparePanel } from "@/components/broker/intelligence/ShiCorridorsPropertyComparePanel";
import type { CorridorAskAnswer } from "@/lib/shi/corridor-ask";
import type { RankedSite } from "@/lib/shi/corridor-exposure";
import {
  rankedSiteFactLine,
  samePublishedTrafficNote,
} from "@/lib/shi/corridor-exposure";
import { PARCEL_POSITION_COPY } from "@/lib/shi/parcel-position";
import type { PropertyCompareResult } from "@/lib/shi/corridor-property-compare";
import { PROPERTY_COMPARE_MAX } from "@/lib/shi/corridor-property-compare";
import type { ResearchModeChip } from "@/lib/shi/research-modes";
import { RESEARCH_MODES, type ResearchModeId } from "@/lib/shi/research-modes";
import type { MultifamilyReviewResult } from "@/lib/shi/multifamily-review";
import type { ModeReviewResult } from "@/lib/shi/research-mode-reason";
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
  researchMode = "general",
  modeReview = null,
  mfReview = null,
  onChip,
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
  researchMode?: ResearchModeId;
  modeReview?: ModeReviewResult | null;
  mfReview?: MultifamilyReviewResult | null;
  onChip?: (chip: ResearchModeChip) => void;
  className?: string;
}) {
  const modeCfg = RESEARCH_MODES[researchMode];
  const sameHighwayNote =
    modeReview?.tieNote ?? samePublishedTrafficNote(rankedSites);
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
            {modeCfg.tone} Same facts — this mode changes what matters.
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
          <ShiCorridorsAskPanel
            answer={askAnswer}
            onAsk={onAsk}
            chips={modeCfg.chips}
            onChip={onChip}
          />
        ) : null}

        {tab === "sites" ? (
          <div className="space-y-3" data-research-access-sites>
            <p className="text-[11px] leading-snug text-[var(--muted)]">
              Draw or select a market frame, then run {modeCfg.reviewLabel}.
              Find Strongest Sites is this mode’s review — not a universal score.
              Lots on the same highway can share one traffic number.
            </p>
            <button
              type="button"
              onClick={onFindStrongest}
              disabled={!hasActiveFrame || strongestLoading}
              className="inline-flex h-9 items-center rounded-lg bg-navy px-3 text-xs font-bold text-gold disabled:opacity-40"
              data-research-find-strongest
            >
              {strongestLoading ? "Reviewing…" : modeCfg.reviewCta}
            </button>
            {!hasActiveFrame ? (
              <p className="text-[11px] text-[var(--muted)]">
                Select or draw a market frame first.
              </p>
            ) : null}
            {strongestNote ? (
              <p className="text-[11px] text-[var(--muted)]">{strongestNote}</p>
            ) : null}
            {modeReview?.excludedWhy ? (
              <p
                className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-[11px] text-ink"
                data-mode-insufficient-evidence
              >
                {modeReview.excludedWhy}
              </p>
            ) : null}
            {mfReview ? (
              <div
                className="space-y-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2"
                data-mf-site-review
              >
                <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
                  Multifamily site review
                </p>
                <p className="text-[12px] text-ink">
                  {mfReview.parcelsReviewed.toLocaleString("en-US")} parcels
                  reviewed. {mfReview.closerStudyCount.toLocaleString("en-US")} have
                  enough land and evidence for closer study.
                </p>
                <ul className="space-y-1.5">
                  {mfReview.groups.map((g) => (
                    <li key={g.id} data-mf-group={g.id}>
                      <p className="text-[11px] font-semibold text-ink">
                        {g.label} · {g.propIds.length}
                      </p>
                      <p className="text-[10px] text-[var(--muted)]">{g.helper}</p>
                    </li>
                  ))}
                </ul>
                {mfReview.missingGroups.map((g) => (
                  <p
                    key={g.id}
                    className="text-[10px] text-[var(--muted)]"
                    data-mf-group-missing={g.id}
                  >
                    {g.reason}
                  </p>
                ))}
              </div>
            ) : null}
            {modeReview?.frame.notable.length ? (
              <p className="text-[11px] text-[var(--muted)]" data-mode-frame-summary>
                Study area: {modeReview.frame.parcelCount} parcels
                {modeReview.frame.medianAcres != null
                  ? ` · median ${modeReview.frame.medianAcres.toLocaleString("en-US", { maximumFractionDigits: 1 })} ac`
                  : ""}
                {modeReview.frame.notable.length
                  ? ` · ${modeReview.frame.notable.join(" · ")}`
                  : ""}
              </p>
            ) : null}
            {rankedSites.length > 0 ? (
              <ul className="space-y-2" data-research-ranked-sites>
                {sameHighwayNote ? (
                  <li
                    className="rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-[11px] text-ink"
                    data-same-highway-traffic-note
                  >
                    {sameHighwayNote}
                  </li>
                ) : null}
                {rankedSites.map((site) => {
                  const inCompare = comparePropIds.has(site.propId);
                  const review = modeReview?.items.find(
                    (i) => i.propId === site.propId,
                  );
                  return (
                    <li
                      key={site.propId}
                      className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-hairline px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">
                          {review?.rank != null ? `#${review.rank} ` : ""}
                          {site.situsAddress?.trim() ||
                            site.ownerName ||
                            `CAD #${site.propId}`}
                        </p>
                        {review?.distinction ? (
                          <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
                            {review.distinction}
                          </p>
                        ) : null}
                        <p
                          className="text-[11px] text-ink"
                          data-site-position-facts
                        >
                          {review?.whySurfaced || rankedSiteFactLine(site)}
                        </p>
                        <p className="font-mono text-[10px] text-[var(--muted)]">
                          Access {PARCEL_POSITION_COPY.accessNotVerified.toLowerCase()}
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
                Add at least two sites from the Sites tab. Same highway traffic
                can match — the table fills frontage, a second road, crossing,
                acres, and access (not verified).
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
