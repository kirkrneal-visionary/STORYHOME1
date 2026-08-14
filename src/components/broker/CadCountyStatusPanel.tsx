"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  cadFreshnessLabel,
  fetchCadCountyStatus,
  type CadCountyStatus,
} from "@/lib/supabase/parcels";
import { cadCoverageHonesty } from "@/lib/shi/county-ops-scale";
import { cn } from "@/lib/utils";

/**
 * Shows the 72-hour CAD refresh posture for the launch counties so agents can
 * see which appraisal districts are current vs awaiting a file drop / refresh.
 * Coverage line uses DB/unique honesty — never ArcGIS feature count as universe.
 */
export function CadCountyStatusPanel() {
  const [rows, setRows] = useState<CadCountyStatus[]>([]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCadCountyStatus();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof Error ? e.message : "Could not load CAD status");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (err || rows.length === 0) return null;

  const staleCount = rows.filter((r) =>
    cadFreshnessLabel(r.lastSuccessAt, r.refreshIntervalHours).stale,
  ).length;

  return (
    <section className="story-surface p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-gold" />
          <div>
            <h4 className="text-sm font-semibold text-ink">
              CAD refresh status (72-hour cycle)
            </h4>
            <p className="text-xs text-[var(--muted)]">
              {rows.length} launch counties ·{" "}
              {staleCount === 0
                ? "all within window"
                : `${staleCount} need refresh / file drop`}
            </p>
          </div>
        </div>
        <span className="font-mono text-[11px] text-[var(--muted)]">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <ul className="mt-3 divide-y divide-hairline rounded-lg border border-hairline">
          {rows.map((r) => {
            const fresh = cadFreshnessLabel(
              r.lastSuccessAt,
              r.refreshIntervalHours,
            );
            const coverage = cadCoverageHonesty({
              parcelCount: r.parcelCount,
              dbParcelCount: r.dbParcelCount,
              sourceUniquePropIds: r.sourceUniquePropIds,
              sourceFeatureCount: r.sourceFeatureCount,
              absenceCapHit: r.absenceCapHit,
              ingestCapped: r.ingestCapped,
            });
            return (
              <li
                key={r.source}
                className="flex items-start justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{r.countyName}</p>
                  <p className="font-mono text-[11px] text-[var(--muted)]">
                    {r.ingestMode}
                    {coverage.displayCount
                      ? ` · ${coverage.displayCount.toLocaleString()} parcels`
                      : " · not ingested yet"}
                    {r.mhSerialCount ? ` · ${r.mhSerialCount} MH serials` : ""}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                    {coverage.line}
                  </p>
                  {r.notes && (
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {r.notes}
                    </p>
                  )}
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase",
                    fresh.stale
                      ? "bg-gold/15 text-gold"
                      : "bg-teal-soft/20 text-teal-soft",
                  )}
                >
                  {fresh.stale ? "Stale / pending" : "Fresh"}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
