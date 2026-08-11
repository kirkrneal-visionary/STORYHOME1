"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Home as HomeIcon, Landmark, MapPin, Search, Star, Trees, X } from "lucide-react";
import { updateHome, type Home } from "@/lib/supabase/home";
import {
  AVAILABLE_COUNTIES,
  cadFreshnessLabel,
  fetchParcelsByPropIdsAny,
  searchParcels,
  searchParcelsStatewide,
  type CountyParcel,
} from "@/lib/supabase/parcels";
import {
  CAD_SEARCH_FIELDS,
  cadSearchPlaceholder,
  type CadSearchField,
} from "@/lib/cad-layers";
import { txCountyNameByFips } from "@/lib/tx-counties";
import {
  addHomeParcel,
  listHomeParcels,
  removeHomeParcel,
  setHomePrimary,
} from "@/lib/supabase/home-parcels";
import {
  summarizeTracts,
  type LinkedParcel,
} from "@/lib/supabase/listing-parcels";
import { cn } from "@/lib/utils";

const LotMap = dynamic(() => import("@/components/home/LotMap"), { ssr: false });

export function CountyRecordPanel({
  home,
  onHomeChange,
}: {
  home: Home;
  ownerId: string;
  onHomeChange: () => void;
}) {
  const [tracts, setTracts] = useState<LinkedParcel[]>([]);
  const [mapParcels, setMapParcels] = useState<CountyParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [countyFilter, setCountyFilter] = useState<string>("");
  const [searchField, setSearchField] = useState<CadSearchField>("all");
  const [query, setQuery] = useState(home.address || "");
  const [results, setResults] = useState<CountyParcel[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await listHomeParcels(home.id);
      setTracts(t);
      setMapParcels(
        t.length ? await fetchParcelsByPropIdsAny(t.map((x) => x.propId)) : [],
      );
    } catch {
      setTracts([]);
      setMapParcels([]);
    } finally {
      setLoading(false);
    }
  }, [home.id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSearch() {
    setSearching(true);
    setSearched(true);
    try {
      setResults(
        countyFilter
          ? await searchParcels(countyFilter, query, searchField)
          : await searchParcelsStatewide(query, searchField),
      );
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function addTract(p: CountyParcel) {
    if (tracts.some((t) => t.source === p.source && t.propId === p.propId)) return;
    setBusy(true);
    try {
      const isPrimary = tracts.length === 0;
      await addHomeParcel(home.id, {
        source: p.source,
        propId: p.propId,
        countyFips: p.countyFips,
        isPrimary,
      });
      if (isPrimary) {
        await updateHome(home.id, {
          address: p.situsAddress || home.address,
          city: p.situsCity || home.city,
          countyName: txCountyNameByFips(p.countyFips) || home.countyName,
          zip: p.situsZip || home.zip,
          mhSerialNumber: p.mhSerialNumber || home.mhSerialNumber,
          mhHudLabel: p.mhHudLabel || home.mhHudLabel,
          propertyType:
            p.propertyCategory === "personal" || p.mhSerialNumber
              ? "Mobile / Manufactured"
              : home.propertyType,
        });
      } else if (p.mhSerialNumber && !home.mhSerialNumber) {
        await updateHome(home.id, {
          mhSerialNumber: p.mhSerialNumber,
          mhHudLabel: p.mhHudLabel || home.mhHudLabel,
          propertyType: "Mobile / Manufactured",
        });
      }
      setResults([]);
      setSearched(false);
      setQuery("");
      await load();
      onHomeChange();
    } finally {
      setBusy(false);
    }
  }

  async function removeTract(t: LinkedParcel) {
    setBusy(true);
    try {
      await removeHomeParcel(home.id, t.source, t.propId);
      await load();
      onHomeChange();
    } finally {
      setBusy(false);
    }
  }

  async function makePrimary(t: LinkedParcel) {
    setBusy(true);
    try {
      await setHomePrimary(home.id, t.source, t.propId);
      await updateHome(home.id, {
        address: t.situsAddress || home.address,
        city: t.situsCity || home.city,
        countyName: txCountyNameByFips(t.countyFips) || home.countyName,
        zip: t.situsZip || home.zip,
      });
      await load();
      onHomeChange();
    } finally {
      setBusy(false);
    }
  }

  const sum = summarizeTracts(tracts);

  return (
    <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-[var(--muted)]" />
          <div>
            <h4 className="font-serif text-lg font-bold text-ink">
              County records (tracts)
            </h4>
            <p className="text-xs text-[var(--muted)]">
              Look up Real + Personal CAD parcels across the launch counties. If
              your property spans tracts, add each one — we combine the land and
              pull mobile-home serial numbers when CAD has them.
            </p>
          </div>
        </div>
        <select
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          title="Optional: narrow to one county"
          className="h-9 rounded-lg border border-hairline bg-[var(--background)] px-2 text-sm text-ink"
        >
          <option value="">All Texas counties</option>
          {AVAILABLE_COUNTIES.map((c) => (
            <option key={c.source} value={c.source}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Linked tracts */}
      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Loading…</p>
      ) : tracts.length > 0 ? (
        <div className="mt-4 space-y-2">
          {tracts.map((t) => {
            const isHome =
              (t.improvementValue ?? 0) > 0 ||
              t.propertyCategory === "personal" ||
              Boolean(t.mhSerialNumber);
            const fresh = cadFreshnessLabel(t.ingestedAt);
            return (
              <div
                key={`${t.source}-${t.propId}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-[var(--background)] p-3"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    title={isHome ? "Has a structure / MH" : "Land only"}
                    className={cn(
                      "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                      isHome
                        ? "bg-teal-soft/20 text-teal-soft"
                        : "bg-gold/15 text-gold",
                    )}
                  >
                    {isHome ? <HomeIcon className="h-3 w-3" /> : <Trees className="h-3 w-3" />}
                    {t.mhSerialNumber ? "MH" : isHome ? "Home" : "Land"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {t.situsAddress || t.legalDescription || `Parcel ${t.propId}`}
                    </p>
                    <p className="truncate font-mono text-[11px] text-[var(--muted)]">
                      {txCountyNameByFips(t.countyFips) ?? t.source} · Prop {t.propId}
                      {t.legalAcreage != null ? ` · ${t.legalAcreage} ac` : ""}
                      {t.mhSerialNumber ? ` · SN ${t.mhSerialNumber}` : ""}
                      {" · "}
                      <span className={fresh.stale ? "text-gold" : ""}>
                        {fresh.label}
                      </span>
                      {t.needsAgentDetail ? " · details incomplete" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => makePrimary(t)}
                    disabled={busy}
                    title={t.isPrimary ? "Primary tract" : "Set as primary"}
                    className={cn(
                      "rounded p-1.5",
                      t.isPrimary ? "text-gold" : "text-[var(--muted)] hover:text-gold",
                    )}
                  >
                    <Star className={cn("h-4 w-4", t.isPrimary && "fill-gold")} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeTract(t)}
                    disabled={busy}
                    title="Remove tract"
                    className="rounded p-1.5 text-[var(--muted)] hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="rounded-lg bg-[color-mix(in_srgb,var(--gold)_12%,var(--surface))] px-3 py-2 font-mono text-[11px] font-bold text-ink">
            {sum.tractCount} tract{sum.tractCount === 1 ? "" : "s"} ·{" "}
            {sum.totalAcres.toFixed(2)} ac total · {sum.homes} home
            {sum.homes === 1 ? "" : "s"} + {sum.lots} lot{sum.lots === 1 ? "" : "s"}
          </div>

          {mapParcels.length > 0 && (
            <div className="mt-2">
              <LotMap parcels={mapParcels} />
            </div>
          )}

          <p className="text-[11px] leading-relaxed text-[var(--muted)]">
            The starred tract is primary (address). Appraisal-district values are
            for property-tax purposes, not a market appraisal. Building sqft / year
            built and beds/baths aren’t part of county parcel data — edit those
            under “Home facts.”
          </p>
        </div>
      ) : (
        <p className="mt-4 rounded-lg border border-dashed border-hairline bg-[var(--background)] p-4 text-sm text-[var(--muted)]">
          No tracts linked yet. Search your address, owner name, or CAD Property
          ID below and add each tract that makes up your property.
        </p>
      )}

      {/* Advanced CAD search + add */}
      <div className="mt-4 flex flex-wrap gap-2">
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value as CadSearchField)}
          title="Search field"
          className="h-11 rounded-xl border border-hairline bg-[var(--background)] px-2 text-sm text-ink"
        >
          {CAD_SEARCH_FIELDS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch();
            }
          }}
          placeholder={cadSearchPlaceholder(searchField)}
          className="h-11 min-w-[220px] flex-1 rounded-xl border border-hairline bg-[var(--background)] px-4 text-sm text-ink outline-none focus:border-gold"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={searching}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-bold text-navy disabled:opacity-60"
        >
          <Search className="h-4 w-4" /> {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {searched && !searching && results.length === 0 && (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No matching parcels. Try just your street name, your last name, or your
          CAD Property ID.
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
          {results.map((p) => {
            const added = tracts.some(
              (t) => t.source === p.source && t.propId === p.propId,
            );
            return (
              <li
                key={`${p.source}-${p.propId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-[var(--background)] p-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                    <MapPin className="h-3.5 w-3.5 text-[var(--muted)]" />
                    {p.situsAddress || p.legalDescription}
                  </p>
                  <p className="truncate font-mono text-[11px] text-[var(--muted)]">
                    {txCountyNameByFips(p.countyFips) ?? p.source} · Prop {p.propId}
                    {p.propertyCategory ? ` · ${p.propertyCategory}` : ""}
                    {p.ownerName ? ` · ${p.ownerName}` : ""}
                    {p.legalAcreage != null ? ` · ${p.legalAcreage} ac` : ""}
                    {p.mhSerialNumber ? ` · SN ${p.mhSerialNumber}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => addTract(p)}
                  disabled={added || busy}
                  className="shrink-0 rounded-lg border border-gold px-3 py-1.5 text-xs font-bold text-gold disabled:opacity-40"
                >
                  {added ? "Added" : "Add tract"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
