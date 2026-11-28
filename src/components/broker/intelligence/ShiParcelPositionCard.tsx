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
 * Proven road evidence only — no “not enough evidence” blocks.
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

  const primaryRoad =
    profile.traffic?.road ?? profile.position.primary?.road ?? null;
  const why = profile.whyStandsOut.filter(
    (line) => line && !/not enough/i.test(line),
  );
  const hasRoadEvidence = Boolean(
    primaryRoad ||
      (profile.position.primary?.approxFrontageFt ?? 0) > 0 ||
      why.length > 0,
  );
  if (!hasRoadEvidence) return null;

  const surrounding = withNeighborContext(
    context,
    neighbors,
    profile.propId,
  );

  const lead = why[0] ?? profile.roadPositionLabel;
  const rest = why.slice(1);
  const primaryDay = formatDay(profile.traffic?.vehiclesPerDay ?? null);
  const secondaryDay = formatDay(profile.secondaryTraffic?.vehiclesPerDay ?? null);
  const secondaryRoad =
    profile.secondaryTraffic?.road ?? profile.position.secondary?.road ?? null;

  return (
    <section
      data-parcel-position-card="p6"
      className={cn(
        "rounded-xl bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] px-3 py-2.5",
        className,
      )}
    >
      <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
        {PARCEL_POSITION_COPY.whyStandsOut}
      </p>
      <p className="mt-1 type-card-title leading-tight text-[var(--paper)]">
        {profile.roadPositionLabel}
      </p>
      <p className="mt-1.5 text-[13px] leading-snug text-[color-mix(in_srgb,var(--paper)_88%,transparent)]">
        {lead}
      </p>

      <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-[var(--surface)] px-2 py-1.5">
          <dt className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Access
          </dt>
          <dd className="mt-0.5 font-semibold text-[var(--paper)]">
            {PARCEL_POSITION_COPY.accessNotVerified}
          </dd>
        </div>
        <div className="rounded-lg bg-[var(--surface)] px-2 py-1.5">
          <dt className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
            Frontage
          </dt>
          <dd className="mt-0.5 font-semibold text-[var(--paper)]">
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
              className="rounded-md bg-[var(--surface)] px-2 py-1 font-mono text-[10px] font-semibold text-[color-mix(in_srgb,var(--paper)_88%,transparent)]"
            >
              {item.label}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-2 inline-flex min-h-11 items-center text-[12px] font-bold text-gold"
        data-see-evidence="p6"
      >
        {PARCEL_POSITION_COPY.seeEvidence}
        {open ? " · hide" : ""}
      </button>

      {open ? (
        <div className="mt-2 space-y-2 border-t border-[color-mix(in_srgb,var(--gold)_25%,transparent)] pt-2">
          {rest.map((line) => (
            <p
              key={line}
              className="text-[12px] leading-snug text-[var(--paper)]"
            >
              {line}
            </p>
          ))}
          {primaryRoad && primaryDay ? (
            <p className="text-[12px] text-[var(--paper)]">
              {primaryRoad} · {primaryDay}
            </p>
          ) : null}
          {secondaryRoad ? (
            <p className="text-[12px] text-[var(--paper)]">
              {secondaryRoad}
              {secondaryDay ? ` · ${secondaryDay}` : ""}
              {" · those numbers are not added together"}
            </p>
          ) : null}
          {surrounding.items.length > 0 ? (
            <ul className="space-y-1.5" data-position-context-detail="p7">
              {surrounding.items.map((item) => (
                <li
                  key={`${item.kind}:${item.detail}`}
                  className="text-[12px] leading-snug text-[var(--paper)]"
                >
                  <span className="font-semibold">{item.label}.</span>{" "}
                  {item.detail}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[10px] leading-relaxed text-[var(--muted)]">
            {surrounding.note}
          </p>
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
