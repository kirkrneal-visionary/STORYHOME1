"use client";

import { useState } from "react";
import { Loader2, Network, SearchCheck } from "lucide-react";
import {
  shiFindSimilar,
  shiOwnerPortfolio,
} from "@/lib/shi/client";
import { DEFAULT_SIMILAR_CRITERIA } from "@/lib/shi/similar";
import type {
  ShiOwnerPortfolio,
  ShiPropertyDetail,
  ShiSimilarResult,
} from "@/lib/shi/types";
import { cn } from "@/lib/utils";

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

type Props = {
  property: ShiPropertyDetail;
  onOpenProperty: (opts: {
    propId: string;
    source: string;
    countyFips?: string;
  }) => void;
};

/**
 * SHI-5 — Find Similar + Owner Portfolio actions on a property record.
 */
export function ShiDiscoverPanel({ property, onOpenProperty }: Props) {
  const [tab, setTab] = useState<"actions" | "similar" | "portfolio">("actions");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [similar, setSimilar] = useState<ShiSimilarResult | null>(null);
  const [portfolio, setPortfolio] = useState<ShiOwnerPortfolio | null>(null);
  const [maxMiles, setMaxMiles] = useState(DEFAULT_SIMILAR_CRITERIA.maxMiles);
  const [acreageTolPct, setAcreageTolPct] = useState(
    DEFAULT_SIMILAR_CRITERIA.acreageTolPct,
  );
  const [valueTolPct, setValueTolPct] = useState(
    DEFAULT_SIMILAR_CRITERIA.valueTolPct,
  );
  const [sameSubdivision, setSameSubdivision] = useState(false);
  const [sameSchool, setSameSchool] = useState(false);

  async function runSimilar() {
    setBusy("similar");
    setError("");
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
    try {
      const res = await shiOwnerPortfolio({
        source: property.source,
        propId: property.propId,
        cadOwnerId: property.cadOwnerId,
        ownerName: property.ownerName,
      });
      setPortfolio(res);
      setTab("portfolio");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portfolio failed");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-3 border-t border-hairline pt-3">
      <div>
        <p className="font-mono text-[10px] font-bold tracking-wider text-gold uppercase">
          Discover
        </p>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted)]">
          Find similar county properties with explainable reasons, or view
          properties associated with this owner.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void runSimilar()}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold px-3 text-xs font-bold text-navy disabled:opacity-60"
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
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-hairline px-3 text-xs font-bold text-ink disabled:opacity-60"
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
              similar.matches.map((m) => (
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
                    className="w-full rounded-lg border border-hairline px-2.5 py-2 text-left hover:border-gold/50"
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
                </li>
              ))
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
              portfolio.exact.map((m) => (
                <li key={`e-${m.source}:${m.propId}`}>
                  <button
                    type="button"
                    onClick={() =>
                      onOpenProperty({
                        propId: m.propId,
                        source: m.source,
                        countyFips: m.countyFips ?? undefined,
                      })
                    }
                    className="w-full rounded-lg border border-hairline px-2 py-1.5 text-left text-xs hover:border-gold/50"
                  >
                    <span className="font-semibold text-ink">
                      {m.situsAddress || `Property ${m.propId}`}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                      {acres(m.legalAcreage)} · {money(m.marketValue)}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          {portfolio.possible.length > 0 ? (
            <>
              <p className="font-mono text-[9px] font-bold text-[var(--muted)] uppercase">
                Possible related (name only)
              </p>
              <ul className="max-h-32 space-y-1 overflow-y-auto">
                {portfolio.possible.map((m) => (
                  <li key={`p-${m.source}:${m.propId}`}>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenProperty({
                          propId: m.propId,
                          source: m.source,
                          countyFips: m.countyFips ?? undefined,
                        })
                      }
                      className="w-full rounded-lg border border-hairline px-2 py-1.5 text-left text-xs hover:border-gold/50"
                    >
                      <span className="font-semibold text-ink">
                        {m.situsAddress || `Property ${m.propId}`}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-[var(--muted)]">
                        {m.matchReason}
                      </span>
                    </button>
                  </li>
                ))}
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
