"use client";

import type { ParcelLocationIntel } from "@/lib/shi/corridor-frontage";
import {
  formatApproxFrontageFt,
  formatApproxIntersectionM,
} from "@/lib/shi/corridor-frontage";
import { associateParcelTraffic } from "@/lib/shi/corridor-parcel-traffic";
import type { TrafficStation } from "@/lib/shi/corridors";
import { formatAadt } from "@/lib/shi/corridors";
import { cn } from "@/lib/utils";

/**
 * R1 — Access facts inside Research property record.
 * Same desk intel as Corridors Site panel — no data loss.
 */
export function ShiResearchAccessPanel({
  intel,
  loading,
  stations = [],
  lat,
  lng,
  className,
}: {
  intel: ParcelLocationIntel | null | undefined;
  loading?: boolean;
  stations?: TrafficStation[];
  lat?: number | null;
  lng?: number | null;
  className?: string;
}) {
  const assoc =
    lat != null &&
    lng != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    stations.length > 0
      ? associateParcelTraffic(
          {
            propId: "_",
            source: "_",
            countyFips: "_",
            lat,
            lng,
            situsAddress: null,
            ownerName: null,
            legalAcreage: null,
            marketValue: null,
            geojson: null,
          },
          stations,
        )
      : null;

  const station = assoc?.kind === "estimated" ? assoc.station : null;

  return (
    <section
      data-research-access="r1"
      className={cn(
        "rounded-xl border border-hairline bg-[var(--background)] px-3 py-2.5",
        className,
      )}
    >
      <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
        Access · roads & traffic
      </p>
      <p className="mt-1 text-[11px] leading-snug text-[var(--muted)]">
        Mapped-road frontage and planning counts — same facts as the Access desk.
        Not a survey. Not live congestion.
      </p>

      {loading && !intel ? (
        <p className="mt-2 text-xs text-[var(--muted)]">Loading access…</p>
      ) : null}

      <p
        className="mt-2 font-serif text-xl font-bold tabular-nums text-ink"
        data-research-access-frontage
      >
        {formatApproxFrontageFt(intel?.totalApproxFrontageFt ?? 0)}
      </p>

      {intel?.roads?.length ? (
        <ul className="mt-1.5 space-y-1" data-research-access-roads>
          {intel.roads.slice(0, 3).map((r) => (
            <li
              key={`${r.routeId}:${r.segmentId}`}
              className="flex justify-between gap-2 text-xs text-ink"
            >
              <span className="truncate">{r.routeId}</span>
              <span className="shrink-0 tabular-nums text-[var(--muted)]">
                ~{r.approxFrontageFt.toLocaleString("en-US")} ft
                {r.aadt != null
                  ? ` · ${Math.round(r.aadt).toLocaleString("en-US")}/day`
                  : ""}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[11px] text-[var(--muted)]">
          No mapped-road frontage on desk yet for this parcel.
        </p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {intel?.dualRoad ? (
          <span className="rounded-md border border-gold/35 bg-gold/10 px-2 py-1 font-mono text-[10px] font-semibold text-gold uppercase">
            Dual-road
          </span>
        ) : null}
        {intel?.cornerLikely ? (
          <span className="rounded-md border border-hairline bg-[var(--background)] px-2 py-1 font-mono text-[10px] font-semibold uppercase">
            Corner likely
          </span>
        ) : null}
        {intel?.confidence ? (
          <span className="rounded-md border border-hairline bg-[var(--background)] px-2 py-1 font-mono text-[10px] font-semibold uppercase">
            Data {intel.confidence}
          </span>
        ) : null}
      </div>

      {intel?.approxDistanceToIntersectionM != null &&
      intel.intersectionTier ? (
        <p
          className="mt-2 text-[11px] leading-snug text-ink"
          data-research-access-ix
        >
          <span className="font-semibold">
            {formatApproxIntersectionM(intel.approxDistanceToIntersectionM)}
          </span>
          <span className="text-[var(--muted)]">
            {" "}
            · {intel.intersectionTier} · not a survey
          </span>
        </p>
      ) : null}

      {station?.latestAadt != null ? (
        <p className="mt-2 text-[11px] text-ink" data-research-access-traffic>
          <span className="font-semibold">
            Nearby count · {formatAadt(station.latestAadt)}/day
          </span>
          <span className="text-[var(--muted)]">
            {station.onRoad ? ` · ${station.onRoad}` : ""}
            {station.latestYear != null ? ` · ${station.latestYear}` : ""}
            {" · planning AADT"}
          </span>
        </p>
      ) : null}
    </section>
  );
}
