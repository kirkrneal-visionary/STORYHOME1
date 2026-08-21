"use client";

import { useState } from "react";
import { PARCEL_POSITION_COPY } from "@/lib/shi/parcel-position";
import {
  withNeighborContext,
  type ParcelPositionContext,
} from "@/lib/shi/parcel-position-context";
import type { ParcelNeighborsResult } from "@/lib/shi/parcel-neighbors";
import type { ParcelPositionProfile } from "@/lib/shi/parcel-position-profile";
import { cn } from "@/lib/utils";

function formatDay(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `${Math.round(n).toLocaleString("en-US")} vehicles/day`;
}

/**
 * Phase 6 — phone-first position card on the open property.
 * Uses reserved PARCEL_POSITION_COPY. Never a site grade. Never adds two roads.
 */
export function ShiParcelPositionCard({
  profile,
  context,
  neighbors,
  propId,
  className,
}: {
  profile: ParcelPositionProfile | null | undefined;
  context?: ParcelPositionContext | null;
  neighbors?: ParcelNeighborsResult | null;
  propId?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  if (!profile || profile.scope !== "parcel") return null;
  if (propId && profile.propId !== propId) return null;
  const surrounding = withNeighborContext(
    context,
    neighbors,
    profile.propId,
  );

  const why = profile.whyStandsOut.filter(Boolean);
  const lead = why[0] ?? "Not enough mapped road evidence yet.";
  const rest = why.slice(1);
  const primaryDay = formatDay(profile.traffic?.vehiclesPerDay ?? null);
  const secondaryDay = formatDay(profile.secondaryTraffic?.vehiclesPerDay ?? null);
  const primaryRoad = profile.traffic?.road ?? profile.position.primary?.road ?? null;
  const secondaryRoad =
    profile.secondaryTraffic?.road ?? profile.position.secondary?.road ?? null;

  return (
    <section
      data-parcel-position-card="p6"
      className={cn(
        "rounded-xl border border-gold/40 bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] px-3 py-2.5",
        className,
      )}
    >
      <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
        {PARCEL_POSITION_COPY.whyStandsOut}
      </p>
      <p className="mt-1 font-serif text-xl font-bold leading-tight text-ink">
        {profile.roadPositionLabel}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-ink">{lead}</p>

      <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-[var(--surface)] px-2 py-1.5">
          <dt className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Access
          </dt>
          <dd className="mt-0.5 font-semibold text-ink">
            {PARCEL_POSITION_COPY.accessNotVerified}
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--surface)] px-2 py-1.5">
          <dt className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Frontage
          </dt>
          <dd className="mt-0.5 font-semibold text-ink">
            {PARCEL_POSITION_COPY.frontageApprox}
          </dd>
        </div>
      </dl>

      {surrounding.items.length > 0 ? (
        <ul
          className="mt-2 flex flex-wrap gap-1.5"
          data-position-context="p7"
        >
          {surrounding.items.slice(0, 3).map((item) => (
            <li
              key={`${item.kind}:${item.label}`}
              className="rounded-md border border-hairline bg-[var(--surface)] px-2 py-1 font-mono text-[10px] font-semibold text-navy"
            >
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 inline-flex min-h-11 items-center text-[12px] font-bold text-navy"
        data-see-evidence="p6"
      >
        {PARCEL_POSITION_COPY.seeEvidence}
        {open ? " · hide" : ""}
      </button>

      {open ? (
        <div className="mt-2 space-y-2 border-t border-gold/25 pt-2">
          {rest.map((line) => (
            <p key={line} className="text-[12px] leading-snug text-ink">
              {line}
            </p>
          ))}
          {primaryRoad && primaryDay ? (
            <p className="text-[12px] text-ink">
              {primaryRoad} · {primaryDay}
            </p>
          ) : null}
          {secondaryRoad ? (
            <p className="text-[12px] text-ink">
              {secondaryRoad}
              {secondaryDay ? ` · ${secondaryDay}` : ""}
              {" · those numbers are not added together"}
            </p>
          ) : null}
          {surrounding.items.length > 0 ? (
            <ul className="space-y-1.5" data-position-context-detail="p7">
              {surrounding.items.map((item) => (
                <li key={`${item.kind}:${item.detail}`} className="text-[12px] leading-snug text-ink">
                  <span className="font-semibold">{item.label}.</span> {item.detail}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[10px] leading-relaxed text-[var(--muted)]">
            {surrounding.note}
          </p>
          {profile.unknown.length > 0 ? (
            <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-[var(--muted)]">
              {profile.unknown.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          ) : null}
          <p className="text-[10px] leading-relaxed text-[var(--muted)]">
            {PARCEL_POSITION_COPY.accessExplain}
          </p>
          <p className="text-[10px] leading-relaxed text-[var(--muted)]">
            {PARCEL_POSITION_COPY.disclaimer}
          </p>
        </div>
      ) : null}
    </section>
  );
}
