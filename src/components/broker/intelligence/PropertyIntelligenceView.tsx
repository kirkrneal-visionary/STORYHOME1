"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Loader2, Search } from "lucide-react";
import { ShiIcon } from "@/components/brand/ShiIcon";
import { ShiResearchMap } from "@/components/broker/intelligence/ShiResearchMap";
import {
  CAD_SEARCH_FIELDS,
  cadSearchPlaceholder,
  type CadSearchField,
} from "@/lib/cad-layers";
import { AVAILABLE_COUNTIES } from "@/lib/supabase/parcels";
import { shiFreshness, shiGetProperty, shiSearch } from "@/lib/shi/client";
import { SHI_PRODUCT } from "@/lib/shi/waves";
import type {
  ShiCountyFreshness,
  ShiPropertyDetail,
  ShiPropertySummary,
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

/**
 * Story Home Intelligence — SHI-1 Property Intelligence workspace.
 * Listing-form CAD remains MLS-limited; full research lives here.
 */
export function PropertyIntelligenceView() {
  const [query, setQuery] = useState("");
  const [field, setField] = useState<CadSearchField>("all");
  const [source, setSource] = useState("");
  const [results, setResults] = useState<ShiPropertySummary[]>([]);
  const [indexNote, setIndexNote] = useState<string | null>(null);
  const [selected, setSelected] = useState<ShiPropertyDetail | null>(null);
  const [freshness, setFreshness] = useState<ShiCountyFreshness[]>([]);
  const [error, setError] = useState("");
  const [searching, startSearch] = useTransition();
  const [loadingProperty, setLoadingProperty] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await shiFreshness();
        if (!cancelled) setFreshness(rows);
      } catch {
        /* optional strip */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openProperty = useCallback(
    async (opts: { propId: string; source?: string; countyFips?: string }) => {
      setLoadingProperty(true);
      setError("");
      try {
        const property = await shiGetProperty(opts);
        if (!property) {
          setError("Property not found");
          setSelected(null);
          return;
        }
        setSelected(property);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load property");
      } finally {
        setLoadingProperty(false);
      }
    },
    [],
  );

  function runSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (q.length < 2) {
      setError("Enter at least 2 characters");
      return;
    }
    setError("");
    startSearch(async () => {
      try {
        const { results: rows, indexNote: note } = await shiSearch({
          q,
          field,
          source: source || undefined,
          limit: 30,
        });
        setResults(rows);
        setIndexNote(note);
        if (rows.length === 1) {
          void openProperty({
            propId: rows[0].propId,
            source: rows[0].source,
            countyFips: rows[0].countyFips ?? undefined,
          });
        }
      } catch (err) {
        setResults([]);
        setError(err instanceof Error ? err.message : "Search failed");
      }
    });
  }

  const selectedFresh =
    selected &&
    freshness.find(
      (c) =>
        c.countyFips === selected.countyFips ||
        c.countyName === selected.countyName,
    );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy text-gold">
          <ShiIcon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold tracking-[0.16em] text-[var(--muted)] uppercase">
            {SHI_PRODUCT.shortName} · Property Intelligence
          </p>
          <h2 className="font-serif text-2xl font-bold text-ink">
            {SHI_PRODUCT.fullName}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
            Search public records, research on the map, open a property record.
            Listing upload CAD stays MLS-limited.
          </p>
        </div>
      </header>

      {freshness.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {freshness.map((c) => (
            <span
              key={c.countyFips}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-[10px] font-bold uppercase",
                c.stale
                  ? "border-gold/40 bg-gold/10 text-navy"
                  : "border-hairline bg-[var(--surface)] text-[var(--muted)]",
              )}
              title={c.label}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  c.stale ? "bg-gold" : "bg-emerald-600",
                )}
              />
              {c.countyName.replace(/ County$/i, "")}
              <span className="font-semibold normal-case opacity-70">
                {c.stale ? "stale" : "fresh"}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {/* Search column */}
        <section className="flex flex-col rounded-2xl border border-hairline bg-[var(--surface)] p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <Search className="h-4 w-4 text-gold" />
            Search
          </h3>
          <form onSubmit={runSearch} className="mt-3 space-y-2">
            <label className="block text-[11px] font-semibold text-[var(--muted)]">
              County
              <select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="mt-1 w-full rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2 text-sm text-ink"
              >
                <option value="">All launch counties</option>
                {AVAILABLE_COUNTIES.map((c) => (
                  <option key={c.source} value={c.source}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-[var(--muted)]">
              Field
              <select
                value={field}
                onChange={(e) => setField(e.target.value as CadSearchField)}
                className="mt-1 w-full rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2 text-sm text-ink"
              >
                {CAD_SEARCH_FIELDS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-semibold text-[var(--muted)]">
              Query
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={cadSearchPlaceholder(field)}
                className="mt-1 w-full rounded-lg border border-hairline bg-[var(--background)] px-2.5 py-2 text-sm text-ink outline-none focus:border-gold"
              />
            </label>
            <button
              type="submit"
              disabled={searching}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-navy text-sm font-bold text-gold disabled:opacity-60"
            >
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search properties
            </button>
          </form>

          {error ? (
            <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>
          ) : null}
          {indexNote ? (
            <p className="mt-2 text-[11px] text-[var(--muted)]">{indexNote}</p>
          ) : null}

          <ul className="mt-3 max-h-[420px] flex-1 space-y-1 overflow-y-auto">
            {results.length === 0 && !searching ? (
              <li className="py-6 text-center text-xs text-[var(--muted)]">
                Results appear here. Or zoom the map and click a parcel.
              </li>
            ) : null}
            {results.map((r) => {
              const active =
                selected?.propId === r.propId && selected?.source === r.source;
              return (
                <li key={`${r.source}:${r.propId}`}>
                  <button
                    type="button"
                    onClick={() =>
                      void openProperty({
                        propId: r.propId,
                        source: r.source,
                        countyFips: r.countyFips ?? undefined,
                      })
                    }
                    className={cn(
                      "w-full rounded-xl border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-gold bg-gold/10"
                        : "border-hairline hover:border-gold/50 hover:bg-[var(--background)]",
                    )}
                  >
                    <p className="truncate text-sm font-bold text-ink">
                      {r.situsAddress || r.legalDescription || `Parcel ${r.propId}`}
                    </p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {r.ownerName || "Owner unknown"}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                      {r.countyName} · ID {r.propId}
                      {r.legalAcreage != null ? ` · ${acres(r.legalAcreage)}` : ""}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Map */}
        <ShiResearchMap
          selected={selected}
          onSelectPropId={(propId) => void openProperty({ propId })}
          className="min-h-[480px] xl:min-h-[640px]"
        />

        {/* Property panel */}
        <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-4">
          <h3 className="text-sm font-bold text-ink">Property record</h3>
          {loadingProperty ? (
            <div className="mt-8 flex justify-center text-[var(--muted)]">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !selected ? (
            <p className="mt-6 text-sm text-[var(--muted)]">
              Select a search result or click a parcel on the map to open the
              full public record.
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <p className="font-mono text-[10px] font-bold tracking-wider text-[var(--muted)] uppercase">
                  {selected.countyName}
                  {selected.propertyCategory
                    ? ` · ${selected.propertyCategory}`
                    : ""}
                </p>
                <h4 className="mt-1 font-serif text-xl font-bold text-ink">
                  {selected.situsAddress ||
                    selected.legalDescription ||
                    `Property ${selected.propId}`}
                </h4>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {selected.ownerName || "Owner not listed"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Chip
                    stale={selected.freshness.stale}
                    label={selected.freshness.label}
                  />
                  {selectedFresh ? (
                    <Chip
                      stale={selectedFresh.stale}
                      label={`County ${selectedFresh.stale ? "stale" : "fresh"}`}
                    />
                  ) : null}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-2 text-xs">
                <Fact label="Property ID" value={selected.propId} mono />
                <Fact label="Geo ID" value={selected.geoId ?? "—"} mono />
                <Fact label="Owner ID" value={selected.cadOwnerId ?? "—"} mono />
                <Fact label="Acres" value={acres(selected.legalAcreage)} />
                <Fact label="Market value" value={money(selected.marketValue)} />
                <Fact label="Land" value={money(selected.landValue)} />
                <Fact
                  label="Improvements"
                  value={money(selected.improvementValue)}
                />
                <Fact
                  label="Tax year"
                  value={selected.taxYear != null ? String(selected.taxYear) : "—"}
                />
                <Fact
                  label="School"
                  value={selected.schoolName ?? selected.schoolCode ?? "—"}
                />
                <Fact
                  label="City / ZIP"
                  value={[selected.situsCity, selected.situsZip]
                    .filter(Boolean)
                    .join(" ") || "—"}
                />
              </dl>

              {selected.legalDescription ? (
                <div>
                  <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                    Legal
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-ink">
                    {selected.legalDescription}
                  </p>
                </div>
              ) : null}

              {selected.mhSerialNumber ? (
                <div>
                  <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                    Manufactured home
                  </p>
                  <p className="mt-1 text-xs text-ink">
                    Serial {selected.mhSerialNumber}
                    {selected.mhHudLabel ? ` · HUD ${selected.mhHudLabel}` : ""}
                  </p>
                </div>
              ) : null}

              {selected.values.length > 0 ? (
                <div>
                  <p className="font-mono text-[10px] font-bold text-[var(--muted)] uppercase">
                    Value history
                  </p>
                  <ul className="mt-1 divide-y divide-hairline rounded-lg border border-hairline">
                    {selected.values.map((v) => (
                      <li
                        key={v.taxYear}
                        className="flex items-center justify-between px-2.5 py-1.5 text-[11px]"
                      >
                        <span className="font-mono font-bold text-[var(--muted)]">
                          {v.taxYear}
                        </span>
                        <span className="font-semibold text-ink">
                          {money(v.marketValue)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                Public appraisal record for research. Private prospect notes and
                CRM convert ship in later SHI waves.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Chip({ label, stale }: { label: string; stale: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
        stale ? "bg-gold/20 text-navy" : "bg-emerald-600/15 text-emerald-800",
      )}
    >
      {label}
    </span>
  );
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
          "mt-0.5 truncate text-xs font-semibold text-ink",
          mono && "font-mono",
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
