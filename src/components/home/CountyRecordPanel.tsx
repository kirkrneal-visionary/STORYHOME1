"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Landmark, Link2, Search, X } from "lucide-react";
import { formatUsd } from "@/lib/demo-data";
import { updateHome, type Home } from "@/lib/supabase/home";
import {
  AVAILABLE_COUNTIES,
  fetchParcelByPropIdAny,
  parcelCountyLabel,
  schoolLabel,
  searchParcels,
  searchParcelsStatewide,
  type CountyParcel,
} from "@/lib/supabase/parcels";

const LotMap = dynamic(() => import("@/components/home/LotMap"), { ssr: false });

export function CountyRecordPanel({
  home,
  onHomeChange,
}: {
  home: Home;
  ownerId: string;
  onHomeChange: () => void;
}) {
  const [countyFilter, setCountyFilter] = useState<string>("");
  const [linked, setLinked] = useState<CountyParcel | null>(null);
  const [loadingLinked, setLoadingLinked] = useState(true);
  const [query, setQuery] = useState(home.address || "");
  const [results, setResults] = useState<CountyParcel[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadLinked = useCallback(async () => {
    setLoadingLinked(true);
    try {
      setLinked(home.cadPropId ? await fetchParcelByPropIdAny(home.cadPropId) : null);
    } catch {
      setLinked(null);
    } finally {
      setLoadingLinked(false);
    }
  }, [home.cadPropId]);

  useEffect(() => {
    void loadLinked();
  }, [loadLinked]);

  async function runSearch() {
    setSearching(true);
    setSearched(true);
    try {
      setResults(
        countyFilter
          ? await searchParcels(countyFilter, query)
          : await searchParcelsStatewide(query),
      );
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function linkParcel(p: CountyParcel) {
    setBusyId(p.propId);
    try {
      const countyName = parcelCountyLabel(p) || home.countyName;
      await updateHome(home.id, {
        cadPropId: p.propId,
        address: p.situsAddress || home.address,
        city: p.situsCity || home.city,
        countyName,
        zip: p.situsZip || home.zip,
        lotAcres: p.legalAcreage ?? home.lotAcres,
      });
      onHomeChange();
      setResults([]);
      setSearched(false);
    } finally {
      setBusyId(null);
    }
  }

  async function unlink() {
    await updateHome(home.id, { cadPropId: null });
    onHomeChange();
  }

  return (
    <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-[var(--muted)]" />
          <div>
            <h4 className="font-serif text-lg font-bold text-ink">County record</h4>
            <p className="text-xs text-[var(--muted)]">
              Look up your property in the County Appraisal District and auto‑fill your profile.
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
            <option key={c.source} value={c.source}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Linked parcel */}
      {loadingLinked ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Loading…</p>
      ) : linked ? (
        <div className="mt-4">
          <div className="rounded-xl border border-hairline bg-[var(--background)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase text-teal-soft">
                  <Link2 className="h-3.5 w-3.5" /> Linked to CAD parcel
                </p>
                <p className="mt-1 font-semibold text-ink">{linked.legalDescription || linked.situsAddress}</p>
                <p className="font-mono text-[11px] text-[var(--muted)]">
                  Prop ID {linked.propId}{linked.geoId ? ` · Geo ID ${linked.geoId}` : ""}
                  {schoolLabel(linked.schoolCode) ? ` · ${schoolLabel(linked.schoolCode)}` : ""}
                </p>
              </div>
              <button type="button" onClick={unlink} className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-red-300">
                <X className="h-3.5 w-3.5" /> Unlink
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
              <Fact label="Acreage" value={linked.legalAcreage != null ? `${linked.legalAcreage} ac` : "—"} />
              <Fact label="Land" value={linked.landValue != null ? formatUsd(linked.landValue) : "—"} />
              <Fact label="Improvements" value={linked.improvementValue != null ? formatUsd(linked.improvementValue) : "—"} />
              <Fact label="Market" value={linked.marketValue != null ? formatUsd(linked.marketValue) : "—"} />
            </div>
          </div>
          <div className="mt-3">
            <LotMap parcels={[linked]} />
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
            Source: {parcelCountyLabel(linked)}
            {linked.taxYear ? `, ${linked.taxYear} roll` : ""}. Appraisal‑district values are for
            property‑tax purposes and are not a market appraisal. Building sqft / year built and
            beds/baths are not part of county parcel data — edit those under “Home facts.”
          </p>
        </div>
      ) : (
        /* Search + select */
        <div className="mt-4">
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void runSearch(); }}
              placeholder="Search by address, owner name, or CAD Property ID"
              className="h-11 w-full rounded-xl border border-hairline bg-[var(--background)] px-4 text-sm text-ink outline-none focus:border-gold"
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
              No matching parcels. Try just your street name, your last name, or your CAD Property ID.
            </p>
          )}

          {results.length > 0 && (
            <ul className="mt-3 space-y-2">
              {results.map((p) => (
                <li key={p.propId} className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-[var(--background)] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{p.situsAddress || p.legalDescription}</p>
                    <p className="truncate font-mono text-[11px] text-[var(--muted)]">
                      {p.ownerName ? `${p.ownerName} · ` : ""}{p.legalAcreage != null ? `${p.legalAcreage} ac · ` : ""}Prop {p.propId}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => linkParcel(p)}
                    disabled={busyId === p.propId}
                    className="shrink-0 rounded-lg border border-gold px-3 py-1.5 text-xs font-bold text-gold disabled:opacity-60"
                  >
                    {busyId === p.propId ? "Linking…" : "Use this parcel"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-ink">{value}</p>
    </div>
  );
}
