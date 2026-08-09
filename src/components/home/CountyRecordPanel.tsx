"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Landmark, RefreshCcw } from "lucide-react";
import { formatUsd } from "@/lib/demo-data";
import {
  fetchParcelsByAddress,
  schoolLabel,
  type CountyParcel,
} from "@/lib/supabase/parcels";

const LotMap = dynamic(() => import("@/components/home/LotMap"), { ssr: false });

export function CountyRecordPanel({
  addressLine,
  zip,
}: {
  addressLine: string;
  zip: string;
}) {
  const [parcels, setParcels] = useState<CountyParcel[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      setParcels(await fetchParcelsByAddress(addressLine, zip));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load county record.");
    } finally {
      setLoading(false);
    }
  }, [addressLine, zip]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalAcres = parcels.reduce((s, p) => s + (p.legalAcreage ?? 0), 0);
  const totalMarket = parcels.reduce((s, p) => s + (p.marketValue ?? 0), 0);
  const taxYear = parcels.find((p) => p.taxYear)?.taxYear;

  return (
    <section className="rounded-2xl border border-hairline bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-[var(--muted)]" />
          <div>
            <h4 className="font-serif text-lg font-bold text-ink">County record</h4>
            <p className="text-xs text-[var(--muted)]">
              Polk Central Appraisal District — public record
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-semibold text-ink hover:border-gold/40"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Looking up the county record…</p>
      ) : err ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          Couldn&apos;t load the county record right now.
        </p>
      ) : parcels.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--muted)]">
          No matching Polk County parcel was found for this address yet. County
          data currently covers Polk County, TX; more counties are added over time.
        </p>
      ) : (
        <>
          {parcels.length > 1 && (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Stat label="Parcels" value={String(parcels.length)} />
              <Stat label="Total acreage" value={`${totalAcres.toFixed(2)} ac`} />
              <Stat label="Total market value" value={formatUsd(totalMarket)} />
            </div>
          )}

          <div className="mt-4 space-y-3">
            {parcels.map((p) => (
              <div key={p.id} className="rounded-xl border border-hairline bg-[var(--background)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{p.legalDescription || "—"}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-[var(--muted)]">
                      Prop ID {p.propId}
                      {p.geoId ? ` · Geo ID ${p.geoId}` : ""}
                      {schoolLabel(p.schoolCode) ? ` · ${schoolLabel(p.schoolCode)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-sm font-bold text-ink">
                    {p.marketValue != null ? formatUsd(p.marketValue) : "—"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
                  <Fact label="Acreage" value={p.legalAcreage != null ? `${p.legalAcreage} ac` : "—"} />
                  <Fact label="Land" value={p.landValue != null ? formatUsd(p.landValue) : "—"} />
                  <Fact label="Improvements" value={p.improvementValue != null ? formatUsd(p.improvementValue) : "—"} />
                  <Fact label="Market" value={p.marketValue != null ? formatUsd(p.marketValue) : "—"} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <LotMap parcels={parcels} />
          </div>

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
            Source: Polk Central Appraisal District{taxYear ? `, ${taxYear} roll` : ""}.
            Appraisal-district values are for property-tax purposes and are not a
            market appraisal or opinion of value. Legal descriptions, acreage, and
            lot boundaries are estimates from the county and should be independently
            verified before use in any legal document.
          </p>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-[var(--background)] px-3 py-2">
      <p className="font-mono text-[10px] uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-ink">{value}</p>
    </div>
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
