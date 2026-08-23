"use client";

import { MULTIFAMILY_COPY } from "@/lib/shi/multifamily";
import type { MultifamilyRead } from "@/lib/shi/multifamily-read";

function money(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function pct(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `${Math.round(n * 100)}%`;
}

function Row({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-[11px] text-[var(--muted)]">{label}</dt>
      <dd className="text-right text-[12px] font-semibold text-ink">{value}</dd>
    </div>
  );
}

/**
 * Dedicated Multifamily evidence hierarchy.
 * Only rows backed by production-ready data.
 */
export function ShiMultifamilyRead({
  read,
}: {
  read: MultifamilyRead | null;
}) {
  if (!read) return null;
  const housing = read.housing;
  const acres =
    read.land.grossAcres != null
      ? `${read.land.grossAcres.toLocaleString("en-US", { maximumFractionDigits: 2 })} acres`
      : null;

  return (
    <section
      data-multifamily-read={read.version}
      className="space-y-3 rounded-xl border border-hairline px-3 py-3"
    >
      <div>
        <p className="font-mono text-[10px] font-bold tracking-[0.14em] text-gold uppercase">
          Multifamily read
        </p>
      </div>

      <div data-mf-why>
        <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
          Why this property stands out
        </p>
        <ul className="mt-1 space-y-1">
          {read.whyStandsOut.map((line) => (
            <li key={line} className="text-[11px] leading-snug text-ink">
              {line}
            </li>
          ))}
        </ul>
      </div>

      <div data-mf-land>
        <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
          Land
        </p>
        <dl className="mt-1 space-y-1">
          <Row label="Gross acreage" value={acres} />
          <Row
            label="Mapped frontage"
            value={
              read.land.frontageFt != null && read.land.frontageFt > 0
                ? `About ${Math.round(read.land.frontageFt).toLocaleString("en-US")} ft — mapped, not a survey`
                : null
            }
          />
          <Row label="Primary road" value={read.land.primaryRoad} />
          <Row label="Second road" value={read.land.secondaryRoad} />
        </dl>
      </div>

      <div data-mf-usable-land data-mf-usable-status={read.usableLand.status}>
        <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
          Preliminary development area
        </p>
        <p className="mt-1 text-[12px] text-ink">{read.usableLand.summary}</p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
          {read.usableLand.honesty}
        </p>
      </div>

      <div data-mf-flood-pin>
        <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
          Flood
        </p>
        <p className="mt-1 text-[11px] leading-snug text-ink">
          Mapped FEMA zone is shown at the parcel pin in the flood card below.
          Archie does not yet compute flood acreage on this parcel.
        </p>
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          {MULTIFAMILY_COPY.floodInsurance}
        </p>
      </div>

      <div data-mf-utilities>
        <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
          Utilities
        </p>
        <dl className="mt-1 space-y-1">
          <Row
            label="Water service area"
            value={read.utilities.waterServiceArea}
          />
          <Row
            label="Sewer service area"
            value={read.utilities.sewerServiceArea}
          />
          <Row label="Capacity" value={read.utilities.capacity} />
        </dl>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
          {read.utilities.honesty}
        </p>
      </div>

      {housing ? (
        <div data-mf-housing>
          <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
            Local housing context
          </p>
          <dl className="mt-1 space-y-1">
            <Row
              label="Population"
              value={
                housing.population != null
                  ? housing.population.toLocaleString("en-US")
                  : null
              }
            />
            <Row
              label="Households"
              value={
                housing.households != null
                  ? housing.households.toLocaleString("en-US")
                  : null
              }
            />
            <Row label="Renter households" value={pct(housing.renterShare)} />
            <Row
              label="Household change"
              value="Not verified"
            />
            <Row label="Vacancy" value={pct(housing.vacancyRate)} />
            <Row
              label="Median household income"
              value={money(housing.medianHouseholdIncome)}
            />
          </dl>
          <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
            {housing.geographyLabel} · {housing.vintageLabel}. {housing.honesty}
          </p>
        </div>
      ) : null}

      <div data-mf-fit>
        <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
          Conceptual fit
        </p>
        <ul className="mt-1 space-y-1.5">
          {read.conceptualFit.scenarios.map((s) => (
            <li key={s.id} data-mf-fit-status={s.status}>
              <p className="text-[12px] font-semibold text-ink">
                {s.label}{" "}
                <span className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
                  {s.statusLabel}
                </span>
              </p>
              <p className="text-[11px] leading-snug text-[var(--muted)]">
                {s.reason}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-[10px] text-[var(--muted)]">
          {read.conceptualFit.honesty}
        </p>
      </div>

      <div data-mf-unit-study="hidden">
        <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
          Conceptual unit study
        </p>
        <p className="mt-1 text-[11px] text-ink">
          {read.conceptualFit.unitStudyNote}
        </p>
      </div>

      <div data-mf-unverified>
        <p className="font-mono text-[10px] font-bold tracking-wide text-gold uppercase">
          What still needs verification
        </p>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {read.stillNeedsVerification.map((line) => (
            <li key={line} className="text-[11px] text-ink">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
