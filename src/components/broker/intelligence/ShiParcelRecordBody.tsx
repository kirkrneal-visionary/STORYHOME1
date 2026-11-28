"use client";

import { useEffect, useMemo } from "react";
import { Loader2, Users } from "lucide-react";
import { ShiArchieIntelligencePanel } from "@/components/broker/intelligence/ShiArchieIntelligencePanel";
import { ShiCadEvidencePanel } from "@/components/broker/intelligence/ShiCadEvidencePanel";
import { ShiDeedsEvidencePanel } from "@/components/broker/intelligence/ShiDeedsEvidencePanel";
import { ShiDiscoverPanel } from "@/components/broker/intelligence/ShiDiscoverPanel";
import { ShiEnvironmentEvidencePanel } from "@/components/broker/intelligence/ShiEnvironmentEvidencePanel";
import { ShiFloodEvidencePanel } from "@/components/broker/intelligence/ShiFloodEvidencePanel";
import { ShiMultifamilyRead } from "@/components/broker/intelligence/ShiMultifamilyRead";
import { ShiParcelPositionCard } from "@/components/broker/intelligence/ShiParcelPositionCard";
import {
  ShiParcelSectionMenu,
  pickParcelSection,
  type ParcelSheetSection,
} from "@/components/broker/intelligence/ShiParcelSectionMenu";
import { ShiResearchAccessPanel } from "@/components/broker/intelligence/ShiResearchAccessPanel";
import { ShiUtilitiesEvidencePanel } from "@/components/broker/intelligence/ShiUtilitiesEvidencePanel";
import { formatAadt } from "@/lib/shi/corridors";
import type { ParcelLocationIntel } from "@/lib/shi/corridor-frontage";
import type { TrafficStation } from "@/lib/shi/corridors";
import type { DeedsFact } from "@/lib/shi/deeds-clerk";
import type { EnvironmentDesk } from "@/lib/shi/environment-desk";
import type { FloodFact } from "@/lib/shi/flood-fema";
import type { MultifamilyRead } from "@/lib/shi/multifamily-read";
import type { ParcelNeighborsResult } from "@/lib/shi/parcel-neighbors";
import type { ParcelPositionContext } from "@/lib/shi/parcel-position-context";
import type { ParcelPositionProfile } from "@/lib/shi/parcel-position-profile";
import type { ResearchModeId } from "@/lib/shi/research-modes";
import type {
  ShiAreaAnalysis,
  ShiOwnerMatch,
  ShiPropertyDetail,
} from "@/lib/shi/types";
import type { UtilitiesFact } from "@/lib/shi/utilities-ccn";
import { hasUtilityProviderRows } from "@/lib/shi/utility-providers";
import { cn } from "@/lib/utils";

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return null;
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function acres(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return null;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ac`;
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[var(--background)] px-2.5 py-2">
      <dt className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-xs font-semibold text-[var(--paper)]",
          mono && "font-mono",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

export function ShiParcelRecordBody({
  selected,
  exactCount,
  possibleCount,
  matches,
  matchNote,
  accessIntel,
  accessLoading,
  accessStations,
  positionProfile,
  positionContext,
  parcelNeighbors,
  floodFact,
  utilitiesFact,
  environmentDesk,
  deedsFact,
  displayAnalysis,
  researchMode,
  mfRead,
  parcelSection,
  onParcelSection,
  ownerPortfolioRef,
  onFocusAskAccess,
  onOpenProperty,
  onDiscoverPinsChange,
  onPortfolioRelated,
  onOpenFarms,
  savingProspect,
  prospectMsg,
  onSaveProspect,
  onOpenProspects,
}: {
  selected: ShiPropertyDetail;
  exactCount: number;
  possibleCount: number;
  matches: ShiOwnerMatch[];
  matchNote: string;
  accessIntel: ParcelLocationIntel | null;
  accessLoading: boolean;
  accessStations: TrafficStation[];
  positionProfile: ParcelPositionProfile | null;
  positionContext: ParcelPositionContext | null;
  parcelNeighbors: ParcelNeighborsResult | null;
  floodFact: FloodFact | null;
  utilitiesFact: UtilitiesFact | null;
  environmentDesk: EnvironmentDesk | null;
  deedsFact: DeedsFact | null;
  displayAnalysis: ShiAreaAnalysis | null;
  researchMode: ResearchModeId;
  mfRead: MultifamilyRead | null;
  parcelSection: ParcelSheetSection;
  onParcelSection: (id: ParcelSheetSection) => void;
  ownerPortfolioRef: React.RefObject<HTMLDivElement | null>;
  onFocusAskAccess: () => void;
  onOpenProperty: (opts: {
    propId: string;
    source: string;
    countyFips?: string;
  }) => void;
  onDiscoverPinsChange: (pins: import("@/lib/shi/types").ShiDiscoverPin[]) => void;
  onPortfolioRelated: (matches: ShiOwnerMatch[]) => void;
  onOpenFarms?: () => void;
  savingProspect: boolean;
  prospectMsg: string;
  onSaveProspect: () => void;
  onOpenProspects: () => void;
}) {
  const hasRoads = Boolean(
    accessIntel?.roads?.length ||
      positionProfile?.position.primary?.road ||
      (positionProfile?.position.primary?.approxFrontageFt ?? 0) > 0,
  );
  const trafficRoad = accessIntel?.roads?.find((r) => r.aadt != null);
  const hasTraffic = Boolean(
    trafficRoad?.aadt != null ||
      positionProfile?.traffic?.vehiclesPerDay != null ||
      accessStations.length > 0,
  );
  const hasValues = Boolean(
    selected.marketValue != null ||
      selected.landValue != null ||
      selected.improvementValue != null ||
      selected.taxYear != null ||
      (selected.observedHistory ?? []).length > 0,
  );
  const hasUtilities = hasUtilityProviderRows(utilitiesFact);
  const hasAnalyze = Boolean(
    displayAnalysis ||
      selected.ownershipChurn ||
      floodFact?.userReveal ||
      environmentDesk ||
      deedsFact?.userReveal ||
      (researchMode === "multifamily" && mfRead) ||
      selected.cadEvidence,
  );

  const available = useMemo(() => {
    const next: ParcelSheetSection[] = ["overview"];
    if (hasValues) next.push("values");
    if (hasRoads) next.push("roads");
    if (hasTraffic) next.push("traffic");
    if (hasAnalyze) next.push("analyze");
    if (hasUtilities) next.push("utilities");
    return next;
  }, [hasValues, hasRoads, hasTraffic, hasAnalyze, hasUtilities]);

  const active = pickParcelSection(available, parcelSection);

  useEffect(() => {
    if (active !== parcelSection) onParcelSection(active);
  }, [active, parcelSection, onParcelSection]);

  const mv = money(selected.marketValue);
  const land = money(selected.landValue);
  const imp = money(selected.improvementValue);
  const ac = acres(selected.legalAcreage);

  return (
    <div data-parcel-record-body className="space-y-4">
      <ShiParcelSectionMenu
        available={available}
        active={active}
        onChange={onParcelSection}
      />

      {active === "overview" ? (
        <div data-parcel-section-panel="overview" className="space-y-4">
          <ShiArchieIntelligencePanel
            property={selected}
            exactOwnerCount={exactCount}
            possibleOwnerCount={possibleCount}
            matches={matches}
            accessIntel={accessIntel}
            stations={accessStations}
            parcelNeighbors={parcelNeighbors}
            onFocusOwnership={() => {
              ownerPortfolioRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }}
            onFocusNearby={() => {
              ownerPortfolioRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
              });
            }}
            onAskAccess={onFocusAskAccess}
          />

          <dl className="grid grid-cols-2 gap-2 text-xs">
            <Fact label="Property ID" value={selected.propId} mono />
            {selected.geoId ? (
              <Fact label="Geo ID" value={selected.geoId} mono />
            ) : null}
            {selected.cadOwnerId ? (
              <Fact label="Owner ID" value={selected.cadOwnerId} mono />
            ) : null}
            {ac ? <Fact label="Acres" value={ac} /> : null}
            {selected.schoolName || selected.schoolCode ? (
              <Fact
                label="School"
                value={selected.schoolName ?? selected.schoolCode ?? ""}
              />
            ) : null}
            {selected.situsCity || selected.situsZip ? (
              <Fact
                label="City / ZIP"
                value={
                  [selected.situsCity, selected.situsZip]
                    .filter(Boolean)
                    .join(" ") || ""
                }
              />
            ) : null}
          </dl>

          <div ref={ownerPortfolioRef} id="archie-owner-matches">
            <h4 className="flex items-center gap-2 text-xs font-bold text-[var(--paper)]">
              <Users className="h-3.5 w-3.5 text-gold" />
              Owner portfolio
            </h4>
            <p className="mt-1 text-[10px] text-[var(--muted)]">
              {exactCount} exact · {possibleCount} possible related
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted)]">
              Properties associated with this owner in this county. Exact =
              same owner id. Possible = normalized name only — not confirmed
              the same person. {matchNote}
            </p>
            {matches.length === 0 ? null : (
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {matches.map((m) => (
                  <li key={`${m.source}:${m.propId}`}>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenProperty({
                          propId: m.propId,
                          source: m.source,
                          countyFips: m.countyFips ?? undefined,
                        })
                      }
                      className="w-full rounded-lg bg-[var(--background)] px-2.5 py-2 text-left hover:bg-[color-mix(in_srgb,var(--paper)_8%,transparent)]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                            m.matchTier === "EXACT"
                              ? "bg-gold/25 text-navy"
                              : "bg-[var(--surface)] text-[var(--muted)]",
                          )}
                        >
                          {m.matchTier}
                        </span>
                        <span className="truncate font-mono text-[10px] text-[var(--muted)]">
                          {m.propId}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs font-semibold text-[var(--paper)]">
                        {m.situsAddress ||
                          m.legalDescription ||
                          `Parcel ${m.propId}`}
                      </p>
                      <p className="truncate text-[10px] text-[var(--muted)]">
                        {m.matchReason}
                        {m.legalAcreage != null
                          ? ` · ${acres(m.legalAcreage) ?? ""}`
                          : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {selected.legalDescription ? (
            <div>
              <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                Legal
              </p>
              <p className="mt-1 text-xs leading-relaxed text-[var(--paper)]">
                {selected.legalDescription}
              </p>
            </div>
          ) : null}

          {selected.mhSerialNumber ? (
            <div>
              <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                Manufactured home
              </p>
              <p className="mt-1 text-xs text-[var(--paper)]">
                Serial {selected.mhSerialNumber}
                {selected.mhHudLabel ? ` · HUD ${selected.mhHudLabel}` : ""}
              </p>
            </div>
          ) : null}

          <div className="space-y-2 pt-1">
            <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
              Private workspace
            </p>
            <button
              type="button"
              disabled={savingProspect}
              onClick={onSaveProspect}
              className="story-press inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gold text-sm font-bold text-navy disabled:opacity-60"
            >
              {savingProspect ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Save Prospect
            </button>
            {prospectMsg ? (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] text-[var(--paper)]">{prospectMsg}</p>
                <button
                  type="button"
                  onClick={onOpenProspects}
                  className="text-[11px] font-semibold text-gold underline-offset-2 hover:underline"
                >
                  Open Prospects
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {active === "values" ? (
        <div data-parcel-section-panel="values" className="space-y-4">
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {mv ? <Fact label="Market value" value={mv} /> : null}
            {land ? <Fact label="Land" value={land} /> : null}
            {imp ? <Fact label="Improvements" value={imp} /> : null}
            {selected.taxYear != null ? (
              <Fact label="Tax year" value={String(selected.taxYear)} />
            ) : null}
            {selected.firstSeenAt ? (
              <Fact
                label="First seen"
                value={selected.firstSeenAt.slice(0, 10)}
                mono
              />
            ) : null}
            {selected.lastSeenAt ? (
              <Fact
                label="Last seen"
                value={selected.lastSeenAt.slice(0, 10)}
                mono
              />
            ) : null}
          </dl>
          {(selected.observedHistory ?? []).length > 0 ? (
            <div>
              <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                Observed CAD history
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
                Values, county pull observations, and owner-field changes
                Archie saw between loads — not deed or sale dates.
              </p>
              <ol className="mt-2 space-y-2 border-l border-[color-mix(in_srgb,var(--paper)_14%,transparent)] pl-3">
                {(selected.observedHistory ?? []).map((ev, i) => (
                  <li key={`${ev.kind}-${ev.at}-${i}`}>
                    <p className="text-xs font-semibold text-[var(--paper)]">
                      {ev.title}
                    </p>
                    <p className="text-[10px] text-[var(--muted)]">{ev.detail}</p>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </div>
      ) : null}

      {active === "roads" ? (
        <div data-parcel-section-panel="roads" className="space-y-4">
          <ShiResearchAccessPanel
            intel={accessIntel}
            loading={accessLoading}
            stations={accessStations}
            lat={selected.centroidLat}
            lng={selected.centroidLng}
          />
          <ShiParcelPositionCard
            profile={positionProfile}
            context={positionContext}
            neighbors={parcelNeighbors}
            propId={selected.propId}
          />
        </div>
      ) : null}

      {active === "traffic" ? (
        <div data-parcel-section-panel="traffic" className="space-y-3">
          {trafficRoad?.aadt != null ? (
            <div className="rounded-xl bg-[var(--background)] px-3 py-2.5">
              <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
                Planning traffic
              </p>
              <p className="mt-1 type-card-title tabular-nums text-[var(--paper)]">
                {formatAadt(trafficRoad.aadt)}/day
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {trafficRoad.routeId} · TxDOT AADT · not live congestion
              </p>
            </div>
          ) : null}
          {positionProfile?.traffic?.vehiclesPerDay != null ? (
            <div className="rounded-xl bg-[var(--background)] px-3 py-2.5">
              <p className="font-mono text-[10px] font-semibold tracking-wide text-gold uppercase">
                Primary road count
              </p>
              <p className="mt-1 type-card-title tabular-nums text-[var(--paper)]">
                {Math.round(
                  positionProfile.traffic.vehiclesPerDay,
                ).toLocaleString("en-US")}
                /day
              </p>
              {positionProfile.traffic.road ? (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {positionProfile.traffic.road}
                </p>
              ) : null}
            </div>
          ) : null}
          {accessStations.length > 0 ? (
            <ul className="space-y-1.5">
              {accessStations.slice(0, 6).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-[var(--background)] px-2.5 py-2 text-xs"
                >
                  <span className="min-w-0 truncate font-semibold text-[var(--paper)]">
                    {s.onRoad || s.stationId}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-[var(--muted)]">
                    {s.latestAadt != null
                      ? `${formatAadt(s.latestAadt)}/day`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {active === "analyze" ? (
        <div data-parcel-section-panel="analyze" className="space-y-4">
          {researchMode === "multifamily" ? (
            <ShiMultifamilyRead read={mfRead} />
          ) : null}
          {selected.ownershipChurn ? (
            <div className="rounded-xl bg-[color-mix(in_srgb,var(--gold)_8%,transparent)] p-3">
              <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
                Ownership Stability Index
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
                Familiar 300–850 scale for how quiet CAD owner fields look
                across Archie&apos;s pulls. Not a credit score. Not a
                prediction the owner will sell. Not deed history.
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <p className="type-page-title text-[var(--paper)]">
                    {selected.ownershipChurn.index ?? "—"}
                  </p>
                  <p className="text-xs font-semibold text-[var(--paper)]">
                    {selected.ownershipChurn.bandLabel}
                  </p>
                </div>
                <p className="text-right font-mono text-[10px] text-[var(--muted)]">
                  {selected.ownershipChurn.ownerChangeCount} owner-field
                  <br />
                  change
                  {selected.ownershipChurn.ownerChangeCount === 1 ? "" : "s"}{" "}
                  observed
                </p>
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[10px] text-[var(--muted)]">
                {selected.ownershipChurn.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <ShiFloodEvidencePanel flood={floodFact} />
          <ShiEnvironmentEvidencePanel environment={environmentDesk} />
          <ShiDeedsEvidencePanel deeds={deedsFact} />
          <ShiCadEvidencePanel
            property={selected}
            frameAnalysis={displayAnalysis}
          />
          <ShiDiscoverPanel
            key={`${selected.source}:${selected.propId}`}
            property={selected}
            onOpenProperty={(opts) => void onOpenProperty(opts)}
            onDiscoverPinsChange={onDiscoverPinsChange}
            onPortfolioRelated={onPortfolioRelated}
            onOpenFarms={onOpenFarms}
          />
        </div>
      ) : null}

      {active === "utilities" ? (
        <div data-parcel-section-panel="utilities" className="space-y-3">
          <ShiUtilitiesEvidencePanel utilities={utilitiesFact} />
        </div>
      ) : null}
    </div>
  );
}
