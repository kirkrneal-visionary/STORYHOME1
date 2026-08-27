"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Loader2,
  Network,
  SearchCheck,
  Square,
  Users,
} from "lucide-react";
import {
  shiAddProspect,
  shiCreateFarm,
  shiFindSimilar,
  shiOwnerPortfolio,
} from "@/lib/shi/client";
import { track } from "@/lib/analytics";
import { boundsAroundPoints } from "@/lib/shi/discover-bounds";
import { DEFAULT_SIMILAR_CRITERIA } from "@/lib/shi/similar";
import type {
  ShiDiscoverPin,
  ShiOwnerMatch,
  ShiOwnerPortfolio,
  ShiPropertyDetail,
  ShiPropertySummary,
  ShiSimilarResult,
} from "@/lib/shi/types";
import { cn } from "@/lib/utils";
import { useStorySoundOptional } from "@/components/sound/SoundProvider";

const BULK_PROSPECT_CAP = 25;

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function acres(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 2 })} ac`;
}

function pinKey(source: string, propId: string) {
  return `${source}:${propId}`;
}

function summaryToPin(
  m: ShiPropertySummary,
  kind: ShiDiscoverPin["kind"],
  selected: boolean,
): ShiDiscoverPin | null {
  if (m.centroidLat == null || m.centroidLng == null) return null;
  if (!Number.isFinite(m.centroidLat) || !Number.isFinite(m.centroidLng)) {
    return null;
  }
  return {
    key: pinKey(m.source, m.propId),
    propId: m.propId,
    source: m.source,
    countyFips: m.countyFips,
    countyName: m.countyName,
    lat: m.centroidLat,
    lng: m.centroidLng,
    kind,
    selected,
    label: m.situsAddress || m.legalDescription || `Property ${m.propId}`,
    ownerName: m.ownerName,
    situsAddress: m.situsAddress,
    situsCity: m.situsCity,
    legalAcreage: m.legalAcreage,
    marketValue: m.marketValue,
  };
}

type Props = {
  property: ShiPropertyDetail;
  onOpenProperty: (opts: {
    propId: string;
    source: string;
    countyFips?: string;
  }) => void;
  /** Centroid pins for the Research map (similar + portfolio). */
  onDiscoverPinsChange?: (pins: ShiDiscoverPin[]) => void;
  /** Portfolio EXACT/POSSIBLE polygons → existing related layer. */
  onPortfolioRelated?: (matches: ShiOwnerMatch[]) => void;
  onOpenFarms?: () => void;
};

/**
 * SHI-5 — Find Similar + Owner Portfolio + act-loop (5.2).
 */
export function ShiDiscoverPanel({
  property,
  onOpenProperty,
  onDiscoverPinsChange,
  onPortfolioRelated,
  onOpenFarms,
}: Props) {
  const sound = useStorySoundOptional();
  const [tab, setTab] = useState<"actions" | "similar" | "portfolio">("actions");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [actMsg, setActMsg] = useState("");
  const [similar, setSimilar] = useState<ShiSimilarResult | null>(null);
  const [portfolio, setPortfolio] = useState<ShiOwnerPortfolio | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [farmName, setFarmName] = useState("");
  const [showFarmForm, setShowFarmForm] = useState(false);
  const [maxMiles, setMaxMiles] = useState(DEFAULT_SIMILAR_CRITERIA.maxMiles);
  const [acreageTolPct, setAcreageTolPct] = useState(
    DEFAULT_SIMILAR_CRITERIA.acreageTolPct,
  );
  const [valueTolPct, setValueTolPct] = useState(
    DEFAULT_SIMILAR_CRITERIA.valueTolPct,
  );
  const [sameSubdivision, setSameSubdivision] = useState(false);
  const [sameSchool, setSameSchool] = useState(false);

  const selectableItems = useMemo(() => {
    const items: Array<{
      key: string;
      summary: ShiPropertySummary;
      kind: ShiDiscoverPin["kind"];
    }> = [];
    if (tab === "similar" && similar) {
      for (const m of similar.matches) {
        items.push({
          key: pinKey(m.source, m.propId),
          summary: m,
          kind: "similar",
        });
      }
    }
    if (tab === "portfolio" && portfolio) {
      for (const m of portfolio.exact) {
        items.push({
          key: pinKey(m.source, m.propId),
          summary: m,
          kind: "exact",
        });
      }
      for (const m of portfolio.possible) {
        items.push({
          key: pinKey(m.source, m.propId),
          summary: m,
          kind: "possible",
        });
      }
    }
    return items;
  }, [tab, similar, portfolio]);

  const discoverPins = useMemo(() => {
    const pins: ShiDiscoverPin[] = [];
    const push = (m: ShiPropertySummary, kind: ShiDiscoverPin["kind"]) => {
      const pin = summaryToPin(
        m,
        kind,
        selectedKeys.has(pinKey(m.source, m.propId)),
      );
      if (pin) pins.push(pin);
    };
    if (similar) {
      for (const m of similar.matches) push(m, "similar");
    }
    if (portfolio) {
      for (const m of portfolio.exact) push(m, "exact");
      for (const m of portfolio.possible) push(m, "possible");
    }
    return pins;
  }, [similar, portfolio, selectedKeys]);

  useEffect(() => {
    onDiscoverPinsChange?.(discoverPins);
  }, [discoverPins, onDiscoverPinsChange]);

  const selectedItems = useMemo(
    () => selectableItems.filter((i) => selectedKeys.has(i.key)),
    [selectableItems, selectedKeys],
  );

  function toggleKey(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAllVisible() {
    setSelectedKeys(new Set(selectableItems.map((i) => i.key)));
  }

  function clearSelection() {
    setSelectedKeys(new Set());
    setShowFarmForm(false);
  }

  async function runSimilar() {
    setBusy("similar");
    setError("");
    setActMsg("");
    try {
      const res = await shiFindSimilar({
        source: property.source,
        propId: property.propId,
        criteria: {
          ...DEFAULT_SIMILAR_CRITERIA,
          maxMiles,
          acreageTolPct,
          valueTolPct,
          sameSubdivision,
          sameSchool,
        },
      });
      setSimilar(res);
      setSelectedKeys(new Set());
      setShowFarmForm(false);
      setTab("similar");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Find Similar failed");
    } finally {
      setBusy("");
    }
  }

  async function runPortfolio() {
    setBusy("portfolio");
    setError("");
    setActMsg("");
    try {
      const res = await shiOwnerPortfolio({
        source: property.source,
        propId: property.propId,
        cadOwnerId: property.cadOwnerId,
        ownerName: property.ownerName,
      });
      setPortfolio(res);
      onPortfolioRelated?.([...res.exact, ...res.possible]);
      setSelectedKeys(new Set());
      setShowFarmForm(false);
      setTab("portfolio");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portfolio failed");
    } finally {
      setBusy("");
    }
  }

  async function addSelectedToProspects() {
    if (selectedItems.length === 0) return;
    const batch = selectedItems.slice(0, BULK_PROSPECT_CAP);
    setBusy("prospects");
    setError("");
    setActMsg("");
    let created = 0;
    let existing = 0;
    let failed = 0;
    try {
      for (const item of batch) {
        const s = item.summary;
        try {
          const res = await shiAddProspect({
            source: s.source,
            propId: s.propId,
            countyFips: s.countyFips,
            countyName: s.countyName,
            label:
              s.situsAddress ||
              s.legalDescription ||
              `Property ${s.propId}`,
            ownerName: s.ownerName,
            situsAddress: s.situsAddress,
            situsCity: s.situsCity,
            legalAcreage: s.legalAcreage,
            marketValue: s.marketValue,
            centroidLat: s.centroidLat,
            centroidLng: s.centroidLng,
          });
          if (res.created) {
            created += 1;
            track("prospect_created", {
              county_fips: s.countyFips,
              source_surface: "discover",
              created: true,
            });
          } else existing += 1;
        } catch {
          failed += 1;
        }
      }
      const skipped =
        selectedItems.length > BULK_PROSPECT_CAP
          ? ` Cap is ${BULK_PROSPECT_CAP} per batch.`
          : "";
      setActMsg(
        `Prospects: ${created} new · ${existing} already saved${
          failed ? ` · ${failed} failed` : ""
        }.${skipped}`,
      );
      if ((created > 0 || existing > 0) && failed === 0) {
        sound?.play("success", "study");
      }
    } finally {
      setBusy("");
    }
  }

  async function saveSelectionAsFarm() {
    const name = farmName.trim();
    if (!name) {
      setError("Enter a farm name");
      return;
    }
    const pts = selectedItems
      .map((i) => ({
        lat: i.summary.centroidLat,
        lng: i.summary.centroidLng,
      }))
      .filter(
        (p): p is { lat: number; lng: number } =>
          p.lat != null &&
          p.lng != null &&
          Number.isFinite(p.lat) &&
          Number.isFinite(p.lng),
      );
    const boundary = boundsAroundPoints(pts);
    if (!boundary) {
      setError(
        "Selected properties need map locations (centroids) to save as a farm",
      );
      return;
    }
    setBusy("farm");
    setError("");
    setActMsg("");
    try {
      await shiCreateFarm({
        name,
        countySource: property.source,
        countyName: property.countyName,
        boundary,
        mapCenterLat: property.centroidLat,
        mapCenterLng: property.centroidLng,
      });
      track("farm_created", {
        county_fips: property.countyFips,
        source_surface: "discover",
      });
      sound?.play("success", "study");
      setActMsg(`Farm “${name}” saved — open Farms to review.`);
      setShowFarmForm(false);
      setFarmName("");
      onOpenFarms?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save farm");
    } finally {
      setBusy("");
    }
  }

  return (
    <div
      id="archie-discover"
      className="space-y-3 border-t border-hairline pt-3"
    >
      <div>
        <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
          Discover
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
          Find similar county properties with explainable reasons, or view
          properties associated with this owner. Select results to add to
          Prospects or save as a Farm.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void runSimilar()}
          className="story-press inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold px-3 text-xs font-bold text-navy disabled:opacity-60"
        >
          {busy === "similar" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <SearchCheck className="h-3.5 w-3.5" />
          )}
          Find Similar
        </button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void runPortfolio()}
          className="story-press inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline px-3 text-xs font-bold text-ink disabled:opacity-60"
        >
          {busy === "portfolio" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Network className="h-3.5 w-3.5 text-gold" />
          )}
          View Portfolio
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <label className="text-[var(--muted)]">
          Max miles
          <input
            type="number"
            min={1}
            max={50}
            value={maxMiles}
            onChange={(e) => setMaxMiles(Number(e.target.value) || 10)}
            className="field-input mt-0.5 h-8 text-xs"
          />
        </label>
        <label className="text-[var(--muted)]">
          Acreage ±%
          <input
            type="number"
            min={5}
            max={100}
            value={acreageTolPct}
            onChange={(e) => setAcreageTolPct(Number(e.target.value) || 25)}
            className="field-input mt-0.5 h-8 text-xs"
          />
        </label>
        <label className="text-[var(--muted)]">
          Value ±%
          <input
            type="number"
            min={5}
            max={100}
            value={valueTolPct}
            onChange={(e) => setValueTolPct(Number(e.target.value) || 30)}
            className="field-input mt-0.5 h-8 text-xs"
          />
        </label>
        <div className="flex flex-col justify-end gap-1 pb-1">
          <label className="flex items-center gap-1.5 text-[var(--muted)]">
            <input
              type="checkbox"
              checked={sameSubdivision}
              onChange={(e) => setSameSubdivision(e.target.checked)}
            />
            Same subdivision
          </label>
          <label className="flex items-center gap-1.5 text-[var(--muted)]">
            <input
              type="checkbox"
              checked={sameSchool}
              onChange={(e) => setSameSchool(e.target.checked)}
            />
            Same school code
          </label>
        </div>
      </div>

      {error ? (
        <p className="text-xs font-semibold text-red-300">{error}</p>
      ) : null}
      {actMsg ? (
        <p className="text-xs font-semibold text-ink">{actMsg}</p>
      ) : null}

      {(tab === "similar" || tab === "portfolio") &&
      selectableItems.length > 0 ? (
        <div className="space-y-2 rounded-xl border border-gold/40 bg-gold/5 px-2.5 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[9px] font-bold tracking-wider text-gold uppercase">
              Act on selection · {selectedItems.length} selected
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllVisible}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-navy"
              >
                <CheckSquare className="h-3 w-3" />
                Select all
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--muted)]"
              >
                <Square className="h-3 w-3" />
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy) || selectedItems.length === 0}
              onClick={() => void addSelectedToProspects()}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-navy px-2.5 text-[11px] font-bold text-white disabled:opacity-50"
            >
              {busy === "prospects" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Users className="h-3.5 w-3.5" />
              )}
              Add to Prospects
            </button>
            <button
              type="button"
              disabled={Boolean(busy) || selectedItems.length === 0}
              onClick={() => {
                setShowFarmForm(true);
                setError("");
                if (!farmName) {
                  setFarmName(
                    `Discover · ${property.situsAddress || property.propId}`,
                  );
                }
              }}
              className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-hairline bg-[var(--surface)] px-2.5 text-[11px] font-bold text-ink disabled:opacity-50"
            >
              Save selection as Farm
            </button>
          </div>
          {showFarmForm ? (
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end">
              <label className="flex-1 text-[10px] text-[var(--muted)]">
                Farm name
                <input
                  type="text"
                  value={farmName}
                  onChange={(e) => setFarmName(e.target.value)}
                  className="field-input mt-0.5 h-8 text-xs"
                  placeholder="Name this territory"
                />
              </label>
              <button
                type="button"
                disabled={Boolean(busy) || !farmName.trim()}
                onClick={() => void saveSelectionAsFarm()}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-gold px-3 text-[11px] font-bold text-navy disabled:opacity-50"
              >
                {busy === "farm" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Save Farm"
                )}
              </button>
            </div>
          ) : null}
          <p className="text-[9px] leading-relaxed text-[var(--muted)]">
            Map pins: gold = similar · navy = exact owner · teal = possible
            name. Farm boundary is a padded box around selected centroids —
            Archie analyzes live parcels inside it.
          </p>
        </div>
      ) : null}

      {tab === "similar" && similar ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink">
            {similar.matches.length} similar
            {similar.totalConsidered > similar.matches.length
              ? ` (of ${similar.totalConsidered})`
              : ""}
          </p>
          <p className="text-[10px] text-[var(--muted)]">{similar.note}</p>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {similar.matches.length === 0 ? (
              <li className="text-xs text-[var(--muted)]">
                No properties met your criteria in this county.
              </li>
            ) : (
              similar.matches.map((m) => {
                const key = pinKey(m.source, m.propId);
                const checked = selectedKeys.has(key);
                return (
                  <li key={key}>
                    <div
                      className={cn(
                        "rounded-lg border px-2.5 py-2",
                        checked
                          ? "border-gold bg-gold/10"
                          : "border-hairline",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKey(key)}
                          className="mt-1"
                          aria-label={`Select ${m.situsAddress || m.propId}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onOpenProperty({
                              propId: m.propId,
                              source: m.source,
                              countyFips: m.countyFips ?? undefined,
                            })
                          }
                          className="min-w-0 flex-1 text-left hover:opacity-90"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                                m.strength === "strong"
                                  ? "bg-gold/25 text-navy"
                                  : "bg-[var(--background)] text-[var(--muted)]",
                              )}
                            >
                              {m.strength === "strong"
                                ? "Strong match"
                                : m.strength === "close"
                                  ? "Close match"
                                  : "Related"}
                            </span>
                            <span className="font-mono text-[10px] text-[var(--muted)]">
                              {m.distanceMiles.toFixed(1)} mi
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs font-semibold text-ink">
                            {m.situsAddress ||
                              m.legalDescription ||
                              `Property ${m.propId}`}
                          </p>
                          <p className="text-[10px] text-[var(--muted)]">
                            {acres(m.legalAcreage)} · {money(m.marketValue)}
                          </p>
                          <p className="mt-1 font-mono text-[9px] font-bold tracking-wider text-gold uppercase">
                            Why Archie matched
                          </p>
                          <ul className="mt-0.5 list-disc pl-4 text-[10px] text-[var(--muted)]">
                            {m.reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}

      {tab === "portfolio" && portfolio ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink">
            Properties associated with this owner
          </p>
          <p className="text-[10px] text-[var(--muted)]">
            {portfolio.ownerName || "Owner not listed"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Exact matches"
              value={String(portfolio.exactCount)}
            />
            <Stat
              label="Possible related"
              value={String(portfolio.possibleCount)}
            />
            <Stat label="Exact acres" value={acres(portfolio.totals.totalAcres)} />
            <Stat
              label="Exact value"
              value={money(portfolio.totals.totalMarketValue)}
            />
          </div>
          <p className="text-[10px] leading-relaxed text-[var(--muted)]">
            {portfolio.note}
          </p>
          <p className="font-mono text-[9px] font-bold text-gold uppercase">
            Exact owner matches
          </p>
          <ul className="max-h-40 space-y-1 overflow-y-auto">
            {portfolio.exact.length === 0 ? (
              <li className="text-xs text-[var(--muted)]">
                No other exact owner-id matches in this county.
              </li>
            ) : (
              portfolio.exact.map((m) => {
                const key = pinKey(m.source, m.propId);
                const checked = selectedKeys.has(key);
                return (
                  <li key={`e-${key}`}>
                    <div
                      className={cn(
                        "flex items-start gap-2 rounded-lg border px-2 py-1.5",
                        checked
                          ? "border-gold bg-gold/10"
                          : "border-hairline",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleKey(key)}
                        className="mt-1"
                        aria-label={`Select ${m.situsAddress || m.propId}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          onOpenProperty({
                            propId: m.propId,
                            source: m.source,
                            countyFips: m.countyFips ?? undefined,
                          })
                        }
                        className="min-w-0 flex-1 text-left text-xs hover:opacity-90"
                      >
                        <span className="font-semibold text-ink">
                          {m.situsAddress || `Property ${m.propId}`}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                          {acres(m.legalAcreage)} · {money(m.marketValue)}
                        </span>
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
          {portfolio.possible.length > 0 ? (
            <>
              <p className="font-mono text-[9px] font-bold text-[var(--muted)] uppercase">
                Possible related (name only)
              </p>
              <ul className="max-h-32 space-y-1 overflow-y-auto">
                {portfolio.possible.map((m) => {
                  const key = pinKey(m.source, m.propId);
                  const checked = selectedKeys.has(key);
                  return (
                    <li key={`p-${key}`}>
                      <div
                        className={cn(
                          "flex items-start gap-2 rounded-lg border px-2 py-1.5",
                          checked
                            ? "border-gold bg-gold/10"
                            : "border-hairline",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleKey(key)}
                          className="mt-1"
                          aria-label={`Select ${m.situsAddress || m.propId}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onOpenProperty({
                              propId: m.propId,
                              source: m.source,
                              countyFips: m.countyFips ?? undefined,
                            })
                          }
                          className="min-w-0 flex-1 text-left text-xs hover:opacity-90"
                        >
                          <span className="font-semibold text-ink">
                            {m.situsAddress || `Property ${m.propId}`}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                            {m.matchReason}
                          </span>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline px-2 py-1.5">
      <p className="font-mono text-[9px] font-bold tracking-wider text-[var(--muted)] uppercase">
        {label}
      </p>
      <p className="text-sm font-bold text-ink">{value}</p>
    </div>
  );
}
